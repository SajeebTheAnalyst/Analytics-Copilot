import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Force Gemini API mode by clearing GCP env vars that trigger Vertex auto-detection
// This must happen BEFORE the SDK is initialized to prevent auth hijacking
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.GOOGLE_CLOUD_PROJECT;
delete process.env.GCP_PROJECT;

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

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const ai = new GoogleGenAI({
  apiKey: (process.env.GEMINI_API_KEY || "").trim(),
  vertexai: false,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Diagnostic endpoint to verify API key in production
app.get("/api/test-auth", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(401).json({ status: "error", message: "GEMINI_API_KEY is missing from environment" });
    }
    
    const testAi = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY.trim(), 
      vertexai: false,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    const response = await testAi.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "ping",
    });
    
    res.json({ 
      status: "ok", 
      model: "gemini-3.6-flash",
      sdkMode: (testAi as any).apiClient?.isVertexAI?.() ? "vertex" : "genai",
      testResponse: !!response.text 
    });
  } catch (err: any) {
    console.error("DIAGNOSTIC_FAILURE:", err);
    res.status(err.status || 500).json({ 
      status: "error", 
      message: err.message,
      code: err.status || err.code || "UNKNOWN",
      diagnostics: {
        isVertex: (ai as any).apiClient?.isVertexAI?.(),
        envVertex: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT)
      }
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const isVertexDetected = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT);
    console.log("DIAGNOSTIC: /api/analyze called");
    console.log("DIAGNOSTIC: GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log("DIAGNOSTIC: Vertex/GCP Env Detected:", isVertexDetected);
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(401).json({ error: "NOT_CONFIGURED", message: "Gemini API key is not configured in the environment." });
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

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON", text);
      return res.status(500).json({ error: "Invalid JSON response from AI" });
    }

    res.json(parsedResponse);
  } catch (error: any) {
    console.error("Error analyzing data:", error);
    const statusCode = error.status || error.code || 500;
    const isAuthError = statusCode === 401 || (error.message && error.message.includes("UNAUTHENTICATED"));
    
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ 
      error: error.message || "Failed to analyze data",
      code: error.status || error.code || 'UNKNOWN',
      diagnostics: {
        apiKeyPresent: !!process.env.GEMINI_API_KEY,
        envVertex: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT),
        sdkIsVertex: (ai as any).apiClient?.isVertexAI?.(),
        isAuthError
      },
      details: error.details || undefined
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const isVertexDetected = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT);
    console.log("DIAGNOSTIC: /api/chat called");
    console.log("DIAGNOSTIC: GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log("DIAGNOSTIC: Vertex/GCP Env Detected:", isVertexDetected);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(401).json({ error: "NOT_CONFIGURED", message: "AI Copilot is not configured yet. Please provide a GEMINI_API_KEY in the Secrets panel." });
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

    // Use generateContent with contents array for multi-turn support in a stateless environment
    const contents = [
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Empty response from AI");
    }

    return res.json({ text });

  } catch (error: any) {
    console.error("Error in AI chat:", error);
    const statusCode = error.status || error.code || 500;
    const isAuthError = statusCode === 401 || (error.message && error.message.includes("UNAUTHENTICATED"));

    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ 
      error: error.message || "Failed to communicate with AI",
      code: error.status || error.code || 'UNKNOWN',
      diagnostics: {
        apiKeyPresent: !!process.env.GEMINI_API_KEY,
        envVertex: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_PROJECT),
        sdkIsVertex: (ai as any).apiClient?.isVertexAI?.(),
        isAuthError
      },
      details: error.details || undefined
    });
  }
});

async function startServer() {
  if (process.env.VERCEL) {
    // On Vercel serverless, we don't start the listener or serve static files via Express.
    // Vercel's CDN serves the static build, and routes /api/* to this function.
    return;
  }

  if (process.env.NODE_ENV !== "production") {
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
