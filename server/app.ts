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

function safeSanitizeServer(val: any, maxDepth = 4, seen = new WeakSet()): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return null;
    return val;
  }
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    if (val.length > 1000) return val.substring(0, 1000) + '... [truncated]';
    return val;
  }
  if (typeof val === 'function' || typeof val === 'symbol') return null;

  if (typeof val === 'object') {
    if (val.$$typeof || val._reactInternalFiber || val._owner) return null;
    if (seen.has(val)) return '[Circular]';
    seen.add(val);

    if (maxDepth <= 0) return '[Depth Limit Reached]';

    if (Array.isArray(val)) {
      return val.slice(0, 10).map(item => safeSanitizeServer(item, maxDepth - 1, seen)).filter(item => item !== null);
    }

    const clean: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      if (key.startsWith('_') || key.startsWith('$')) continue;
      const cleaned = safeSanitizeServer(val[key], maxDepth - 1, seen);
      if (cleaned !== null && cleaned !== undefined) {
        clean[key] = cleaned;
      }
    }
    return clean;
  }
  return null;
}

app.post("/api/chat", async (req, res) => {
  console.log(`[API_REQUEST] /api/chat started for message: "${(req.body?.message || '').substring(0, 50)}..."`);
  try {
    const { history, metadata, message, evidence, liveContext } = req.body || {};
    
    if (!message && (!history || history.length === 0)) {
       return res.status(400).json({ error: "Missing message" });
    }

    const cleanLiveContext = safeSanitizeServer(liveContext);
    const cleanEvidence = safeSanitizeServer(evidence);
    const cleanHistory = safeSanitizeServer(history);

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

5. DATASET ACCESS / AVAILABILITY QUESTIONS (CRITICAL):
   - When asked "Can you read my data?", "Can you see my dataset?", "Do you have access to my workspace data?", "What dataset is currently loaded?", "Can you access the data in my workspace?", or similar data availability questions:
   - Do NOT automatically run calculations, group-by aggregations, default revenue analysis, or chart generation unless explicitly requested.
   - Confirm access directly and summarize dataset metadata based on 'cleanLiveContext.datasetContext':
     * State clearly: "Yes. I can access the active dataset in your workspace: [datasetName]."
     * Provide a clear breakdown of its contents:
       - Row count and column count (e.g., "It currently contains X rows and Y columns.")
       - Relevant detected data types or important columns
     * Offer logical next steps: "I can help you analyze, clean, explore, build KPIs, or create dashboards from this data."
   - If NO dataset is loaded, state clearly: "No active dataset is currently loaded in your workspace. Please navigate to the **Data Import & Profile** tab to upload a CSV or Excel file."

CURRENT_LIVE_WORKSPACE_CONTEXT_GATHERED_BY_APPLICATION:
${JSON.stringify(cleanLiveContext || { note: "No live workspace context is active or requested for this general query." }, null, 2)}

DETERMINISTIC_EVIDENCE_CALCULATED_BY_APPLICATION:
${JSON.stringify(cleanEvidence || { note: "No dataset computation is required for this query. Please answer based purely on your structured workspace knowledge and core instructions." }, null, 2)}`;

    // Build history for Gemini
    const contents = (cleanHistory || []).map((msg: any) => {
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

    const geminiKey = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key || process.env.APIKey;
    let responseText = "";

    if (geminiKey) {
      try {
        console.log("[API_REQUEST] /api/chat - Calling Gemini API...");
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ 
          apiKey: geminiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const geminiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
          }
        });

        responseText = geminiResponse.text || "";
        console.log(`[COPILOT_AUDIT] Response -> Status: SUCCESS`);
      } catch (apiError: any) {
        console.error(`[COPILOT_SERVER_ERROR] Gemini API call failed: ${apiError.message || apiError}`, apiError.stack);
      }
    } else {
      console.warn("[API_REQUEST] /api/chat - No GEMINI_API_KEY found in environment.");
    }

    // Fallback answer generation if API response is empty or model unavailable
    if (!responseText) {
      const q = (message || "").toLowerCase();

      // 1. Identity & Creator Queries
      if (
        q.includes("name") || 
        q.includes("who are you") || 
        q.includes("who made you") || 
        q.includes("who created you") || 
        q.includes("who developed you")
      ) {
        responseText = "I am **Analytics Copilot**, an AI-powered analytics assistant developed by **Sajeeb The Analyst**. My mission is to act as your Senior Data Analyst and workspace guide, helping you clean data, create KPIs, design dashboards, generate MIS executive reports, explore data, and uncover business insights.";
      }
      // 2. Dataset Access & Availability Queries
      else if (
        (q.includes("dataset") || q.includes("data") || q.includes("file")) && 
        (q.includes("loaded") || q.includes("read") || q.includes("see") || q.includes("access") || q.includes("workspace") || q.includes("my data") || q.includes("this data") || q.includes("check") || q.includes("view"))
      ) {
        const dsName = cleanLiveContext?.datasetContext?.datasetName || cleanLiveContext?.datasetContext?.filename;
        if (dsName) {
          const rows = cleanLiveContext.datasetContext.rowCount || 0;
          const cols = cleanLiveContext.datasetContext.columnCount || 0;
          const colList = (cleanLiveContext.datasetContext.columnNames || cleanLiveContext.datasetContext.columns || []).slice(0, 8).map((c: any) => typeof c === 'string' ? c : (c.name || c)).join(', ');
          const score = cleanLiveContext.datasetContext.readinessScore || '100%';
          
          responseText = `Yes. I can access the active dataset in your workspace: **${dsName}**.\n\nIt currently contains:\n- **${rows.toLocaleString()} rows**\n- **${cols} columns**\n${colList ? `- **Key columns**: ${colList}\n` : ''}- **Readiness Score**: **${score}**\n\nI can help you analyze, clean, explore, build KPIs, or create dashboards from this data.`;
        } else {
          responseText = "No active dataset is currently loaded in your workspace. Please navigate to the **Data Import & Profile** tab to upload a CSV or Excel file.";
        }
      }
      // 3. Dataset Health & Problem Questions ("whats problem to that dataset?", "what is wrong with my data?")
      else if (
        q.includes("problem") || q.includes("issue") || q.includes("wrong") || q.includes("defect") || q.includes("error") || q.includes("bug") || q.includes("quality") || q.includes("health")
      ) {
        const dsName = cleanLiveContext?.datasetContext?.datasetName;
        if (dsName) {
          const score = cleanLiveContext.datasetContext.readinessScore || '100%';
          const issues = cleanLiveContext.datasetContext.qualityIssues || [];
          const missing = cleanLiveContext.datasetContext.missingValues?.totalMissingCells || 0;
          const dupes = cleanLiveContext.datasetContext.duplicates || 0;

          responseText = `### Data Quality & Health Assessment for **${dsName}**\n\n- **Readiness Score**: **${score}**\n- **Missing Cells**: ${missing}\n- **Duplicate Rows**: ${dupes}\n\n`;
          if (issues.length > 0) {
            responseText += `#### Detected Issues (${issues.length}):\n`;
            issues.forEach((iss: any, idx: number) => {
              responseText += `${idx + 1}. **${iss.column || 'Dataset'}**: ${iss.title} — ${iss.description}\n`;
            });
            responseText += `\n**Next Action**: Head to the **Data Cleaning** tab to apply automated fixes.`;
          } else {
            responseText += `Your dataset is clean with 0 critical defects detected!`;
          }
        } else {
          responseText = "No active dataset is currently loaded in your workspace. Please import a dataset in the **Data Import & Profile** tab.";
        }
      }
      // 4. Dashboard & Chart Troubleshooting ("why my dashboard not working?", "this chart blank why?")
      else if (q.includes("dashboard") || q.includes("chart") || q.includes("widget") || q.includes("visual")) {
        const dbName = cleanLiveContext?.dashboardContext?.dashboardName;
        if (dbName) {
          const widgetCount = cleanLiveContext.dashboardContext.widgetsCount || 0;
          responseText = `### Diagnostic Report for Dashboard: **"${dbName}"**\n\n- **Active Widgets**: ${widgetCount}\n- **KPI Cards**: ${cleanLiveContext.dashboardContext.kpiCardsCount || 0}\n- **Charts**: ${cleanLiveContext.dashboardContext.chartsCount || 0}\n\nIf your charts are blank or not updating, verify that:\n1. Non-numeric columns aren't used for SUM/AVG metrics.\n2. Global filters are not excluding all rows.\n3. The active dataset contains valid records for the mapped axis columns.`;
        } else {
          responseText = "No active dashboard is currently selected. Navigate to the **Dashboard** tab to view or create visual dashboards.";
        }
      }
      // 5. Data Cleaning Guidance ("can u clean my data?")
      else if (q.includes("clean") || q.includes("cleaning")) {
        const dsName = cleanLiveContext?.datasetContext?.datasetName;
        if (dsName) {
          responseText = `I can guide you through cleaning your active dataset **${dsName}**!\n\nTo clean your data:\n1. Switch to the **Data Cleaning** tab.\n2. Review automatically detected quality issues.\n3. Preview transformed rows and click **Apply** to execute updates safely.`;
        } else {
          responseText = "Please upload a dataset first under **Data Import & Profile** so we can run automated cleaning workflows.";
        }
      }
      // 6. KPI Recommendations ("which kpi good for my data?")
      else if (q.includes("kpi") || q.includes("metric")) {
        const dsName = cleanLiveContext?.datasetContext?.datasetName;
        const numCols = cleanLiveContext?.datasetContext?.numericColumns || [];
        if (dsName && numCols.length > 0) {
          responseText = `### Recommended KPIs for **${dsName}**\n\nBased on your numeric fields, here are key metrics you can create in the **KPI Builder**:\n` + numCols.slice(0, 3).map((col: string) => `- **Total ${col}**: \`SUM(${col})\`\n- **Average ${col}**: \`AVG(${col})\``).join('\n') + `\n\nNavigate to the **KPI Builder** tab to create these metrics!`;
        } else {
          responseText = "You can create custom calculated and standard business metrics in the **KPI Builder** tab.";
        }
      }
      // 7. Website & Overview Queries
      else if (q.includes("website") || q.includes("this app") || q.includes("platform") || q.includes("about") || q.includes("what can i do") || q.includes("help")) {
        responseText = "Welcome to Analytics Copilot! This platform is a comprehensive end-to-end data analytics workspace. Key features include:\n\n- **Data Import & Profile**: Upload CSV/Excel datasets and calculate automated readiness scores.\n- **Data Cleaning**: Detect anomalies, nulls, duplicates, and apply guided data transformations.\n- **KPI Builder**: Create standard and complex calculated business metrics.\n- **Interactive Dashboards**: Build customizable visual grids with charts and KPI cards.\n- **MIS Executive Reports**: Generate structured executive summaries and business narratives.\n- **Data Explorer & Relationships**: Slice, filter, group, and cross-relate multi-table datasets.";
      } 
      // 8. General Contextual Fallback
      else {
        const dsName = cleanLiveContext?.datasetContext?.datasetName;
        if (dsName) {
          responseText = `I evaluated your question regarding **${dsName}**.\n\nYou can ask me to perform calculations, troubleshoot your dashboard, recommend KPIs, explain data cleaning steps, or explore specific fields!`;
        } else {
          responseText = "I am Analytics Copilot, your data analytics assistant. Upload a dataset or ask me about workspace features, KPI creation, data cleaning, or dashboard configuration!";
        }
      }
    }

    return res.json({ text: responseText });

  } catch (error: any) {
    console.error("[COPILOT_SERVER_FATAL_ERROR] Error in /api/chat:", error.message || error, error.stack);
    return res.status(200).json({ 
      text: "I am Analytics Copilot, your data analytics guide. How can I assist you with your workspace, dataset, or dashboard today?" 
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

