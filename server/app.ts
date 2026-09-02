import express from "express";
import path from "path";
import dotenv from "dotenv";
import { generateWorkspaceKnowledgePrompt, WORKSPACE_IDENTITY } from "../src/lib/workspaceKnowledge";

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
    const selectedModel = "gemini-3.5-flash";

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

    const { history, metadata, message, evidence, liveContext } = req.body;
    console.log(`[API_REQUEST] /api/chat - Message: "${message?.substring(0, 50)}...", History length: ${history?.length || 0}`);
    
    if (!message && (!history || history.length === 0)) {
       return res.status(400).json({ error: "Missing message" });
    }

    const workspaceKnowledgeContext = generateWorkspaceKnowledgePrompt();

    const systemInstruction = `You are "Analytics Copilot", an AI-powered analytics assistant developed by Sajeeb The Analyst.
Your mission is to act as a highly competent, Senior Data Analyst, diagnostic partner, and workspace guide. You help users understand and use this analytics workspace, diagnose configurations and dashboard errors, guide data cleaning, create KPIs, design dashboards, generate MIS executive reports, explore data, and uncover business insights.

${workspaceKnowledgeContext}

CORE INSTRUCTIONS BY USER QUERY TYPE:

1. CONFIGURATION DIAGNOSTIC & PROBLEM SOLVING (CRITICAL):
   - When asked "Why is my dashboard not working?", "Why is my chart blank?", "Why is this KPI showing an error?", "What is wrong with my dataset?", "Why can't I use this column?", "Why is my date column not working?", or similar troubleshooting questions:
   - You MUST perform a rigorous diagnosis based on the actual CURRENT workspace state supplied in CURRENT_LIVE_WORKSPACE_CONTEXT_GATHERED_BY_APPLICATION.
   - You MUST structure your response into these distinct, numbered sections:
     1. **Actual Detected Problem(s)**: Explicit, verified facts from the live context (e.g., no dataset loaded, low readiness score, dashboard lacks widgets, widget referencing missing/deleted column, metric column is categorical, date column has wrong format, empty result sets, global filters, or specific KPI in "invalid"/"needs_attention" status with the corresponding statusReason).
     2. **Likely Cause(s)**: Deduced logical reasons for the observed behavior (e.g., "The aggregation 'sum' fails because column X contains text strings, not numbers", "The chart is blank because a global filter restricts dates to a range with no records").
     3. **General Recommendation(s)**: Concrete, step-by-step solutions within the app (e.g., "Navigate to the Data Cleaning tab to clean Column X", "Change the widget's aggregation to 'count'", "Select a column with a detected date type").
   - NEVER claim or assume a specific technical problem exists unless the current workspace context directly supports it.
   - If there is not enough context (e.g., no dataset uploaded, no active dashboard selected, or specific column data missing), clearly and politely explain exactly what information is missing to make a complete diagnosis. Do not hallucinate any fictional problems.

2. DETAILED DATA CLEANING ASSISTANT:
   - When the user asks "How should I clean this data?", "What is wrong with my dataset?", or questions about anomalies, nulls, duplicates, or quality:
   - Analyze the actual dataset quality, readiness scores, and pending quality issues from the 'datasetContext'.
   - Explain to the user:
     - **What is wrong**: The exact quality issue identified (e.g., nulls, duplicate rows, incorrect formatting).
     - **Why it matters**: Analytical or business impact of this issue (e.g., skewed results, incorrect sums, blank charts).
     - **Which column is affected**: Identify the exact column name(s).
     - **What cleaning action is recommended**: Suggest the corresponding cleanup operation.
   - You MUST recommend the existing deterministic Data Cleaning workflow in this app. Highlight that the workflow is:
     *Detect* (scans data) -> *Suggest* (AI-powered options) -> *Preview* (shows before/after rows) -> *User Confirmation* -> *Apply* (executes updates).
   - State clearly that you cannot silently modify data directly, and that they should navigate to the **Data Cleaning** tab to run this workflow safely.

3. FORMULA & ANALYTICAL GUIDANCE:
   - When asked "What formula should I use?", "What KPI should I create?", "Which chart is best for this data?", or questions about aggregations, ratios, growth metrics (MoM, YoY, QoQ), percentages, or temporal analysis:
   - You MUST base all recommendations on the actual columns and types present in the active dataset's 'datasetContext'.
   - Suggest suitable aggregation types (e.g., SUM for Revenue, AVG for Price, COUNT for ID columns) and specific formulas referencing real column names.
   - Recommend appropriate chart types based on the column demographics (e.g., Line charts for temporal trends using their actual date column, Bar charts for comparing categories, Scatter plots for numerical correlations).
   - If no dataset is active, explain that you need a dataset loaded to provide customized formulas or metrics.

4. RESPONSE RELEVANCE & INDEPENDENCE (CRITICAL):
   - Every new user question must be processed independently. Do not carry over or refer to previous calculations or evidence if they are unrelated to the current question.
   - For general, conversational, identity, or help-seeking questions (e.g., "What is your name?", "Tell me about this website", "How do I use the platform?"):
     - Respond in a warm, helpful, general manner based on your identity and workspace knowledge.
     - Do NOT attach or reference any calculated analytical dataset values or evidence for these questions.
     - Keep the output clean, focusing purely on answering the user's conceptual or identity query.

CURRENT_LIVE_WORKSPACE_CONTEXT_GATHERED_BY_APPLICATION:
${JSON.stringify(liveContext || { note: "No live workspace context is active or requested for this general query." }, null, 2)}

DETERMINISTIC_EVIDENCE_CALCULATED_BY_APPLICATION:
${JSON.stringify(evidence || { note: "No dataset computation is required for this query. Please answer based purely on your structured workspace knowledge and core instructions." }, null, 2)}`;

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
    const selectedModel = "gemini-3.5-flash";
    
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
      model: "gemini-3.5-flash",
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

