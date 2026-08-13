import express from "express";
import path from "path";
import Groq from "groq-sdk";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// CORS configuration for production Vercel frontend and development
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://analyticscopilot.vercel.app",
    process.env.APP_URL,
  ].filter(Boolean);

  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));

// Health check and diagnostic endpoint
app.get("/api/health", async (_req, res) => {
  const keyExists = !!process.env.GROQ_API_KEY;
  const modelName = "llama-3.3-70b-versatile";
  let testResult: any = { status: "not_attempted" };

  if (keyExists) {
    try {
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: "ping" }],
      });
      testResult = {
        status: "success",
        responseReceived: !!response.choices[0]?.message?.content,
      };
    } catch (err: any) {
      testResult = {
        status: "failed",
        error: err.message,
        code: err.status || err.code || "UNKNOWN",
        details: err.details || undefined,
        stack: err.stack,
      };
    }
  }

  res.json({
    status: "ok",
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      GROQ_API_KEY_PRESENT: keyExists,
      GROQ_API_KEY_PREFIX: keyExists ? process.env.GROQ_API_KEY?.substring(0, 4) : null,
    },
    config: {
      modelName,
    },
    testCall: testResult,
  });
});

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "dummy_key_not_configured",
});

app.post("/api/analyze", async (req, res) => {
  try {
    const keyExists = !!process.env.GROQ_API_KEY;
    console.log(`[API_REQUEST] /api/analyze - KEY_PRESENT: ${keyExists}`);
    
    if (!keyExists) {
      return res.status(401).json({ error: "NOT_CONFIGURED", message: "Groq API key is not configured in the environment." });
    }
    const { stats } = req.body;
    
    if (!stats) {
      return res.status(400).json({ error: "Missing stats data" });
    }

    const systemInstruction = `You are an expert Data Analyst and Business Strategist.
Your job is to review the provided dataset profile and statistical summary and generate meaningful insights.
Explain findings clearly for non-technical users.
DO NOT fabricate statistics or change calculated values.

Return your analysis in JSON format matching this schema exactly:
{
  "executiveSummary": "A high-level summary of the dataset and key findings.",
  "keyFindings": ["Finding 1", "Finding 2", ...],
  "businessInsights": ["Insight 1", "Insight 2", ...],
  "opportunities": ["Opportunity 1", ...],
  "warnings": ["Warning 1", ...]
}`;

    const prompt = `Here is the statistical summary of a dataset:\n\n${JSON.stringify(stats, null, 2)}`;
    
    const inputChars = systemInstruction.length + prompt.length;
    const estimatedTokens = Math.ceil(inputChars / 4);
    const selectedModel = "llama-3.3-70b-versatile";

    console.log(`[COPILOT_AUDIT] Request (Analyze) -> Model: ${selectedModel}, Input Chars: ${inputChars}, Estimated Tokens: ${estimatedTokens}`);

    let response;
    try {
      response = await groq.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });
      console.log(`[COPILOT_AUDIT] Response (Analyze) -> Status: SUCCESS`);
    } catch (apiError: any) {
      console.log(`[COPILOT_AUDIT] Response (Analyze) -> Status: FAILED`);
      throw apiError;
    }

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("No response text from Groq");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Groq response as JSON", text);
      return res.status(500).json({ error: "Invalid JSON response from AI" });
    }

    res.json(parsedResponse);
  } catch (error: any) {
    // Ensure statusCode is a number to prevent Express crashes
    let statusCode = 500;
    if (typeof error.status === 'number') statusCode = error.status;
    else if (typeof error.code === 'number') statusCode = error.code;
    else if (typeof error.status === 'string' && !isNaN(parseInt(error.status))) statusCode = parseInt(error.status);
    else if (typeof error.code === 'string' && !isNaN(parseInt(error.code))) statusCode = parseInt(error.code);

    let friendlyMessage = error.message;
    const errorMsg = error.message || "";
    
    if (error.status === 429) {
      friendlyMessage = "Groq API rate limit exceeded. Please try again in a few seconds.";
    } else {
      console.error("Error analyzing data:", error.message || "Unknown error");
    }

    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ 
      error: "AI_ERROR",
      message: friendlyMessage,
      code: error.status || error.code || 'UNKNOWN',
      details: error.details || undefined
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const keyExists = !!process.env.GROQ_API_KEY;
    console.log(`[API_REQUEST] /api/chat - KEY_PRESENT: ${keyExists}`);

    if (!keyExists) {
      return res.status(401).json({ error: "NOT_CONFIGURED", message: "AI Copilot is not configured yet. Please provide a GROQ_API_KEY in the Secrets panel." });
    }

    const { history, metadata, message, evidence } = req.body;
    
    if (!message && (!history || history.length === 0)) {
       return res.status(400).json({ error: "Missing message" });
    }

    const systemInstruction = `You are a professional Senior Data Analyst assisting the user in Analytics Copilot.
Your job is to act as a highly competent, detail-oriented data partner. You don't just answer questions; you provide context, identify trends, and offer evidence-based interpretations.

CORE ANALYST PIPELINE:
1. Understand the user's analytical intent from their question.
2. Rely EXCLUSIVELY on the DETERMINISTIC_EVIDENCE provided below. This evidence is surgically calculated from the dataset to minimize token usage while maintaining 100% accuracy.
3. If "schema" is provided, use it to understand the available columns, their types, and descriptions.
4. If "rows" or "stats" are present, use the exact values for rankings, percentages, and breakdowns.
5. If a "secondary_breakdown" is present, use it to explain the drivers behind the primary metrics.
6. Provide a precise, professional answer followed by brief key findings and a recommended action.

CRITICAL ANTI-HALLUCINATION & DETERMINISTIC RULES:
1. NEVER invent, fabricate, or recalculate numerical facts. You MUST strictly use the surgical evidence provided in DETERMINISTIC_EVIDENCE_CALCULATED_BY_APPLICATION.
2. CAUSATION GUARDRAIL: When explaining performance, use non-causal wording such as "was associated with", "contributed to", "coincided with", or "is primarily driven by".
3. NO GENERIC ANSWERS: Use the surgical evidence to build the best possible analyst response. If the evidence is insufficient, state exactly what is missing based on the "schema".
4. FORMATTING: Use clean markdown sections:
   - **Analyst Answer**: Direct, evidence-based response with exact figures.
   - **Key Findings**: Structured bullet points highlighting rankings, percentages, or anomalies.
   - **Business Context**: Interpretation of what this means for the business.
   - **Next Step**: A logical follow-up analysis or action.

DETERMINISTIC_EVIDENCE_CALCULATED_BY_APPLICATION:
${JSON.stringify(evidence || { note: "No specific analytical query matched. Default workspace metadata applied." }, null, 2)}
`;

    const messages = [
      { role: "system", content: systemInstruction },
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const inputChars = messages.reduce((acc: number, msg: any) => acc + (msg.content ? msg.content.length : 0), 0);
    const estimatedTokens = Math.ceil(inputChars / 4);
    const selectedModel = "llama-3.3-70b-versatile";
    
    console.log(`[COPILOT_AUDIT] Request -> Model: ${selectedModel}, Input Chars: ${inputChars}, Estimated Tokens: ${estimatedTokens}`);

    let response;
    try {
      response = await groq.chat.completions.create({
        model: selectedModel,
        messages,
        temperature: 0.2,
      });
      console.log(`[COPILOT_AUDIT] Response -> Status: SUCCESS`);
    } catch (apiError: any) {
      console.log(`[COPILOT_AUDIT] Response -> Status: FAILED, Error: ${apiError.message}`);
      throw apiError;
    }

    const text = response.choices[0]?.message?.content;

    if (!text) {
      throw new Error("Empty response from AI");
    }

    return res.json({ text });

  } catch (error: any) {
     
    
    // Ensure statusCode is a number to prevent Express crashes
    let statusCode = 500;
    if (typeof error.status === 'number') statusCode = error.status;
    else if (typeof error.code === 'number') statusCode = error.code;
    else if (typeof error.status === 'string' && !isNaN(parseInt(error.status))) statusCode = parseInt(error.status);
    else if (typeof error.code === 'string' && !isNaN(parseInt(error.code))) statusCode = parseInt(error.code);

    let friendlyMessage = error.message;
    const errorMsg = error.message || "";
    
    if (error.status === 429) {
      friendlyMessage = "Groq API rate limit exceeded. Please try again in a few seconds.";
    } else {
      console.error("Error in AI chat:", error.message || "Unknown error");
    }

    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ 
      error: "AI_ERROR",
      message: friendlyMessage,
      details: error.details || undefined
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("UNHANDLED_EXCEPTION:", err);
  res.status(500).json({
    error: "SERVER_CRASH",
    message: err.message || "An unexpected server error occurred",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

async function startServer() {
  if (process.env.VERCEL) {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
