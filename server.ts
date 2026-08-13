import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "analytics-copilot",
    },
  },
});

app.post("/api/analyze", async (req, res) => {
  try {
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
    res.status(500).json({ error: error.message || "Failed to analyze data" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(401).json({ error: "NOT_CONFIGURED", message: "AI Copilot is not configured yet." });
    }

    const { history, metadata, message, evidence } = req.body;
    
    if (!message && (!history || history.length === 0)) {
       return res.status(400).json({ error: "Missing message" });
    }

    const systemInstruction = `You are a professional Senior Data Analyst assisting the user in Analytics Copilot.
Your job is to help the user understand their datasets, relationships, and analytics workspace.

CRITICAL ANTI-HALLUCINATION & DETERMINISTIC RULES:
1. NEVER invent, fabricate, or recalculate numerical facts. You MUST strictly use the calculated evidence provided in DETERMINISTIC_EVIDENCE_CALCULATED_BY_APPLICATION below.
2. CAUSATION GUARDRAIL: When explaining changes, trends, or performance differences, DO NOT claim direct causation unless explicitly proven. Use non-causal correlation wording such as "coincided with", "associated with", "may indicate", or "possible contributor".
3. STATUS REASONING: If a KPI status is "Needs Attention" or "Invalid", explain the underlying data issue clearly rather than fabricating a result.
4. FORMATTING: Use clean markdown sections:
   - **Answer**: Clear, direct, concise answer containing exact figures from the evidence.
   - **Key Findings**: Structured bullet points with exact metrics and comparisons.
   - **Interpretation**: Contextual business insights.
   - **Recommended Action**: Actionable next step or follow-up recommendation.

DETERMINISTIC_EVIDENCE_CALCULATED_BY_APPLICATION:
${JSON.stringify(evidence || { note: "No specific analytical query matched. Default workspace metadata applied." }, null, 2)}

Current Workspace Metadata:
${JSON.stringify(metadata, null, 2)}
`;

    // Initialize chat session
    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    // We can simulate history by sending the previous messages if supported by @google/genai.
    // Or we can just format it into the prompt. The `@google/genai` chat session doesn't easily let us seed history in `create()` in this exact syntax without formatting.
    // Let's pass the history in a structured way.
    const formattedHistory = (history || []).map((msg: any) => ({
       role: msg.role === 'user' ? 'user' : 'model',
       parts: [{ text: msg.text }]
    }));
    
    if (formattedHistory.length > 0) {
      const chatWithHistory = ai.chats.create({
        model: "gemini-3.6-flash",
        config: {
          systemInstruction,
          temperature: 0.2,
        },
        history: formattedHistory
      });
      const response = await chatWithHistory.sendMessage({ message });
      return res.json({ text: response.text });
    } else {
      const response = await chat.sendMessage({ message });
      return res.json({ text: response.text });
    }

  } catch (error: any) {
    console.error("Error in AI chat:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with AI" });
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
