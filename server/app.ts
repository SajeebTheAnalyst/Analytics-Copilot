import express from "express";
import path from "path";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const app = express();

// Request logging middleware for diagnostics
app.use((req, _res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});

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

// 10. Minimal GET /api/health endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Serverless module loads successfully"
  });
});

app.post("/api/analyze", async (req, res) => {
  console.log("[API_REQUEST] /api/analyze started");
  try {
    const keyExists = !!(process.env.GEMINI_API_KEY || process.env.Gemini_API_Key);
    console.log(`[API_REQUEST] /api/analyze - KEY_PRESENT: ${keyExists}`);
    
    if (!keyExists) {
      console.log("[API_REQUEST] /api/analyze - ERROR: NOT_CONFIGURED");
      return res.status(401).json({ error: "NOT_CONFIGURED", message: "Gemini API key is not configured in the environment." });
    }
    const { stats } = req.body;
    
    if (!stats) {
      console.log("[API_REQUEST] /api/analyze - ERROR: Missing stats data");
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
    const selectedModel = "gemini-2.5-flash";

    console.log(`[COPILOT_AUDIT] Request (Analyze) -> Model: ${selectedModel}, Input Chars: ${inputChars}, Estimated Tokens: ${estimatedTokens}`);

    let responseText = "";
    try {
      console.log("[API_REQUEST] /api/analyze - Calling Gemini API...");
      console.time("gemini_analyze");
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY || process.env.Gemini_API_Key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const geminiResponse = await ai.models.generateContent({
        model: selectedModel,
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      });
      
      console.timeEnd("gemini_analyze");
      responseText = geminiResponse.text || "";
      console.log(`[COPILOT_AUDIT] Response (Analyze) -> Status: SUCCESS`);
    } catch (apiError: any) {
      console.timeEnd("gemini_analyze");
      console.error(`[COPILOT_AUDIT] Response (Analyze) -> Status: FAILED, Error: ${apiError.message}`);
      throw apiError;
    }

    console.log(`[API_REQUEST] /api/analyze - Gemini response received (length: ${responseText?.length || 0})`);
    if (!responseText) {
      throw new Error("No response text from Gemini");
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON", responseText);
      return res.status(500).json({ error: "Invalid JSON response from AI" });
    }

    res.json(parsedResponse);
  } catch (error: any) {
    let statusCode = 500;
    if (typeof error.status === 'number') statusCode = error.status;
    else if (typeof error.code === 'number') statusCode = error.code;
    else if (typeof error.status === 'string' && !isNaN(parseInt(error.status))) statusCode = parseInt(error.status);
    else if (typeof error.code === 'string' && !isNaN(parseInt(error.code))) statusCode = parseInt(error.code);

    
    let friendlyMessage = error.message || "An unexpected error occurred.";
    try {
      const parsed = JSON.parse(friendlyMessage);
      if (parsed.error && parsed.error.message) {
        friendlyMessage = parsed.error.message;
      }
    } catch(e) {}
    
    if (error.status === 429 || statusCode === 429) {
      friendlyMessage = "Gemini API rate limit exceeded. Please try again in a few seconds.";
    } else if (error.status === 503 || statusCode === 503) {
      friendlyMessage = "Gemini API is currently experiencing high demand. Please try again in a few moments.";
    }
 else {
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
  console.log("[API_REQUEST] /api/chat started with body:", JSON.stringify(req.body).substring(0, 200) + "...");
  try {
    const keyExists = !!(process.env.GEMINI_API_KEY || process.env.Gemini_API_Key);
    if (!keyExists) {
      console.log("[API_REQUEST] /api/chat - ERROR: NOT_CONFIGURED");
      return res.status(401).json({ error: "NOT_CONFIGURED", message: "AI Copilot is not configured yet. Please provide a GEMINI_API_KEY in the Secrets panel." });
    }

    const { history, metadata, message, evidence } = req.body;
    console.log(`[API_REQUEST] /api/chat - Message: "${message?.substring(0, 50)}...", History length: ${history?.length || 0}`);
    
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
${JSON.stringify(evidence || { note: "No specific analytical query matched. Default workspace metadata applied." }, null, 2)}`;

    // Build history for Gemini
    const contents = (history || []).map((msg: any) => {
      // Gemini expects role: "user" | "model"
      const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: msg.text || msg.content || "" }]
      };
    });

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const inputChars = systemInstruction.length + contents.reduce((acc: number, msg: any) => acc + (msg.parts[0].text ? msg.parts[0].text.length : 0), 0);
    const estimatedTokens = Math.ceil(inputChars / 4);
    const selectedModel = "gemini-2.5-flash";
    
    console.log(`[COPILOT_AUDIT] Request -> Model: ${selectedModel}, Input Chars: ${inputChars}, Estimated Tokens: ${estimatedTokens}`);

    let responseText = "";
    try {
      console.log("[API_REQUEST] /api/chat - Calling Gemini API...");
      console.time("gemini_chat");
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY || process.env.Gemini_API_Key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const geminiResponse = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      console.timeEnd("gemini_chat");
      responseText = geminiResponse.text || "";
      console.log(`[COPILOT_AUDIT] Response -> Status: SUCCESS`);
    } catch (apiError: any) {
      console.timeEnd("gemini_chat");
      console.error(`[COPILOT_AUDIT] Response -> Status: FAILED, Error: ${apiError.message}`);
      throw apiError;
    }

    console.log(`[API_REQUEST] /api/chat - Gemini response received (length: ${responseText?.length || 0})`);

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    return res.json({ text: responseText });

  } catch (error: any) {
    let statusCode = 500;
    if (typeof error.status === 'number') statusCode = error.status;
    else if (typeof error.code === 'number') statusCode = error.code;
    else if (typeof error.status === 'string' && !isNaN(parseInt(error.status))) statusCode = parseInt(error.status);
    else if (typeof error.code === 'string' && !isNaN(parseInt(error.code))) statusCode = parseInt(error.code);

    
    let friendlyMessage = error.message || "An unexpected error occurred.";
    try {
      const parsed = JSON.parse(friendlyMessage);
      if (parsed.error && parsed.error.message) {
        friendlyMessage = parsed.error.message;
      }
    } catch(e) {}
    
    if (error.status === 429 || statusCode === 429) {
      friendlyMessage = "Gemini API rate limit exceeded. Please try again in a few seconds.";
    } else if (error.status === 503 || statusCode === 503) {
      friendlyMessage = "Gemini API is currently experiencing high demand. Please try again in a few moments.";
    }
 else {
      console.error("Error in AI chat:", error.message || "Unknown error", error.stack);
    }

    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ 
      error: "AI_ERROR",
      message: friendlyMessage,
      stack: error.stack,
      details: error.details || undefined
    });
  }
});

app.post("/api/cleaning-copilot", async (req, res) => {
  console.log("[API_REQUEST] /api/cleaning-copilot started");
  try {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;

    if (!geminiKey) {
      console.log("[API_REQUEST] /api/cleaning-copilot - ERROR: NOT_CONFIGURED");
      return res.status(401).json({
        error: "NOT_CONFIGURED",
        message: "GEMINI_API_KEY is not configured in the environment."
      });
    }

    const { message, history, context } = req.body;

    if (!message && (!history || history.length === 0)) {
      return res.status(400).json({ error: "Missing message parameter" });
    }

    const systemInstruction = `You are an expert AI Data Cleaning Copilot in an enterprise Data Workspace.
Your mission is to help users understand their dataset's quality problems and recommend Phase 8J deterministic cleaning actions.

CRITICAL RULES:
1. Grounding & Anti-Hallucination: Ground ALL findings, stats, and advice strictly on the supplied GROUNDED_DATASET_CONTEXT below. Never invent numbers, columns, or defects not supported by the context.
2. Concise Evidence: Always include exact figures, counts, and sample affected values (e.g. "4 inconsistent variants detected across 38 records", "12 records missing Revenue values").
3. Read-Only Scope: You CANNOT modify data directly. You MUST recommend standard Phase 8J cleaning actions for the user to review and approve.
4. Supported Phase 8J Action Types:
   - "trim_whitespace": Trim leading/trailing spaces
   - "text_capitalization": Standardize upper/lower/title case
   - "find_replace": Find & replace string patterns
   - "merge_categorical": Review & merge similar/inconsistent categorical variations
   - "remove_duplicates": Remove duplicate rows
   - "remove_empty_rows": Remove completely blank rows
   - "fill_missing": Fill missing values with constant/mean/median/mode
   - "clear_cells": Clear values in specific cells
   - "delete_columns": Delete uninformative or constant columns

When user asks if dataset is ready for an MIS report ("Can I use this for an MIS report?"), summarize data quality score, remaining issues, missing values, date consistency, duplicate rows, and major risks. Do NOT claim dataset is clean unless quality state supports it!

OUTPUT FORMAT: Return a valid JSON object matching this schema exactly:
{
  "answer": "Markdown string with detailed evidence, findings, and explanations...",
  "recommendations": [
    {
      "id": "rec-1",
      "actionType": "merge_categorical",
      "column": "Location",
      "title": "Merge Inconsistent Location Variations",
      "explanation": "Location column contains 4 inconsistent variations ('Rangpur', 'rangpur', 'Rangpurrr', 'Raaangpur') across 38 records.",
      "variations": ["Rangpur", "rangpur", "Rangpurrr", "Raaangpur"],
      "affectedRowsCount": 38,
      "affectedCellsCount": 38
    }
  ]
}

GROUNDED_DATASET_CONTEXT:
${JSON.stringify(context || {}, null, 2)}`;

    let responseText = "";

    console.log("[API_REQUEST] Using Gemini API for AI Cleaning Copilot...");
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ 
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    // Build history for Gemini
    const contents = (history || []).map((msg: any) => {
      const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: msg.text || msg.content || "" }]
      };
    });
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    responseText = geminiResponse.text || "";

    if (!responseText) {
      throw new Error("Empty response received from AI model provider");
    }

    let parsedJSON;
    try {
      parsedJSON = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", responseText);
      return res.status(500).json({
        error: "INVALID_JSON",
        message: "AI model returned a non-JSON string response"
      });
    }

    res.json(parsedJSON);

  } catch (error: any) {
    console.error("Error in /api/cleaning-copilot:", error.message || error);
    let statusCode = 500;
    if (typeof error.status === 'number') statusCode = error.status;
    else if (error.status === 429) statusCode = 429;

    
    let friendlyMessage = error.message || "An unexpected error occurred.";
    try {
      const parsed = JSON.parse(friendlyMessage);
      if (parsed.error && parsed.error.message) {
        friendlyMessage = parsed.error.message;
      }
    } catch(e) {}
    
    if (error.status === 429 || statusCode === 429) {
      friendlyMessage = "Gemini API rate limit exceeded. Please try again in a few seconds.";
    } else if (error.status === 503 || statusCode === 503) {
      friendlyMessage = "Gemini API is currently experiencing high demand. Please try again in a few moments.";
    }


    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      error: "AI_ERROR",
      message: friendlyMessage
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

export default app;

