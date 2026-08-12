import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
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

    const { history, metadata, message } = req.body;
    
    if (!message && (!history || history.length === 0)) {
       return res.status(400).json({ error: "Missing message" });
    }

    const systemInstruction = `You are a professional Senior Data Analyst assisting the user in Analytics Copilot.
Your job is to help the user understand their datasets, relationships, and analytics workspace.
The user has provided workspace metadata (datasets, columns, stats, relationships).

IMPORTANT RULES:
1. NO AUTONOMOUS ACTIONS: You cannot modify data, delete rows, create relationships, or build dashboards yourself. If an action is required (e.g. clean data, build a dashboard), explain what you recommend and ASK FOR PERMISSION.
2. Example of asking for permission: "I found 324 duplicate rows. I can prepare a cleaning plan for you. Would you like to review it?"
3. For unsupported future actions (like dashboard generation or data cleaning), state: "I can help you plan that. The [feature] capability will become available in the next stage." Do not pretend to execute it.
4. NUMERICAL ACCURACY: NEVER invent or fabricate numerical facts. If you need a calculation not present in the metadata, state: "I need to calculate that from the dataset before giving you an accurate number."
5. EXPLAIN REASONING: Communicate like a professional analyst. Distinguish facts from hypotheses. Ask clarifying questions.
6. CONTEXT AWARENESS: Use the provided workspace metadata to answer questions about what datasets are loaded and how they connect. Do not ask for information that is already provided in the metadata.
7. FORMATTING: Use Markdown, bullet lists, and tables when useful. Be concise but professional.

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
