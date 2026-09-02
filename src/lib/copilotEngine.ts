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

  // 1. DETECT INTENT AND ASSEMBLE ENRICHED WORKSPACE CONTEXT
  const intent = detectIntent(message);
  const liveContext: any = { intent };

  if (intent !== 'IDENTITY') {
    // Add active dataset context
    if (primaryDataset) {
      const includeFull = (intent === 'DATASET_SUMMARY' || intent === 'DATA_QUALITY' || intent === 'KPI' || intent === 'EXPLORER');
      liveContext.datasetContext = getActiveDatasetContext(primaryDataset, includeFull);
    }

    // Add specific module context
    if (intent === 'DASHBOARD') {
      liveContext.dashboardContext = getDashboardContext(dashboards, activeDashboardId);
    } else if (intent === 'KPI') {
      const savedKpis = await getSavedKpis();
      liveContext.kpiContext = getKpiContext(savedKpis, primaryDataset?.id);
    } else if (intent === 'EXPLORER') {
      liveContext.explorerContext = getExplorerContext();
    }
  }

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
    text: generateFallbackText(message, evidence, primaryDataset),
    evidence: returnEvidence,
    source: 'local_engine'
  };
}

function generateFallbackText(message: string, evidence: AnalyticalEvidence | null, dataset: Dataset | null): string {
  const lower = message.toLowerCase().trim();

  const isDatasetAccess = 
    /(can you|do you|are you able to|have you|did you)\s+(read|see|access|view|get|load|have|use|know|find|check)\s+(the\s+)?(my\s+)?(workspace\s+)?(data|dataset|file|workspace data|workspace dataset|my data|my dataset|this data|this dataset)\b/i.test(lower) ||
    /(do you have|can you get|is there)\s+(access to|visibility of)\s+(the\s+)?(my\s+)?(workspace\s+)?(data|dataset)\b/i.test(lower) ||
    /what (dataset|data|file) is (currently\s+)?(loaded|active|selected|uploaded|in\s+(my\s+)?workspace)\b/i.test(lower) ||
    /is (there\s+)?(a\s+|my\s+)?(dataset|data|file)\s+(loaded|active|selected|uploaded|in\s+(my\s+)?workspace)\b/i.test(lower) ||
    /can you (access|read|see|check|view) (the\s+)?data(set)?( in my workspace)?\b/i.test(lower) ||
    /do you (see|have|access|know) (the\s+)?(my\s+)?data(set)?\b/i.test(lower);

  if (isDatasetAccess) {
    if (dataset) {
      const colList = (dataset.headers || []).slice(0, 8).join(', ');
      return `Yes. I can access the active dataset in your workspace: **${dataset.name}**.\n\nIt currently contains:\n- **${dataset.rowCount.toLocaleString()} rows**\n- **${dataset.headers.length} columns**\n${colList ? `- **Key columns**: ${colList}\n` : ''}\nI can help you analyze, clean, explore, build KPIs, or create dashboards from this data.`;
    } else {
      return "No active dataset is currently loaded in your workspace. Please navigate to the **Data Import & Profile** tab to upload a CSV or Excel file.";
    }
  }

  const workspaceAnswer = getWorkspaceKnowledgeAnswer(message);
  if (workspaceAnswer) {
    return workspaceAnswer;
  }

  if (!dataset) {
    return "Please import a dataset first so I can analyze your data.";
  }

  if (evidence) {
    if (evidence.intent === 'NAVIGATION' && evidence.navigationTarget) {
      return `I can help you navigate to the **${evidence.navigationTarget.replace(/-/g, ' ')}** section. Click the action card below to switch views.`;
    }

    if (evidence.intent === 'ACTION_KPI_CREATE' && evidence.kpiCreation) {
      const k = evidence.kpiCreation;
      return `I have prepared a new KPI for **${k.name}**.
      
- **Metric**: ${k.column}
- **Aggregation**: ${k.aggregation.toUpperCase()}
- **Description**: ${k.description}

**Recommended Action**: Review the card below and click **"Create KPI"** to add it to your library.`;
    }

    if (evidence.intent === 'ACTION_PLAN' && evidence.actionPlan) {
      const p = evidence.actionPlan;
      return `### Proposed Action Plan: **${p.title}**

I have analyzed your request and orchestrated a deterministic workflow to fulfill it.

**Workflow Steps**:
${p.steps.map((s, i) => `${i + 1}. **${s.label}**`).join('\n')}

**Safety Check**: These actions will be executed sequentially using our existing cleaning and analytics engines. Click **"Execute Action Plan"** to begin.`;
    }

    if (evidence.intent === 'ACTIONABLE_CLEANING' && evidence.cleaningAction) {
      const a = evidence.cleaningAction;
      return `### Actionable Cleaning: **${a.description}**
      
I have identified the requested operation for the **${a.column}** column.

- **Operation**: ${a.actionType.toUpperCase()}
- **Target Column**: ${a.column}
- **Affected Rows**: ${a.affectedRowCount.toLocaleString()}

**Recommended Action**: Review the preview card below and click **"Confirm and Apply"** to execute the change and update the audit trail.`;
    }

    if (evidence.intent === 'DATA_QUALITY' && evidence.qualityDetails) {
      const q = evidence.qualityDetails;
      return `### Data Health Assessment for **${evidence.datasetName}**

- **Health Score**: **${q.healthScore}%**
- **Total Rows**: ${q.totalRows.toLocaleString()}
- **Missing Data Cells**: ${q.missingCount.toLocaleString()} (${q.missingPercent}%)
- **Duplicate Records**: ${q.duplicateCount}
- **Pending Cleaning Issues**: ${q.pendingIssuesCount}

**Recommended Action**: Review pending quality issues in the **Data Cleaning** tab before running downstream reporting.`;
    }

    if (evidence.intent === 'KPI' && evidence.kpiDetails) {
      return `### Saved KPI Evaluation for **${evidence.datasetName}**

${evidence.kpiDetails.map(k => `- **${k.name}**: **${k.formattedValue}** (Formula: \`${k.formula}\` | Status: *${k.status}*${k.statusReason ? ` - ${k.statusReason}` : ''})`).join('\n')}

**Recommended Action**: Keep monitoring KPIs with status *Needs Attention* or *Invalid* for formula correction or null values.`;
    }

    if (evidence.intent === 'COLUMN' && evidence.columnDetails) {
      const c = evidence.columnDetails;
      return `### Field Metadata for **[${c.columnName}]**

- **Technical Type**: \`${c.technicalType}\`
- **Semantic Type**: \`${c.semanticType}\`
- **Description**: ${c.description}
- **Data Completeness**: **${c.completenessPercent.toFixed(1)}%** (${c.nullCount} missing values)
- **Unique Cardinality**: ${c.uniqueCount} distinct values
- **Sample Values**: \`${c.sampleValues.join('`, `')}\`

**Recommended Action**: You can edit or enrich semantic tags and descriptions in the **Data Dictionary** tab.`;
    }

    if (evidence.rows && evidence.rows.length > 0) {
      const topRow = evidence.rows[0];
      const keys = Object.keys(topRow);
      return `### Calculated Analysis for **${evidence.datasetName}**

**${evidence.title}**

${evidence.summaryText ? `- **Summary**: ${evidence.summaryText}\n` : ''}
#### Breakdown (Top Records):
| ${keys.join(' | ')} |
| ${keys.map(() => '---').join(' | ')} |
${evidence.rows.slice(0, 5).map(r => `| ${keys.map(k => r[k] ?? 'N/A').join(' | ')} |`).join('\n')}

**Key Finding**: The data shows a clear distribution across top categories with **${topRow[keys[0]]}** recording the highest metric.

**Recommended Action**: Would you like me to add this breakdown directly as a chart widget to your active dashboard?`;
    }
  }

  return `I have indexed **${dataset.name}** (${dataset.rowCount.toLocaleString()} rows, ${dataset.headers.length} columns). Ask me about totals, top performers, data quality, KPIs, or dashboards!`;
}
