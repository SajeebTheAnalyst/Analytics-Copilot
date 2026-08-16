import { Dataset, KpiDefinition, Dashboard, MisReportConfig } from '@/types';
import { ColumnMetadata } from './dataDictionaryStorage';

export type QualityStatus = 'Healthy' | 'Needs Attention' | 'Critical';
export type SemanticType = 'Identifier' | 'Date' | 'Currency' | 'Percentage' | 'Measure' | 'Dimension' | 'Category' | 'Free Text';
export type TechnicalDataType = 'Text' | 'Numeric' | 'Date' | 'Boolean' | 'Categorical';

export interface ColumnUsageReference {
  type: 'KPI' | 'Dashboard' | 'MIS Report';
  name: string;
  detail?: string;
}

export interface ColumnStatistics {
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  minDate?: string;
  maxDate?: string;
  topValues?: Array<{ value: string; count: number; percent: number }>;
}

export interface DictionaryColumnItem {
  key: string;
  datasetId: string;
  datasetName: string;
  columnName: string;
  technicalType: TechnicalDataType;
  semanticType: SemanticType;
  completenessPercent: number;
  nullCount: number;
  uniqueCount: number;
  totalRows: number;
  distinctRatioPercent: number;
  sampleValues: string[];
  status: QualityStatus;
  description: string;
  businessNotes: string;
  tags: string[];
  isStale: boolean;
  statistics: ColumnStatistics;
  usedIn: ColumnUsageReference[];
  detectedSemanticType?: string;
  detectedGranularity?: string;
}

/**
 * Infer Semantic Type with robust heuristics
 */
export function inferSemanticType(
  columnName: string,
  techType: TechnicalDataType,
  uniqueCount: number,
  totalRows: number,
  samples: any[]
): SemanticType {
  const colLower = columnName.toLowerCase().trim();

  // Identifier pattern check
  const idKeywords = ['id', 'uuid', 'code', 'sku', 'key', '_id', 'ssn', 'number', 'num'];
  if (idKeywords.some(kw => colLower === kw || colLower.endsWith(`_${kw}`) || colLower.endsWith(` ${kw}`))) {
    return 'Identifier';
  }
  if (totalRows > 10 && uniqueCount === totalRows && techType !== 'Numeric' && techType !== 'Date') {
    return 'Identifier';
  }

  // Date check
  if (techType === 'Date' || ['date', 'time', 'created', 'updated', 'timestamp', 'month', 'year', 'day'].some(kw => colLower.includes(kw))) {
    return 'Date';
  }

  // Currency check
  const currencyKeywords = ['price', 'amount', 'revenue', 'profit', 'sales', 'cost', 'fee', 'tax', 'total', 'margin', 'discount', 'budget', 'salary', 'earning', 'gdp'];
  if (currencyKeywords.some(kw => colLower.includes(kw))) {
    return 'Currency';
  }

  // Percentage check
  const pctKeywords = ['percent', 'pct', 'rate', 'ratio', '%', 'margin_pct', 'growth', 'share'];
  if (pctKeywords.some(kw => colLower.includes(kw))) {
    return 'Percentage';
  }

  // Numeric Measure check
  if (techType === 'Numeric') {
    return 'Measure';
  }

  // Category / Dimension check
  if (techType === 'Categorical' || techType === 'Boolean' || uniqueCount <= 30) {
    return 'Category';
  }

  if (techType === 'Text' && uniqueCount > 30) {
    return 'Free Text';
  }

  return 'Dimension';
}

/**
 * Determine Data Quality Status
 */
export function calculateQualityStatus(completenessPercent: number): QualityStatus {
  if (completenessPercent >= 95) return 'Healthy';
  if (completenessPercent >= 80) return 'Needs Attention';
  return 'Critical';
}

/**
 * Map internal profile type to standardized Technical DataType
 */
export function normalizeTechnicalType(rawType?: string): TechnicalDataType {
  switch (rawType) {
    case 'numeric':
      return 'Numeric';
    case 'date':
      return 'Date';
    case 'boolean':
      return 'Boolean';
    case 'categorical':
      return 'Categorical';
    default:
      return 'Text';
  }
}

/**
 * Calculate column statistics (Min, Max, Mean, Median, Date range, Top Frequencies)
 */
export function computeColumnStatistics(
  dataRows: Record<string, any>[],
  columnName: string,
  techType: TechnicalDataType
): ColumnStatistics {
  const stats: ColumnStatistics = {};
  if (!dataRows || dataRows.length === 0) return stats;

  const validValues = dataRows
    .map(r => r[columnName])
    .filter(v => v !== null && v !== undefined && v !== '');

  if (validValues.length === 0) return stats;

  if (techType === 'Numeric') {
    const nums = validValues.map(v => Number(v)).filter(n => !isNaN(n) && isFinite(n));
    if (nums.length > 0) {
      nums.sort((a, b) => a - b);
      stats.min = nums[0];
      stats.max = nums[nums.length - 1];
      const sum = nums.reduce((acc, curr) => acc + curr, 0);
      stats.mean = Math.round((sum / nums.length) * 100) / 100;
      
      const mid = Math.floor(nums.length / 2);
      stats.median = nums.length % 2 !== 0 ? nums[mid] : Math.round(((nums[mid - 1] + nums[mid]) / 2) * 100) / 100;
    }
  } else if (techType === 'Date') {
    const dates = validValues
      .map(v => new Date(v))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length > 0) {
      stats.minDate = dates[0].toISOString().split('T')[0];
      stats.maxDate = dates[dates.length - 1].toISOString().split('T')[0];
      stats.min = stats.minDate;
      stats.max = stats.maxDate;
    }
  }

  // Top frequency distribution for all types
  const freqMap = new Map<string, number>();
  for (const val of validValues) {
    const strVal = String(val).trim();
    freqMap.set(strVal, (freqMap.get(strVal) || 0) + 1);
  }

  const sortedFreq = Array.from(freqMap.entries())
    .map(([value, count]) => ({
      value,
      count,
      percent: Math.round((count / validValues.length) * 1000) / 10
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  stats.topValues = sortedFreq;

  return stats;
}

/**
 * Derive usage references across Saved KPIs, Dashboards, and MIS Reports
 */
export function deriveColumnUsage(
  datasetId: string,
  columnName: string,
  savedKpis: KpiDefinition[],
  dashboards: Dashboard[],
  misReports: MisReportConfig[]
): ColumnUsageReference[] {
  const usage: ColumnUsageReference[] = [];

  // 1. Saved KPIs
  for (const kpi of savedKpis) {
    if (kpi.datasetId === datasetId) {
      let isUsed = false;
      if (kpi.column === columnName) isUsed = true;
      if (kpi.formulaTokens?.some(t => t.column === columnName)) isUsed = true;
      if (kpi.filters?.some(f => f.column === columnName)) isUsed = true;

      if (isUsed) {
        usage.push({ type: 'KPI', name: kpi.name, detail: `Used in KPI calculation` });
      }
    }
  }

  // 2. Dashboards
  for (const dash of dashboards) {
    let isUsedInDash = false;
    for (const w of dash.widgets || []) {
      if (w.datasetId === datasetId || dash.datasetId === datasetId) {
        if (w.xAxisColumn === columnName || w.yAxisColumn === columnName) {
          isUsedInDash = true;
          break;
        }
        if (w.filter?.column === columnName || w.filters?.some(f => f.column === columnName)) {
          isUsedInDash = true;
          break;
        }
      }
    }
    if (!isUsedInDash && dash.filters?.some(f => f.column === columnName && (f.datasetId === datasetId || !f.datasetId))) {
      isUsedInDash = true;
    }

    if (isUsedInDash) {
      usage.push({ type: 'Dashboard', name: dash.title, detail: `Visual widget/filter dimension` });
    }
  }

  // 3. MIS Reports
  for (const report of misReports) {
    if (report.datasetId === datasetId) {
      let isUsedInReport = false;
      if (report.dateColumn === columnName) isUsedInReport = true;
      if (report.filters?.some(f => f.column === columnName)) isUsedInReport = true;

      if (isUsedInReport) {
        usage.push({ type: 'MIS Report', name: report.title, detail: `Report date/filter target` });
      }
    }
  }

  return usage;
}

/**
 * Export Dictionary Metadata to CSV string
 */
export function exportDictionaryToCsv(columns: DictionaryColumnItem[]): string {
  const headers = [
    'Column Name',
    'Dataset Name',
    'Data Type',
    'Semantic Type',
    'Description',
    'Completeness (%)',
    'Missing Count',
    'Unique Count',
    'Status',
    'Tags',
    'Business Notes'
  ];

  const escapeCsv = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = columns.map(col => [
    escapeCsv(col.columnName),
    escapeCsv(col.datasetName),
    escapeCsv(col.technicalType),
    escapeCsv(col.semanticType),
    escapeCsv(col.description || 'N/A'),
    escapeCsv(`${col.completenessPercent.toFixed(1)}%`),
    escapeCsv(col.nullCount),
    escapeCsv(col.uniqueCount),
    escapeCsv(col.status),
    escapeCsv(col.tags.join(', ') || 'None'),
    escapeCsv(col.businessNotes || 'N/A')
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
