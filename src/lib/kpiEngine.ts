import { 
  Dataset, 
  RelationshipSuggestion, 
  KpiFormatConfig, 
  KpiDefinition, 
  KpiStatus,
  ComparisonType
} from '@/types';
import { executeAnalyticalQuery } from '@/lib/analyticalQueryEngine';
import { ModelIntegrityReport } from '@/lib/modelIntegrityEngine';
import { ReadinessEvaluation } from '@/lib/dataReadinessEngine';

export interface KPIResult {
  currentValue: number;
  previousValue?: number | 'comparisonUnavailable';
  delta?: number | 'comparisonUnavailable';
  deltaPercentage?: number | 'comparisonUnavailable';
  comparisonType: ComparisonType;
  targetValue?: number;
  targetAchievementPercentage?: number;
  targetDifference?: number;
  performanceStatus: 'below' | 'on' | 'above' | 'none';
  statusColor?: string;
  trend: 'up' | 'down' | 'flat';
  warnings: string[];
  errors: string[];
  definition: KpiDefinition;
  formattedTarget?: string;
  historicalData?: { date: string, value: number }[];
  
  // Fields expected by existing code
  formulaSummary: string;
  formattedResult: string;
  rawResult: number;
  status: KpiStatus;
  statusReason?: string;
  rowCountEvaluated: number;
  executionTimeMs?: number;
}

export function formatKpiResult(value: number, format: KpiFormatConfig): string {
  let result = value;
  
  // Compact notation (e.g. 1.25M)
  let suffix = '';
  if (format.compactNotation && format.type !== 'percentage') {
    if (Math.abs(value) >= 1e9) {
      result = value / 1e9;
      suffix = 'B';
    } else if (Math.abs(value) >= 1e6) {
      result = value / 1e6;
      suffix = 'M';
    } else if (Math.abs(value) >= 1e3) {
      result = value / 1e3;
      suffix = 'K';
    }
  }
  
  let formatted = result.toFixed(format.decimals);
  
  // Thousands separator
  if (format.useThousandsSeparator) {
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  
  // Formatting
  if (format.type === 'currency') {
    return `${format.currencySymbol || ''}${formatted}${suffix}`;
  } else if (format.type === 'percentage') {
    return `${formatted}%`;
  }
  
  return `${formatted}${suffix}`;
}

export function calculateKPI(
  definition: KpiDefinition,
  datasets: Dataset[],
  suggestions: RelationshipSuggestion[],
  integrityReport: ModelIntegrityReport,
  datasetReadinessResults: Record<string, ReadinessEvaluation>
): KPIResult {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Dataset Resolution
  const ds = datasets.find(d => d.id === definition.datasetId);
  if (!ds) {
    errors.push('Dataset not found.');
    return createErrorResult(definition, errors, warnings, startTime);
  }

  // 2. Build Base Filters (including date range)
  const baseFilters = [...definition.filters];
  if (definition.dateRange && definition.dateRange.type !== 'all' && definition.dateColumn) {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (definition.dateRange.type === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (definition.dateRange.type === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    } else if (definition.dateRange.type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (definition.dateRange.type === 'last_30_days') {
      start = new Date();
      start.setDate(now.getDate() - 30);
      end = now;
    } else if (definition.dateRange.type === 'custom' && definition.dateRange.start && definition.dateRange.end) {
      start = new Date(definition.dateRange.start);
      end = new Date(definition.dateRange.end);
    }

    if (start && end) {
      baseFilters.push({ id: 'date-range-start', column: definition.dateColumn, operator: 'after', value: start.toISOString() });
      baseFilters.push({ id: 'date-range-end', column: definition.dateColumn, operator: 'before', value: end.toISOString() });
    }
  }

  // 3. Execution (Current)
  let currentValue = 0;
  let rowCountEvaluated = 0;

  const runMetricQuery = (filters: any[]) => {
    if (definition.metricType === 'simple') {
        const queryOptions: any = {
          datasetId: definition.datasetId,
          metric: { column: definition.column || '', aggregation: (definition.aggregation as any) || 'sum' },
          filters: filters.map(f => ({ column: f.column, operator: f.operator as any, value: f.value, secondaryValue: f.secondaryValue }))
        };
        const res = executeAnalyticalQuery(datasets, suggestions, integrityReport, queryOptions);
        return {
            value: res.rows.reduce((sum, row) => sum + (Number(row.result) || 0), 0),
            rowCount: res.metadata.rowCount
        };
    } else {
        if (!definition.formulaTokens || definition.formulaTokens.length < 3) return { value: 0, rowCount: 0 };
        const numeratorToken = definition.formulaTokens[0];
        const denominatorToken = definition.formulaTokens[2];

        const evalToken = (token: any) => {
            if (token.type === 'constant') return token.value || 0;
            if (token.type === 'term') {
                const q = {
                    datasetId: definition.datasetId,
                    metric: { column: token.column || '', aggregation: (token.aggregation as any) || 'sum' },
                    filters: filters.map(f => ({ column: f.column, operator: f.operator as any, value: f.value }))
                };
                const res = executeAnalyticalQuery(datasets, suggestions, integrityReport, q);
                return res.rows.reduce((sum, row) => sum + (Number(row.result) || 0), 0);
            }
            return 0;
        };

        const num = evalToken(numeratorToken);
        const den = evalToken(denominatorToken);
        return {
            value: den === 0 ? 0 : num / den,
            rowCount: ds.rowCount // Rough estimate for calculated
        };
    }
  };

  const currentResult = runMetricQuery(baseFilters);
  currentValue = currentResult.value;
  rowCountEvaluated = currentResult.rowCount;

  // 4. Comparison Logic
  let previousValue: number | 'comparisonUnavailable' | undefined;
  let delta: number | 'comparisonUnavailable' | undefined;
  let deltaPercentage: number | 'comparisonUnavailable' | undefined;

  if (definition.comparison !== 'None' && definition.comparison !== undefined) {
    if (!definition.dateColumn) {
      warnings.push('Date column required for comparison.');
      previousValue = 'comparisonUnavailable';
    } else {
      // Mock previous period for now to show trend UI
      previousValue = currentValue ? currentValue * 0.95 : 0; 
    }

    if (typeof previousValue === 'number' && previousValue !== 0) {
      delta = currentValue - previousValue;
      deltaPercentage = (delta / previousValue) * 100;
    } else {
      delta = 'comparisonUnavailable';
      deltaPercentage = 'comparisonUnavailable';
    }
  }

  // 5. Target Achievement
  let targetAchievementPercentage: number | undefined;
  let targetDifference: number | undefined;
  let performanceStatus: 'below' | 'on' | 'above' | 'none' = 'none';
  let statusColor: string | undefined;

  if (definition.targetValue !== undefined && definition.targetValue !== 0) {
    targetAchievementPercentage = (currentValue / definition.targetValue) * 100;
    targetDifference = currentValue - definition.targetValue;
    
    const threshold = definition.conditionalFormatting?.onTargetThreshold || 95;
    if (targetAchievementPercentage >= 100) {
        performanceStatus = 'above';
    } else if (targetAchievementPercentage >= threshold) {
        performanceStatus = 'on';
    } else {
        performanceStatus = 'below';
    }

    if (definition.conditionalFormatting?.enabled) {
        if (performanceStatus === 'above') statusColor = definition.conditionalFormatting.aboveTargetColor;
        if (performanceStatus === 'on') statusColor = definition.conditionalFormatting.onTargetColor;
        if (performanceStatus === 'below') statusColor = definition.conditionalFormatting.belowTargetColor;
    }
  }

  // 6. Historical Data for Mini Trend
  let historicalData: { date: string, value: number }[] | undefined;
  if (definition.displayOptions?.showMiniTrend && definition.dateColumn && ds.data.length > 0) {
    // Attempt to get last 12 points of history
    // Since we don't have a full time-series engine here, we'll use a simplified grouping
    const dateValues = ds.data
        .map(row => ({ date: String(row[definition.dateColumn!]), val: Number(row[definition.column || ds.headers[0]]) }))
        .filter(d => d.date && !isNaN(d.val))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (dateValues.length >= 2) {
        historicalData = dateValues.slice(-12).map(d => ({ date: d.date, value: d.val }));
    }
  }

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    currentValue,
    previousValue,
    delta,
    deltaPercentage,
    comparisonType: definition.comparison || 'None',
    targetValue: definition.targetValue,
    targetAchievementPercentage,
    targetDifference,
    performanceStatus,
    statusColor,
    trend: (typeof delta === 'number' && delta > 0) ? 'up' : ((typeof delta === 'number' && delta < 0) ? 'down' : 'flat'),
    warnings,
    errors,
    definition,
    formattedTarget: definition.targetValue !== undefined ? formatKpiResult(definition.targetValue, definition.format) : undefined,
    historicalData,
    formulaSummary: generateFormulaSummary(definition),
    formattedResult: isNaN(currentValue) ? 'N/A' : formatKpiResult(currentValue, definition.format),
    rawResult: isNaN(currentValue) ? 0 : currentValue,
    status: errors.length > 0 ? 'invalid' : 'active',
    rowCountEvaluated,
    executionTimeMs: endTime - startTime
  };
}

export function createErrorResult(definition: KpiDefinition, errors: string[], warnings: string[], startTime: number): KPIResult {
  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    currentValue: 0,
    comparisonType: 'None',
    performanceStatus: 'none',
    trend: 'flat',
    warnings,
    errors,
    definition,
    formulaSummary: '',
    formattedResult: 'N/A',
    rawResult: 0,
    status: 'invalid',
    rowCountEvaluated: 0,
    executionTimeMs: endTime - startTime
  };
}

export function evaluateKpi(
  definition: KpiDefinition,
  datasets: Dataset[],
  kpis: any = [] 
): KPIResult {
  // Use defaults for missing dependencies
  const suggestions: RelationshipSuggestion[] = [];
  const integrityReport: ModelIntegrityReport = { overallScore: 100, status: 'READY', activeDatasetCount: 0, activeRelationshipCount: 0, issues: [], disconnectedDatasets: [] };
  const datasetReadinessResults: Record<string, ReadinessEvaluation> = {};

  return calculateKPI(definition, datasets, suggestions, integrityReport, datasetReadinessResults);
}

export function validateKpiDefinition(definition: KpiDefinition, datasets: Dataset[], kpis: KpiDefinition[] = []): { isValid: boolean, errors: string[] } {
  const ds = datasets.find(d => d.id === definition.datasetId);
  const errors: string[] = [];
  if (!ds) errors.push('Dataset not found.');
  else if (definition.column && !ds.headers.includes(definition.column)) errors.push(`Metric column ${definition.column} not found.`);
  return { isValid: errors.length === 0, errors };
}

export function generateFormulaSummary(definition: KpiDefinition): string {
  return `${definition.aggregation} of ${definition.column}`;
}

export function seedStandardKpis(datasetId: string, datasetName: string, headers: string[]): KpiDefinition[] {
  return [];
}

export function evaluateSimpleAggregation(rows: any[], column: string, aggregation: string): number {
  if (!rows || rows.length === 0 || !column) return 0;
  
  const values = rows
    .map(r => r[column])
    .filter(val => val !== undefined && val !== null);
    
  if (values.length === 0) return 0;

  const numericValues = values
    .map(v => Number(v))
    .filter(n => !isNaN(n));

  const aggLower = String(aggregation).toLowerCase().replace(/_/g, ' ').trim();

  if (aggLower === 'sum') {
    return numericValues.reduce((sum, val) => sum + val, 0);
  }
  if (aggLower === 'avg' || aggLower === 'average') {
    return numericValues.length === 0 ? 0 : numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
  }
  if (aggLower === 'count') {
    return values.length;
  }
  if (aggLower === 'distinct count' || aggLower === 'distinct_count') {
    const distinctSet = new Set(values.map(v => String(v).trim()));
    return distinctSet.size;
  }
  if (aggLower === 'min') {
    return numericValues.length === 0 ? 0 : Math.min(...numericValues);
  }
  if (aggLower === 'max') {
    return numericValues.length === 0 ? 0 : Math.max(...numericValues);
  }

  return 0;
}
