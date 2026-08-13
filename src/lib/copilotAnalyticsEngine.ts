import { Dataset, Dashboard, KpiDefinition } from '@/types';
import { executeAnalysis } from './analyticsEngine';
import { getSavedKpis } from './kpiStorage';
import { evaluateKpi } from './kpiEngine';
import { getSavedMisReports, MisReportConfig } from './misReportStorage';
import { getSavedColumnMetadata } from './dataDictionaryStorage';
import { calculateQualityStatus, normalizeTechnicalType, inferSemanticType } from './dataDictionaryEngine';
import { calculateDatasetHealth } from './profiler';

export type AnalyticalIntent = 
  | 'DESCRIPTIVE'
  | 'COMPARATIVE'
  | 'TREND'
  | 'RANKING'
  | 'KPI'
  | 'DATA_QUALITY'
  | 'DASHBOARD'
  | 'MIS'
  | 'COLUMN'
  | 'ACTIONABLE_CLEANING'
  | 'NAVIGATION'
  | 'ACTION_KPI_CREATE'
  | 'ACTION_PLAN'
  | 'GENERAL';

export interface ActionPlanStep {
  id: string;
  label: string;
  action: 'cleaning' | 'navigation' | 'kpi_create' | 'dashboard_add' | 'analysis';
  payload: any;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface ActionPlan {
  title: string;
  steps: ActionPlanStep[];
}

export interface ActionableCleaningPreview {
  actionType: 'nulls' | 'headers' | 'cast' | 'outliers' | 'text' | 'date' | 'issue';
  column?: string;
  params?: any;
  description: string;
  affectedRowCount: number;
  sampleBefore: string[];
  sampleAfter: string[];
}

export interface AnalyticalEvidence {
  intent: AnalyticalIntent;
  datasetId: string;
  datasetName: string;
  title: string;
  actionPlan?: ActionPlan;
  navigationTarget?: string;
  kpiCreation?: {
    name: string;
    column: string;
    aggregation: string;
    description: string;
  };
  metricName?: string;
  dimensionName?: string;
  summaryText?: string;
  headers?: string[];
  rows?: Record<string, any>[];
  stats?: Record<string, any>;
  kpiDetails?: {
    id: string;
    name: string;
    formula: string;
    formattedValue: string;
    rawValue: number | null;
    status: string;
    statusReason?: string;
    errors?: string[];
  }[];
  qualityDetails?: {
    healthScore: number;
    totalRows: number;
    missingCount: number;
    missingPercent: number;
    duplicateCount: number;
    invalidDateCount: number;
    pendingIssuesCount: number;
    issuesList: { title: string; risk: string; affectedRows: number }[];
  };
  columnDetails?: {
    columnName: string;
    technicalType: string;
    semanticType: string;
    description: string;
    completenessPercent: number;
    nullCount: number;
    uniqueCount: number;
    sampleValues: string[];
    usedInCount: number;
  };
  dashboardDetails?: {
    title: string;
    widgetsCount: number;
    activeFilters: string[];
    widgetsSummary: { title: string; type: string; valueOrResult: string }[];
  };
  misDetails?: {
    totalReports: number;
    activeReport?: string;
    lastGenerated?: string;
  };
  cleaningAction?: ActionableCleaningPreview;
  filterContext?: string;
  recommendedWidget?: {
    title: string;
    type: 'bar' | 'line' | 'pie' | 'kpi' | 'table';
    datasetId: string;
    xAxisColumn: string;
    yAxisColumn: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
}

/**
 * Identify matching dataset columns from user message text
 */
export function findMatchingColumns(dataset: Dataset, text: string): {
  measureCols: string[];
  dimensionCols: string[];
  dateCols: string[];
} {
  const textLower = text.toLowerCase();
  const measureCols: string[] = [];
  const dimensionCols: string[] = [];
  const dateCols: string[] = [];

  for (const h of dataset.headers || []) {
    const colLower = h.toLowerCase();
    const profile = dataset.columnProfiles?.[h];
    const isNum = profile?.type === 'numeric' || dataset.fullData?.some(r => typeof r[h] === 'number');
    const isDate = profile?.type === 'date' || colLower.includes('date') || colLower.includes('time') || colLower.includes('year') || colLower.includes('month');

    // Check if column name or common alias is in prompt
    const matches = textLower.includes(colLower) || 
      (colLower.includes('sales') && (textLower.includes('revenue') || textLower.includes('sale'))) ||
      (colLower.includes('revenue') && (textLower.includes('sales') || textLower.includes('revenue'))) ||
      (colLower.includes('profit') && textLower.includes('profit')) ||
      (colLower.includes('region') && textLower.includes('region')) ||
      (colLower.includes('product') && textLower.includes('product')) ||
      (colLower.includes('category') && textLower.includes('categor'));

    if (matches || textLower.length < 15) { // If query is short, default include top columns
      if (isDate) {
        dateCols.push(h);
      } else if (isNum) {
        measureCols.push(h);
      } else {
        dimensionCols.push(h);
      }
    }
  }

  // Fallback defaults if no explicit match found in headers
  if (measureCols.length === 0) {
    const defaultNum = dataset.headers.find(h => dataset.columnProfiles?.[h]?.type === 'numeric' || dataset.fullData?.some(r => typeof r[h] === 'number'));
    if (defaultNum) measureCols.push(defaultNum);
  }

  if (dimensionCols.length === 0) {
    const defaultDim = dataset.headers.find(h => dataset.columnProfiles?.[h]?.type !== 'numeric' && h !== measureCols[0]);
    if (defaultDim) dimensionCols.push(defaultDim);
  }

  return { measureCols, dimensionCols, dateCols };
}

/**
 * Main Deterministic Analytics Evidence Generator
 */
export async function generateAnalyticsEvidence(
  message: string,
  history: { role: string; text: string }[],
  dataset: Dataset | null,
  dashboards: Dashboard[] = [],
  activeDashboardId?: string | null
): Promise<AnalyticalEvidence | null> {
  if (!dataset || !dataset.fullData || dataset.fullData.length === 0) {
    return null;
  }

  const lower = message.toLowerCase().trim();

  // Inspect recent chat history for follow-up state
  let previousDimension: string | undefined;
  let previousMetric: string | undefined;

  for (let i = history.length - 1; i >= 0; i--) {
    const hText = history[i].text.toLowerCase();
    for (const header of dataset.headers) {
      if (hText.includes(header.toLowerCase())) {
        const isNum = dataset.columnProfiles?.[header]?.type === 'numeric' || dataset.fullData.some(r => typeof r[header] === 'number');
        if (isNum && !previousMetric) previousMetric = header;
        if (!isNum && !previousDimension) previousDimension = header;
      }
    }
    if (previousDimension && previousMetric) break;
  }

  // 0.0 ACTION PLAN ORCHESTRATION (MULTI-STEP)
  const isMultiStep = lower.includes(' then ') || lower.includes(' and then ') || lower.includes(' followed by ') || 
                      (lower.includes('clean') && (lower.includes('kpi') || lower.includes('dashboard') || lower.includes('show'))) ||
                      (lower.includes('create') && lower.includes('add to dashboard'));

  if (isMultiStep) {
    const steps: ActionPlanStep[] = [];
    
    // Step detection: Cleaning
    if (lower.includes('clean') || lower.includes('convert') || lower.includes('format')) {
      const targetHeader = dataset.headers.find(h => lower.includes(h.toLowerCase()));
      if (targetHeader) {
        steps.push({
          id: 'step-clean',
          label: `Clean and format "${targetHeader}" column`,
          action: 'cleaning',
          status: 'pending',
          payload: { 
            actionType: lower.includes('date') ? 'date' : 'text',
            column: targetHeader,
            params: lower.includes('date') ? { dateFormat: lower.includes('us') ? 'MM/DD/YYYY' : 'YYYY-MM-DD' } : { action: 'trim' }
          }
        });
      }
    }

    // Step detection: KPI Creation
    if (lower.includes('kpi') && (lower.includes('create') || lower.includes('add'))) {
      const targetHeader = dataset.headers.find(h => lower.includes(h.toLowerCase()));
      if (targetHeader) {
        steps.push({
          id: 'step-kpi',
          label: `Create KPI for "${targetHeader}"`,
          action: 'kpi_create',
          status: 'pending',
          payload: { name: `Metric: ${targetHeader}`, column: targetHeader, aggregation: 'sum' }
        });
      }
    }

    // Step detection: Navigation
    if (lower.includes('show') || lower.includes('view') || lower.includes('result')) {
      steps.push({
        id: 'step-nav',
        label: 'Navigate to result view',
        action: 'navigation',
        status: 'pending',
        payload: { target: lower.includes('clean') ? 'explorer' : 'dashboards' }
      });
    }

    // Step detection: Dashboard
    if (lower.includes('dashboard') && (lower.includes('add') || lower.includes('create'))) {
      steps.push({
        id: 'step-dash',
        label: 'Update dashboard with new insights',
        action: 'dashboard_add',
        status: 'pending',
        payload: { title: 'Auto-Generated Insights' }
      });
    }

    if (steps.length > 1) {
      return {
        intent: 'ACTION_PLAN',
        datasetId: dataset.id,
        datasetName: dataset.name,
        title: 'Multi-Step Orchestration Plan',
        actionPlan: {
          title: 'Orchestrated Workflow',
          steps
        }
      };
    }
  }

  // 0. NAVIGATION INTENT
  if (lower.startsWith('open') || lower.startsWith('go to') || lower.startsWith('show me the') || lower.startsWith('view')) {
    let target: string | null = null;
    if (lower.includes('clean')) target = 'cleaning';
    else if (lower.includes('explorer') || lower.includes('table') || lower.includes('data view')) target = 'explorer';
    else if (lower.includes('dashboard')) target = 'dashboards';
    else if (lower.includes('relationship')) target = 'relationships';
    else if (lower.includes('kpi builder') || (lower.includes('kpi') && lower.includes('build'))) target = 'kpi-builder';
    else if (lower.includes('report') || lower.includes('mis')) target = 'mis-report';
    else if (lower.includes('dictionary') || lower.includes('metadata')) target = 'data-dictionary';
    else if (lower.includes('manager')) target = 'data-manager';

    if (target) {
      return {
        intent: 'NAVIGATION',
        datasetId: dataset.id,
        datasetName: dataset.name,
        title: `Navigation to ${target}`,
        navigationTarget: target
      };
    }
  }

  // 0.1 KPI CREATION INTENT
  if (lower.includes('create a kpi') || lower.includes('add a kpi') || lower.includes('new kpi')) {
    const targetHeader = dataset.headers.find(h => lower.includes(h.toLowerCase()));
    if (targetHeader) {
      let agg: string = 'sum';
      if (lower.includes('avg') || lower.includes('average')) agg = 'avg';
      else if (lower.includes('count')) agg = 'count';

      return {
        intent: 'ACTION_KPI_CREATE',
        datasetId: dataset.id,
        datasetName: dataset.name,
        title: `Create KPI for ${targetHeader}`,
        kpiCreation: {
          name: `${agg.toUpperCase()} of ${targetHeader}`,
          column: targetHeader,
          aggregation: agg,
          description: `Automatically created via AI Copilot for ${targetHeader}`
        }
      };
    }
  }

  // 1. ACTIONABLE CLEANING INTENT
  if (
    lower.includes('convert') || 
    lower.includes('format') || 
    lower.includes('standardize') || 
    lower.includes('trim') ||
    lower.includes('lowercase') ||
    lower.includes('uppercase') ||
    lower.includes('titlecase') ||
    lower.includes('remove nulls') ||
    lower.includes('fill nulls') ||
    lower.includes('drop outliers') ||
    (lower.includes('clean') && dataset.headers.some(h => lower.includes(h.toLowerCase())))
  ) {
    const targetHeader = dataset.headers.find(h => lower.includes(h.toLowerCase()));
    
    if (targetHeader) {
      let actionType: ActionableCleaningPreview['actionType'] = 'issue';
      let params: any = {};
      let description = '';
      let sampleBefore: string[] = [];
      let sampleAfter: string[] = [];

      const profile = dataset.columnProfiles?.[targetHeader];
      const samples = dataset.fullData.slice(0, 3).map(r => String(r[targetHeader] || 'null'));

      if (lower.includes('date') || lower.includes('format') || lower.includes('standardize')) {
        actionType = 'date';
        params = { dateFormat: lower.includes('us') ? 'MM/DD/YYYY' : lower.includes('eu') ? 'DD/MM/YYYY' : 'YYYY-MM-DD' };
        description = `Standardize "${targetHeader}" to ${params.dateFormat} format.`;
        sampleBefore = samples;
        sampleAfter = samples.map(s => {
          const d = new Date(s);
          if (isNaN(d.getTime())) return 'null';
          if (params.dateFormat === 'MM/DD/YYYY') return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
          return d.toISOString().split('T')[0];
        });
      } else if (lower.includes('trim') || lower.includes('whitespace')) {
        actionType = 'text';
        params = { action: 'trim' };
        description = `Trim leading and trailing whitespace from "${targetHeader}".`;
        sampleBefore = samples.map(s => ` "${s}" `);
        sampleAfter = samples;
      } else if (lower.includes('lowercase') || lower.includes('uppercase') || lower.includes('title')) {
        actionType = 'text';
        const action = lower.includes('lower') ? 'lowercase' : lower.includes('upper') ? 'uppercase' : 'titlecase';
        params = { action };
        description = `Convert "${targetHeader}" to ${action}.`;
        sampleBefore = samples;
        sampleAfter = samples.map(s => action === 'lowercase' ? s.toLowerCase() : action === 'uppercase' ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
      } else if (lower.includes('null') || lower.includes('missing')) {
        actionType = 'nulls';
        const strategy = lower.includes('drop') ? 'drop' : lower.includes('zero') ? 'zero' : lower.includes('mean') ? 'mean' : 'mode';
        params = { strategy };
        description = `${strategy === 'drop' ? 'Drop rows with' : 'Fill'} nulls in "${targetHeader}" using ${strategy} strategy.`;
        sampleBefore = samples;
        sampleAfter = samples.map(s => s === 'null' ? (strategy === 'zero' ? '0' : 'Calculated Value') : s);
      }

      return {
        intent: 'ACTIONABLE_CLEANING',
        datasetId: dataset.id,
        datasetName: dataset.name,
        title: `Requested Cleaning Action: ${targetHeader}`,
        cleaningAction: {
          actionType,
          column: targetHeader,
          params,
          description,
          affectedRowCount: profile?.nullCount || dataset.rowCount,
          sampleBefore,
          sampleAfter
        }
      };
    }
  }

  // 1. DATA QUALITY INTENT (READ-ONLY)
  if (
    lower.includes('clean') || 
    lower.includes('quality') || 
    lower.includes('health') || 
    lower.includes('null') || 
    lower.includes('missing') || 
    lower.includes('duplicate') || 
    lower.includes('invalid') || 
    lower.includes('issue')
  ) {
    const colProfiles = Object.values(dataset.columnProfiles || {});
    const nullCells = colProfiles.reduce((acc, p) => acc + (p.nullCount || 0), 0);
    const totalCells = (dataset.rowCount || dataset.fullData.length) * (dataset.headers.length || 1);
    const missingPercent = totalCells > 0 ? (nullCells / totalCells) * 100 : 0;

    // Check duplicates
    const rowStrings = new Set<string>();
    let duplicateCount = 0;
    for (const r of dataset.fullData.slice(0, 1000)) {
      const s = JSON.stringify(r);
      if (rowStrings.has(s)) duplicateCount++;
      else rowStrings.add(s);
    }

    const healthSummary = calculateDatasetHealth(dataset);

    return {
      intent: 'DATA_QUALITY',
      datasetId: dataset.id,
      datasetName: dataset.name,
      title: `Data Health Assessment for ${dataset.name}`,
      qualityDetails: {
        healthScore: healthSummary.score,
        totalRows: dataset.rowCount || dataset.fullData.length,
        missingCount: healthSummary.missingCells,
        missingPercent: healthSummary.missingCellsPercentage,
        duplicateCount: healthSummary.duplicateRows,
        invalidDateCount: healthSummary.issueBreakdown.invalidDatesCount,
        pendingIssuesCount: healthSummary.issuesCount,
        issuesList: (dataset.issues || []).filter(i => i.status === 'pending').map(i => ({ title: i.title, risk: i.riskLevel, affectedRows: i.affectedRowCount }))
      }
    };
  }

  // 2. DASHBOARD INTENT
  if (lower.includes('dashboard') || lower.includes('widget') || lower.includes('explain this dashboard')) {
    const activeDash = dashboards.find(d => d.id === activeDashboardId) || dashboards[0];
    if (activeDash) {
      const widgetSummaries = activeDash.widgets.map(w => {
        const val = executeAnalysis([dataset], {
          type: 'aggregation',
          datasetId: dataset.id,
          metrics: [{ column: w.yAxisColumn || dataset.headers[0], aggregation: (w.aggregation as any) || 'sum' }],
          dimensions: w.xAxisColumn ? [w.xAxisColumn] : undefined
        });
        const topVal = Array.isArray(val) && val[0] ? JSON.stringify(val[0]) : 'N/A';
        return {
          title: w.title,
          type: w.type,
          valueOrResult: topVal
        };
      });

      return {
        intent: 'DASHBOARD',
        datasetId: dataset.id,
        datasetName: dataset.name,
        title: `Dashboard Context: ${activeDash.title}`,
        dashboardDetails: {
          title: activeDash.title,
          widgetsCount: activeDash.widgets.length,
          activeFilters: (activeDash.filters || []).map(f => `${f.column} ${f.operator} ${f.value}`),
          widgetsSummary: widgetSummaries
        }
      };
    }
  }

  // 2.1 MIS INTENT
  if (lower.includes('mis') || lower.includes('report')) {
    const savedReports = await getSavedMisReports();
    const activeReport = savedReports[0]; // Simplified for now

    return {
      intent: 'MIS',
      datasetId: dataset.id,
      datasetName: dataset.name,
      title: 'MIS Reporting Context',
      misDetails: {
        totalReports: savedReports.length,
        activeReport: activeReport?.title,
        lastGenerated: activeReport ? new Date(activeReport.updatedAt).toLocaleDateString() : undefined
      }
    };
  }

  // 3. KPI INTENT
  if (lower.includes('kpi') || lower.includes('profit margin') || lower.includes('metric') || lower.includes('target')) {
    const savedKpis = await getSavedKpis();
    const datasetKpis = savedKpis.filter(k => k.datasetId === dataset.id || !k.datasetId);

    const evaluatedKpis = datasetKpis.map(kpi => {
      const evalRes = evaluateKpi(kpi, [dataset], savedKpis);
      return {
        id: kpi.id,
        name: kpi.name,
        formula: evalRes.formulaSummary || kpi.column || 'Custom Formula',
        formattedValue: evalRes.formattedResult,
        rawValue: evalRes.rawResult,
        status: evalRes.status,
        statusReason: evalRes.statusReason,
        errors: evalRes.errors
      };
    });

    return {
      intent: 'KPI',
      datasetId: dataset.id,
      datasetName: dataset.name,
      title: `KPI Engine Evaluation (${datasetKpis.length} Saved KPIs)`,
      kpiDetails: evaluatedKpis
    };
  }

  // 4. COLUMN EXPLANATION INTENT
  if (lower.includes('column') || lower.includes('field') || lower.includes('what does') || lower.includes('meaning of')) {
    const metaMap = await getSavedColumnMetadata();
    const targetHeader = dataset.headers.find(h => lower.includes(h.toLowerCase())) || dataset.headers[0];
    const profile = dataset.columnProfiles?.[targetHeader];
    const meta = metaMap[`${dataset.id}::${targetHeader}`];

    const techType = normalizeTechnicalType(profile?.type);
    const nullCount = profile?.nullCount || 0;
    const totalRows = dataset.rowCount || dataset.fullData.length;
    const completenessPercent = totalRows > 0 ? Math.max(0, Math.min(100, ((totalRows - nullCount) / totalRows) * 100)) : 100;
    
    const sampleValues = dataset.fullData.map(r => r[targetHeader]).filter(v => v !== null && v !== undefined && v !== '').slice(0, 5).map(String);

    return {
      intent: 'COLUMN',
      datasetId: dataset.id,
      datasetName: dataset.name,
      title: `Data Dictionary Metadata for [${targetHeader}]`,
      columnDetails: {
        columnName: targetHeader,
        technicalType: techType,
        semanticType: (meta?.semanticTypeOverride as any) || inferSemanticType(targetHeader, techType, profile?.uniqueCount || 0, totalRows, sampleValues),
        description: meta?.description || 'Standard field',
        completenessPercent,
        nullCount,
        uniqueCount: profile?.uniqueCount || 0,
        sampleValues,
        usedInCount: meta?.tags?.length || 0
      }
    };
  }

  // 5. NUMERIC CALCULATIONS (DESCRIPTIVE, COMPARATIVE, RANKING, TREND)
  const { measureCols, dimensionCols, dateCols } = findMatchingColumns(dataset, message);

  // Check if current or previous state contains metric/dimension
  const targetMetric = measureCols.find(m => lower.includes(m.toLowerCase())) || previousMetric || measureCols[0];
  const targetDimension = dimensionCols.find(d => lower.includes(d.toLowerCase())) || 
    (dateCols.length > 0 && (lower.includes('trend') || lower.includes('time') || lower.includes('month') || lower.includes('year') || lower.includes('date')) ? dateCols[0] : previousDimension) || 
    dimensionCols[0];

  // Aggregation type determination
  let aggType: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum';
  if (lower.includes('average') || lower.includes('avg') || lower.includes('mean')) aggType = 'avg';
  else if (lower.includes('count') || lower.includes('number of')) aggType = 'count';
  else if (lower.includes('minimum') || lower.includes('min') || lower.includes('lowest')) aggType = 'min';
  else if (lower.includes('maximum') || lower.includes('max') || lower.includes('highest') || lower.includes('top')) aggType = lower.includes('highest') || lower.includes('top') ? 'max' : 'sum';

  if (targetMetric && targetDimension) {
    // Execute Deterministic Aggregation Group By
    const groupResult = executeAnalysis([dataset], {
      type: 'aggregation',
      datasetId: dataset.id,
      metrics: [{ column: targetMetric, aggregation: aggType }],
      dimensions: [targetDimension]
    });

    if (Array.isArray(groupResult) && groupResult.length > 0) {
      const metricKey = `${aggType}_${targetMetric}`;
      const sortedRows = [...groupResult].sort((a, b) => (Number(b[metricKey]) || 0) - (Number(a[metricKey]) || 0));
      const topRows = sortedRows.slice(0, 10);

      const topItem = topRows[0];
      const summaryText = topItem ? `Highest ${targetDimension}: ${topItem[targetDimension]} with ${aggType.toUpperCase()}(${targetMetric}) = ${Number(topItem[metricKey]).toLocaleString()}` : '';

      return {
        intent: lower.includes('trend') ? 'TREND' : 'COMPARATIVE',
        datasetId: dataset.id,
        datasetName: dataset.name,
        title: `${aggType.toUpperCase()}(${targetMetric}) grouped by ${targetDimension}`,
        metricName: targetMetric,
        dimensionName: targetDimension,
        summaryText,
        headers: [targetDimension, `${aggType.toUpperCase()}(${targetMetric})`],
        rows: topRows.map(r => ({
          [targetDimension]: r[targetDimension],
          [metricKey]: typeof r[metricKey] === 'number' ? Math.round(r[metricKey] * 100) / 100 : r[metricKey]
        })),
        recommendedWidget: {
          title: `${targetMetric.replace(/_/g, ' ')} by ${targetDimension.replace(/_/g, ' ')}`,
          type: dateCols.includes(targetDimension) || lower.includes('trend') ? 'line' : 'bar',
          datasetId: dataset.id,
          xAxisColumn: targetDimension,
          yAxisColumn: targetMetric,
          aggregation: aggType
        }
      };
    }
  }

  // Overall single metric calculation fallback
  if (targetMetric) {
    const singleResult = executeAnalysis([dataset], {
      type: 'aggregation',
      datasetId: dataset.id,
      metrics: [{ column: targetMetric, aggregation: aggType }]
    });

    if (Array.isArray(singleResult) && singleResult[0]) {
      const metricKey = `${aggType}_${targetMetric}`;
      const val = singleResult[0][metricKey];

      return {
        intent: 'DESCRIPTIVE',
        datasetId: dataset.id,
        datasetName: dataset.name,
        title: `Overall ${aggType.toUpperCase()} of ${targetMetric}`,
        metricName: targetMetric,
        summaryText: `Total ${aggType.toUpperCase()}(${targetMetric}): ${typeof val === 'number' ? val.toLocaleString() : val}`,
        rows: [{ Metric: targetMetric, Aggregation: aggType.toUpperCase(), Value: val }]
      };
    }
  }

  return null;
}
