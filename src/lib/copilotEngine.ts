import { Dataset, Dashboard, RelationshipSuggestion, DashboardPlan, KpiDefinition } from '@/types';
import { generateAnalyticsEvidence, AnalyticalEvidence } from './copilotAnalyticsEngine';
import { getWorkspaceKnowledgeAnswer } from './workspaceKnowledge';
import { calculateDatasetHealth } from './profiler';
import { getSavedKpis } from './kpiStorage';

export interface CopilotResponse {
  text: string;
  evidence?: AnalyticalEvidence | null;
  source: 'server' | 'client_gemini' | 'local_engine';
}

export type CopilotIntent = 'IDENTITY' | 'DATASET_SUMMARY' | 'DATA_QUALITY' | 'DASHBOARD' | 'KPI' | 'EXPLORER' | 'GENERAL_HELP';

export function detectIntent(message: string): CopilotIntent {
  const q = message.toLowerCase();
  
  if (
    /(what|who)\s+(is|are)\s+(your\s+name|you)\b/i.test(q) || 
    /(who\s+created|who\s+built|who\s+developed|who\s+made)\s+you/i.test(q) ||
    /how\s+does\s+(this\s+)?(app|workspace|system|workflow|tool|chart|selection)\s+work/i.test(q)
  ) {
    return 'IDENTITY';
  }

  if (
    /dash(board)?/i.test(q) || 
    /widget/i.test(q) || 
    /chart/i.test(q) || 
    /visual/i.test(q) ||
    /presentation/i.test(q)
  ) {
    return 'DASHBOARD';
  }

  if (
    /\bkpi\b/i.test(q) || 
    /\bmetric/i.test(q) || 
    /formula/i.test(q) || 
    /target/i.test(q) || 
    /achievement/i.test(q)
  ) {
    return 'KPI';
  }

  if (
    /clean/i.test(q) || 
    /qual(ity)?/i.test(q) || 
    /defect/i.test(q) || 
    /anomal/i.test(q) || 
    /duplicate/i.test(q) || 
    /missing/i.test(q) || 
    /issue/i.test(q) || 
    /outlier/i.test(q) || 
    /transform/i.test(q) || 
    /audit/i.test(q) || 
    /health/i.test(q)
  ) {
    return 'DATA_QUALITY';
  }

  if (
    /explor/i.test(q) || 
    /slice/i.test(q) || 
    /filter/i.test(q) || 
    /group/i.test(q) || 
    /sort/i.test(q)
  ) {
    return 'EXPLORER';
  }

  if (
    /dataset/i.test(q) || 
    /loaded/i.test(q) || 
    /\bdata\b/i.test(q) || 
    /column/i.test(q) || 
    /row/i.test(q) || 
    /type/i.test(q) || 
    /schema/i.test(q) || 
    /header/i.test(q)
  ) {
    return 'DATASET_SUMMARY';
  }

  return 'GENERAL_HELP';
}

function getActiveDatasetContext(dataset: Dataset, includeFullProfiles: boolean = false) {
  if (!dataset) return null;

  const health = calculateDatasetHealth(dataset);

  const numericCols: string[] = [];
  const categoricalCols: string[] = [];
  const dateCols: string[] = [];
  const datetimeCols: string[] = [];
  const timeCols: string[] = [];

  const headers = dataset.headers || [];
  headers.forEach(h => {
    const type = dataset.columnProfiles?.[h]?.type || dataset.columnTypes?.[h] || 'unknown';
    const lowerHeader = h.toLowerCase();
    
    if (type === 'date') {
      if (lowerHeader.includes('time') || lowerHeader.includes('hour') || lowerHeader.includes('minute') || lowerHeader.includes('second')) {
        datetimeCols.push(h);
      } else {
        dateCols.push(h);
      }
    } else if (type === 'numeric') {
      numericCols.push(h);
    } else if (type === 'categorical' || type === 'text' || type === 'boolean') {
      categoricalCols.push(h);
    } else {
      categoricalCols.push(h);
    }
  });

  const profiles = headers.map(h => {
    const p = dataset.columnProfiles?.[h] as any;
    const stats: any = {
      name: h,
      type: p?.type || 'unknown',
      semanticType: dataset.columnSemanticTypes?.[h] || 'unknown',
      nullCount: p?.nullCount ?? 0,
      completenessPercent: p ? parseFloat(((1 - (p.nullCount / dataset.rowCount)) * 100).toFixed(1)) : 100,
      uniqueCount: p?.uniqueCount ?? 0,
    };
    if (includeFullProfiles && p) {
      if (p.min !== undefined && p.min !== null) stats.min = p.min;
      if (p.max !== undefined && p.max !== null) stats.max = p.max;
      if (p.mean !== undefined && p.mean !== null) stats.mean = parseFloat(Number(p.mean).toFixed(2));
      if (p.median !== undefined && p.median !== null) stats.median = parseFloat(Number(p.median).toFixed(2));
    }
    return stats;
  });

  const pendingIssues = (dataset.issues || [])
    .filter(i => i.status === 'pending')
    .map(i => ({
      column: i.column || 'Dataset Level',
      type: i.type,
      title: i.title,
      description: i.description,
      riskLevel: i.riskLevel,
      affectedRowCount: i.affectedRowCount,
      suggestedAction: i.suggestedAction
    }));

  const sampleData = (dataset.data || dataset.fullData || []).slice(0, 3).map(row => {
    const cleanRow: Record<string, any> = {};
    headers.forEach(h => {
      cleanRow[h] = row[h];
    });
    return cleanRow;
  });

  return {
    datasetName: dataset.name,
    filename: dataset.filename,
    rowCount: dataset.rowCount,
    columnCount: dataset.colCount || headers.length,
    columnNames: headers,
    dataTypes: dataset.columnTypes || {},
    semanticTypes: dataset.columnSemanticTypes || {},
    numericColumns: numericCols,
    categoricalColumns: categoricalCols,
    dateColumns: dateCols,
    datetimeColumns: datetimeCols,
    timeColumns: timeCols,
    missingValues: {
      totalMissingCells: health.missingCells,
      missingCellsPercentage: health.missingCellsPercentage,
      byColumn: headers.reduce((acc, h) => {
        acc[h] = dataset.columnProfiles?.[h]?.nullCount ?? 0;
        return acc;
      }, {} as Record<string, number>)
    },
    duplicates: health.duplicateRows,
    qualityIssues: pendingIssues,
    readinessScore: health.score,
    relevantStatistics: includeFullProfiles ? profiles : undefined,
    cleaningSuggestions: pendingIssues.map(i => i.suggestedAction),
    safeSampleRows: sampleData
  };
}

function getDashboardContext(dashboards: Dashboard[], activeDashboardId: string | null | undefined) {
  const activeDb = dashboards.find(d => d.id === activeDashboardId);
  if (!activeDb) return { hasActiveDashboard: false };

  return {
    hasActiveDashboard: true,
    activeDashboardId: activeDb.id,
    dashboardName: activeDb.title,
    subtitle: activeDb.subtitle,
    description: activeDb.description,
    widgets: (activeDb.widgets || []).map(w => ({
      id: w.id,
      title: w.title,
      type: w.type,
      xAxisColumn: w.xAxisColumn,
      yAxisColumn: w.yAxisColumn,
      aggregation: w.aggregation,
      kpiId: w.kpiId,
      filters: w.filters || (w.filter ? [w.filter] : []),
      topN: w.topN,
      sortDirection: w.sortDirection,
      themePalette: w.themePalette || 'professional'
    })),
    filters: activeDb.filters || [],
    widgetsCount: (activeDb.widgets || []).length,
    kpiCardsCount: (activeDb.widgets || []).filter(w => w.type === 'kpi').length,
    chartsCount: (activeDb.widgets || []).filter(w => w.type !== 'kpi' && w.type !== 'filter' && w.type !== 'text').length
  };
}

function getKpiContext(savedKpis: KpiDefinition[], activeDatasetId: string | null | undefined) {
  const filtered = activeDatasetId ? savedKpis.filter(k => k.datasetId === activeDatasetId) : savedKpis;
  return {
    kpisCount: filtered.length,
    kpis: filtered.map(k => ({
      id: k.id,
      name: k.name,
      description: k.description,
      metricType: k.metricType,
      column: k.column,
      aggregation: k.aggregation,
      formula: k.metricType === 'calculated' && k.formulaTokens ? k.formulaTokens.map(t => {
        if (t.type === 'operator') return t.operator;
        if (t.type === 'constant') return t.value;
        if (t.type === 'kpi_ref') return `[KPI:${t.kpiName || t.kpiId}]`;
        return `[Col:${t.column}]`;
      }).join(' ') : undefined,
      targetValue: k.targetValue,
      comparison: k.comparison,
      dateColumn: k.dateColumn,
      filters: k.filters || [],
      formatting: k.format,
      status: k.status,
      statusReason: k.statusReason
    }))
  };
}

function getExplorerContext() {
  const explorerState = (window as any).__explorerState;
  if (!explorerState) {
    return {
      active: false,
      note: "Data Explorer is not currently open or active."
    };
  }
  return {
    active: true,
    currentSelectedColumns: explorerState.visibleColumns || [],
    analysisConfiguration: {
      searchTerm: explorerState.searchTerm || "",
      filters: explorerState.filters || [],
      sortRules: explorerState.sortRules || []
    },
    currentChartOrGroupingState: explorerState.groupingConfig ? {
      groupByColumn: explorerState.groupingConfig.groupByColumn,
      metricColumn: explorerState.groupingConfig.metricColumn,
      aggregation: explorerState.groupingConfig.aggregation
    } : null,
    quickMetrics: explorerState.quickMetrics || []
  };
}

export function safeSanitize(val: any, maxDepth = 4, seen = new WeakSet()): any {
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
    // Ignore React elements / fiber instances
    if (val.$$typeof || val._reactInternalFiber || val._owner) return null;
    if (seen.has(val)) return '[Circular]';
    seen.add(val);

    if (maxDepth <= 0) return '[Depth Limit Reached]';

    if (Array.isArray(val)) {
      return val.slice(0, 10).map(item => safeSanitize(item, maxDepth - 1, seen)).filter(item => item !== null);
    }

    const clean: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      if (key.startsWith('_') || key.startsWith('$')) continue;
      const cleaned = safeSanitize(val[key], maxDepth - 1, seen);
      if (cleaned !== null && cleaned !== undefined) {
        clean[key] = cleaned;
      }
    }
    return clean;
  }
  return null;
}

export async function queryCopilot(
  message: string,
  history: { role: string; text: string }[],
  metadata: any,
  datasets: Dataset[],
  dashboards: Dashboard[] = [],
  activeDashboardId?: string | null
): Promise<CopilotResponse> {
  const primaryDataset = datasets[0] || null;

  // 0. GENERATE DETERMINISTIC EVIDENCE FIRST
  const evidence = await generateAnalyticsEvidence(
    message,
    history,
    primaryDataset,
    dashboards,
    activeDashboardId
  );

  // 1. ASSEMBLE FULL LIVE WORKSPACE CONTEXT (UNRESTRICTED FOR AI REASONING)
  const intent = detectIntent(message);
  let savedKpis: KpiDefinition[] = [];
  try {
    savedKpis = await getSavedKpis();
  } catch {
    savedKpis = [];
  }

  const liveContext: any = {
    intent,
    datasetContext: primaryDataset ? getActiveDatasetContext(primaryDataset, true) : null,
    dashboardContext: getDashboardContext(dashboards, activeDashboardId),
    kpiContext: getKpiContext(savedKpis, primaryDataset?.id),
    explorerContext: getExplorerContext(),
    workspaceSummary: {
      totalDatasets: datasets.length,
      activeDatasetName: primaryDataset?.name || null,
      totalDashboards: dashboards.length,
      activeDashboardId: activeDashboardId || null,
      totalSavedKpis: savedKpis.length
    }
  };

  // 2. SAFE CONTEXT PREPARATION LAYER
  const safeHistory = (history || []).slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    text: safeSanitize(m.text || "")
  }));

  const safeLiveContext = safeSanitize(liveContext);
  const safeEvidence = evidence?.note ? null : safeSanitize(evidence);
  const returnEvidence = evidence?.note ? null : evidence;

  // Try server proxy `/api/chat` call
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: safeHistory,
        metadata: safeSanitize(metadata),
        liveContext: safeLiveContext,
        evidence: safeEvidence
      })
    });

    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.text) {
        return { text: data.text, evidence: returnEvidence, source: 'server' };
      }
    }

    console.warn('/api/chat non-OK or empty response, falling back to local analyst engine');
  } catch (e: any) {
    console.warn('/api/chat network error, falling back to local analyst engine:', e);
  }

  // 3. Intelligent Local Fallback Engine (for safety)
  return {
    text: generateFallbackText(message, evidence, primaryDataset, dashboards, activeDashboardId, savedKpis),
    evidence: returnEvidence,
    source: 'local_engine'
  };
}

function generateFallbackText(
  message: string, 
  evidence: AnalyticalEvidence | null, 
  dataset: Dataset | null,
  dashboards: Dashboard[] = [],
  activeDashboardId?: string | null,
  savedKpis: KpiDefinition[] = []
): string {
  const lower = message.toLowerCase().trim();

  // 1. Identity & Creator Queries
  const isIdentity = 
    /(what|who)\s+(is|are)\s+(ur|your)\s+(name|identity)\b/i.test(lower) || 
    /who (made|created|built|developed|designed) (u|you)\b/i.test(lower) ||
    /what is your name\b/i.test(lower) ||
    /who are you\b/i.test(lower);

  if (isIdentity) {
    return "I am **Analytics Copilot**, an AI-powered analytics and workspace assistant developed by **Sajeeb The Analyst**. My mission is to act as your Senior Data Analyst, helping you analyze datasets, diagnose errors, build KPIs, design visual dashboards, and generate executive reports.";
  }

  // 2. Dataset Access & Availability Queries
  const isDatasetAccess = 
    /(can you|do you|are you able to|have you|did you)\s+(read|see|access|view|get|load|have|use|know|find|check)\s+(the\s+)?(my\s+)?(workspace\s+)?(data|dataset|file|workspace data|workspace dataset|my data|my dataset|this data|this dataset)\b/i.test(lower) ||
    /(do you have|can you get|is there)\s+(access to|visibility of)\s+(the\s+)?(my\s+)?(workspace\s+)?(data|dataset)\b/i.test(lower) ||
    /what (dataset|data|file) is (currently\s+)?(loaded|active|selected|uploaded|in\s+(my\s+)?workspace)\b/i.test(lower) ||
    /is (there\s+)?(a\s+|my\s+)?(dataset|data|file)\s+(loaded|active|selected|uploaded|in\s+(my\s+)?workspace)\b/i.test(lower) ||
    /can (you|u) (access|read|see|check|view) (the\s+)?data(set)?( in my workspace)?\b/i.test(lower) ||
    /do (you|u) (see|have|access|know) (the\s+)?(my\s+)?data(set)?\b/i.test(lower);

  if (isDatasetAccess) {
    if (dataset) {
      const colList = (dataset.headers || []).slice(0, 8).join(', ');
      const health = calculateDatasetHealth(dataset);
      return `Yes. I can access the active dataset in your workspace: **${dataset.name}**.\n\nIt currently contains:\n- **${dataset.rowCount.toLocaleString()} rows**\n- **${dataset.headers.length} columns**\n${colList ? `- **Key columns**: ${colList}\n` : ''}- **Readiness Score**: **${health.score}%**\n\nI can help you analyze, clean, explore, build KPIs, or create dashboards from this data.`;
    } else {
      return "No active dataset is currently loaded in your workspace. Please navigate to the **Data Import & Profile** tab to upload a CSV or Excel file.";
    }
  }

  // 3. Dataset Health & Problem Questions ("whats problem to that dataset?", "what is wrong with my data?")
  const isDatasetProblem = 
    /(what|whats|what's|is there|any)\s+(the\s+)?(problem|issue|defect|error|bug|wrong|health|quality)\s+(with|to|in|of)\s+(that|this|the|my)?\s*(dataset|data|file)\b/i.test(lower) ||
    /is (my|this|the)\s+(dataset|data)\s+(clean|ready|good|ok|okay)\b/i.test(lower) ||
    /what (is|are) (wrong|the issues|the problems) (with|in) (my|this|the) (data|dataset)\b/i.test(lower);

  if (isDatasetProblem) {
    if (!dataset) {
      return "No active dataset is currently loaded in your workspace. Please navigate to the **Data Import & Profile** tab to upload a CSV or Excel file.";
    }
    const health = calculateDatasetHealth(dataset);
    const pendingIssues = (dataset.issues || []).filter(i => i.status === 'pending');

    let response = `### Data Quality & Health Assessment for **${dataset.name}**\n\n`;
    response += `- **Overall Readiness Score**: **${health.score}%**\n`;
    response += `- **Total Records**: ${dataset.rowCount.toLocaleString()} rows | **Fields**: ${dataset.headers.length} columns\n`;
    response += `- **Missing Cells**: ${health.missingCells.toLocaleString()} (${health.missingCellsPercentage}%)\n`;
    response += `- **Duplicate Rows**: ${health.duplicateRows.toLocaleString()}\n\n`;

    if (pendingIssues.length > 0) {
      response += `#### Detected Data Issues (${pendingIssues.length}):\n`;
      pendingIssues.forEach((issue, idx) => {
        response += `${idx + 1}. **${issue.column || 'Dataset'}** (${issue.riskLevel?.toUpperCase() || 'MEDIUM'} RISK): ${issue.title} — ${issue.description}\n`;
      });
      response += `\n**Recommended Next Action**: Navigate to the **Data Cleaning** tab to review suggestions and apply safe data transformations.`;
    } else if (health.score >= 95) {
      response += `Your dataset is clean and in excellent shape! There are no critical data quality issues or pending anomalies detected.`;
    } else {
      response += `Your dataset is generally usable, but contains missing values or formatting inconsistencies. You can review and clean them in the **Data Cleaning** tab.`;
    }
    return response;
  }

  // 4. Dashboard & Chart Troubleshooting ("why my dashboard not working?", "this chart blank why?")
  const isDashboardTroubleshoot = 
    /(why|what|how)\s+.*(dashboard|chart|widget|visual)\s+.*(not work|blank|empty|broken|fail|error|issue|problem|nothing|showing)\b/i.test(lower) ||
    /why (is|are) (my|this|the) (dashboard|chart|widget) (not working|blank|empty|broken)\b/i.test(lower) ||
    /this chart blank why\b/i.test(lower) ||
    /why dashboard not working\b/i.test(lower);

  if (isDashboardTroubleshoot) {
    if (!dataset) {
      return "Your dashboard widgets cannot render data because **no active dataset** is loaded in your workspace. Please import a dataset first under **Data Import & Profile**.";
    }
    const activeDb = dashboards.find(d => d.id === activeDashboardId) || dashboards[0];
    if (!activeDb) {
      return "No active dashboard is currently created or selected. Navigate to the **Dashboard** tab to create a visual dashboard.";
    }
    const widgets = activeDb.widgets || [];
    if (widgets.length === 0) {
      return `Your active dashboard **"${activeDb.title}"** currently has **0 widgets**. Click **Add Widget** or use AI Smart Visuals to populate your dashboard.`;
    }

    // Diagnostic scan of widgets against dataset headers
    const problemWidgets: string[] = [];
    widgets.forEach(w => {
      if (w.yAxisColumn && !dataset.headers.includes(w.yAxisColumn)) {
        problemWidgets.push(`Widget **"${w.title}"** references column \`${w.yAxisColumn}\` which is missing from the dataset.`);
      }
      if (w.xAxisColumn && !dataset.headers.includes(w.xAxisColumn)) {
        problemWidgets.push(`Widget **"${w.title}"** references column \`${w.xAxisColumn}\` which is missing from the dataset.`);
      }
    });

    let response = `### Diagnostic Report for Dashboard: **"${activeDb.title}"**\n\n`;
    response += `1. **Detected Status**: Dashboard contains **${widgets.length} widgets**.\n`;
    if (problemWidgets.length > 0) {
      response += `2. **Detected Configuration Issues**:\n${problemWidgets.map(p => `   - ${p}`).join('\n')}\n`;
      response += `3. **Recommended Fix**: Edit the affected widget(s) in the **Dashboard** tab and select valid column names from your active dataset.`;
    } else {
      response += `2. **Possible Causes for Blank/Inactive Charts**:\n`;
      response += `   - **Global Dashboard Filters**: Ensure active date or category filters are not filtering out all data rows.\n`;
      response += `   - **Column Aggregations**: Verify that numerical aggregations (SUM, AVG) are applied to numeric columns, not text strings.\n`;
      response += `   - **Empty / Null Values**: Check if the selected metric column contains missing or non-numeric values.\n`;
      response += `3. **Recommended Next Steps**: Navigate to the **Dashboard** tab, open the widget editor for any blank chart, and verify the axis mapping and aggregation settings.`;
    }
    return response;
  }

  // 5. Data Cleaning Guidance ("can u clean my data?")
  const isCleaningRequest = 
    /can (u|you) clean (my|this|the)?\s*(data|dataset)\b/i.test(lower) ||
    /how (can|do) i clean (my|this|the)?\s*(data|dataset)\b/i.test(lower) ||
    /clean (my|this|the) (data|dataset)\b/i.test(lower);

  if (isCleaningRequest) {
    if (!dataset) {
      return "To clean data, please first import a CSV or Excel dataset in the **Data Import & Profile** tab.";
    }
    const health = calculateDatasetHealth(dataset);
    return `I can guide you through cleaning your active dataset **${dataset.name}**!\n\n**Current Dataset State**:\n- **Readiness Score**: **${health.score}%**\n- **Missing Values**: ${health.missingCells} cells\n- **Duplicate Records**: ${health.duplicateRows} rows\n\n**How to Clean Your Data**:\n1. Navigate to the **Data Cleaning** tab.\n2. Review automatically detected quality issues.\n3. Apply targeted cleaning actions (e.g., *Trim Whitespace*, *Fill Missing Values*, *Merge Categories*, *Remove Duplicates*).\n4. Preview before/after rows and click **Apply** to execute updates safely.`;
  }

  // 6. KPI Recommendations ("which kpi good for my data?")
  const isKpiRecommendation = 
    /which kpi (good|best|should|can) (for|in|with) (my|this|the)?\s*(data|dataset)?\b/i.test(lower) ||
    /what kpi (should|can) i (build|create|make|use)\b/i.test(lower) ||
    /suggest kpis?\b/i.test(lower);

  if (isKpiRecommendation) {
    if (!dataset) {
      return "Please load a dataset first so I can recommend tailored KPIs based on your column demographics.";
    }
    const numCols = dataset.headers.filter(h => {
      const type = dataset.columnProfiles?.[h]?.type || dataset.columnTypes?.[h];
      return type === 'numeric';
    });
    const dateCols = dataset.headers.filter(h => {
      const type = dataset.columnProfiles?.[h]?.type || dataset.columnTypes?.[h];
      return type === 'date';
    });

    let response = `### Recommended KPIs for **${dataset.name}**\n\nBased on your dataset structure, here are top metrics you can build in the **KPI Builder**:\n\n`;
    if (numCols.length > 0) {
      numCols.slice(0, 3).forEach(col => {
        response += `- **Total ${col}**: \`SUM(${col})\` — Tracks total accumulated ${col}.\n`;
        response += `- **Average ${col}**: \`AVG(${col})\` — Monitors average benchmark per record.\n`;
      });
    }
    if (dateCols.length > 0 && numCols.length > 0) {
      response += `- **Period-over-Period Growth**: Measures temporal performance using \`${dateCols[0]}\` and \`${numCols[0]}\`.\n`;
    }
    response += `- **Record Count**: \`COUNT(*)\` — Tracks overall record volume (${dataset.rowCount.toLocaleString()} rows).\n\n`;
    response += `**Action**: Navigate to the **KPI Builder** tab to create and save these metrics!`;
    return response;
  }

  // 7. Workspace Overview ("what can i do here?")
  const isWorkspaceOverview = 
    /what can (i|you) do (here|in this app|with this tool|on this platform)\b/i.test(lower) ||
    /what is this (app|platform|website|workspace)\b/i.test(lower) ||
    /how to use this (app|workspace|tool)\b/i.test(lower) ||
    /overview of features\b/i.test(lower);

  if (isWorkspaceOverview) {
    return `Welcome to **Analytics Copilot**! This platform is an end-to-end data analytics workspace developed by Sajeeb The Analyst.\n\nHere is what you can do:\n- **Data Import & Profile**: Upload CSV/Excel datasets and view instant data health & profile scores.\n- **Data Cleaning**: Detect anomalies, nulls, duplicates, and execute safe cleaning transformations.\n- **Data Explorer**: Slice, filter, search, group, and sort your raw data interactive table.\n- **Data Model & Relationships**: Explore auto-detected multi-table relationships and schema maps.\n- **KPI Builder**: Create standard and complex calculated business metrics with custom targets.\n- **Interactive Dashboards**: Build visual grids with charts, KPI cards, and custom filters.\n- **MIS Executive Reports**: Generate structured business reports and executive narratives.\n- **AI Copilot**: Ask questions in natural language to analyze data, troubleshoot errors, and uncover insights!`;
  }

  // 8. Workspace Knowledge Base Lookup
  const workspaceAnswer = getWorkspaceKnowledgeAnswer(message);
  if (workspaceAnswer) {
    return workspaceAnswer;
  }

  // 9. Analytical Evidence Handling
  if (evidence) {
    if (evidence.intent === 'NAVIGATION' && evidence.navigationTarget) {
      return `I can help you navigate to the **${evidence.navigationTarget.replace(/-/g, ' ')}** section. Click the action card below to switch views.`;
    }

    if (evidence.intent === 'ACTION_KPI_CREATE' && evidence.kpiCreation) {
      const k = evidence.kpiCreation;
      return `I have prepared a new KPI for **${k.name}**.\n\n- **Metric**: ${k.column}\n- **Aggregation**: ${k.aggregation.toUpperCase()}\n- **Description**: ${k.description}\n\n**Recommended Action**: Review the card below and click **"Create KPI"** to add it to your library.`;
    }

    if (evidence.intent === 'ACTION_PLAN' && evidence.actionPlan) {
      const p = evidence.actionPlan;
      return `### Proposed Action Plan: **${p.title}**\n\nI have analyzed your request and orchestrated a deterministic workflow to fulfill it.\n\n**Workflow Steps**:\n${p.steps.map((s, i) => `${i + 1}. **${s.label}**`).join('\n')}\n\n**Safety Check**: These actions will be executed sequentially. Click **"Execute Action Plan"** to begin.`;
    }

    if (evidence.intent === 'ACTIONABLE_CLEANING' && evidence.cleaningAction) {
      const a = evidence.cleaningAction;
      return `### Actionable Cleaning: **${a.description}**\n\nI have identified the requested operation for the **${a.column}** column.\n\n- **Operation**: ${a.actionType.toUpperCase()}\n- **Target Column**: ${a.column}\n- **Affected Rows**: ${a.affectedRowCount.toLocaleString()}\n\n**Recommended Action**: Review the preview card below and click **"Confirm and Apply"** to execute the change.`;
    }

    if (evidence.intent === 'DATA_QUALITY' && evidence.qualityDetails) {
      const q = evidence.qualityDetails;
      return `### Data Health Assessment for **${evidence.datasetName}**\n\n- **Health Score**: **${q.healthScore}%**\n- **Total Rows**: ${q.totalRows.toLocaleString()}\n- **Missing Data Cells**: ${q.missingCount.toLocaleString()} (${q.missingPercent}%)\n- **Duplicate Records**: ${q.duplicateCount}\n- **Pending Cleaning Issues**: ${q.pendingIssuesCount}\n\n**Recommended Action**: Review pending quality issues in the **Data Cleaning** tab before running downstream reporting.`;
    }

    if (evidence.intent === 'KPI' && evidence.kpiDetails) {
      return `### Saved KPI Evaluation for **${evidence.datasetName}**\n\n${evidence.kpiDetails.map(k => `- **${k.name}**: **${k.formattedValue}** (Formula: \`${k.formula}\` | Status: *${k.status}*${k.statusReason ? ` - ${k.statusReason}` : ''})`).join('\n')}\n\n**Recommended Action**: Keep monitoring KPIs with status *Needs Attention* or *Invalid* for formula correction.`;
    }

    if (evidence.intent === 'COLUMN' && evidence.columnDetails) {
      const c = evidence.columnDetails;
      return `### Field Metadata for **[${c.columnName}]**\n\n- **Technical Type**: \`${c.technicalType}\`\n- **Semantic Type**: \`${c.semanticType}\`\n- **Description**: ${c.description}\n- **Data Completeness**: **${c.completenessPercent.toFixed(1)}%** (${c.nullCount} missing values)\n- **Unique Cardinality**: ${c.uniqueCount} distinct values\n- **Sample Values**: \`${c.sampleValues.join('`, `')}\`\n\n**Recommended Action**: You can edit or enrich semantic tags and descriptions in the **Data Dictionary** tab.`;
    }

    if (evidence.rows && evidence.rows.length > 0) {
      const topRow = evidence.rows[0];
      const keys = Object.keys(topRow);
      return `### Calculated Analysis for **${evidence.datasetName}**\n\n**${evidence.title}**\n\n${evidence.summaryText ? `- **Summary**: ${evidence.summaryText}\n` : ''}#### Breakdown (Top Records):\n| ${keys.join(' | ')} |\n| ${keys.map(() => '---').join(' | ')} |\n${evidence.rows.slice(0, 5).map(r => `| ${keys.map(k => r[k] ?? 'N/A').join(' | ')} |`).join('\n')}\n\n**Key Finding**: The data shows a clear distribution across top categories with **${topRow[keys[0]]}** recording the highest metric.\n\n**Recommended Action**: Would you like me to add this breakdown directly as a chart widget to your active dashboard?`;
    }
  }

  // 10. Intelligent General Response (NO generic "I have indexed your dataset" placeholders)
  if (dataset) {
    const health = calculateDatasetHealth(dataset);
    const topCols = (dataset.headers || []).slice(0, 8).join(', ');
    return `I evaluated your question regarding **${dataset.name}**.\n\n**Current Dataset Summary**:\n- **Records**: ${dataset.rowCount.toLocaleString()} rows | **Fields**: ${dataset.headers.length} columns\n- **Key Fields**: ${topCols}\n- **Readiness Score**: **${health.score}%**\n\nYou can ask me to perform calculations, troubleshoot your dashboard, recommend KPIs, explain data cleaning steps, or explore specific columns!`;
  }

  return "I am Analytics Copilot, your data analytics assistant. Upload a dataset or ask me about workspace features, KPI creation, data cleaning, or dashboard configuration!";
}
