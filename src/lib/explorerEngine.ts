import { ColumnFilter, SortRule, GroupingConfig, ColumnProfile, Dataset } from '@/types';
import { isValid, parseISO } from 'date-fns';

export interface ColumnStatsResult {
  column: string;
  type: ColumnProfile['type'];
  totalCount: number;
  nonNullCount: number;
  nullCount: number;
  missingPercentage: number;
  uniqueCount: number;
  // Numeric
  min?: number | null;
  max?: number | null;
  sum?: number | null;
  mean?: number | null;
  median?: number | null;
  stdDev?: number | null;
  // Categorical / Text
  topValues?: { value: string; count: number; percentage: number }[];
  // Date
  minDate?: string | null;
  maxDate?: string | null;
}

export interface GroupResultRow {
  groupValue: string;
  metricValue: number;
  rowCount: number;
  percentageOfTotal: number;
}

export interface GroupAnalysisResult {
  groupByColumn: string;
  metricColumn: string;
  aggregation: string;
  totalMetricValue: number;
  totalRows: number;
  groups: GroupResultRow[];
}

/**
 * Filters rows based on global search term and active column filters.
 */
export function filterDataset(
  data: Record<string, any>[],
  filters: ColumnFilter[],
  searchTerm: string,
  visibleColumns?: string[]
): Record<string, any>[] {
  if (!data || data.length === 0) return [];

  let result = data;

  // 1. Global Search across text-compatible / visible columns
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase().trim();
    result = result.filter(row => {
      const keys = visibleColumns && visibleColumns.length > 0 ? visibleColumns : Object.keys(row);
      return keys.some(key => {
        const val = row[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }

  // 2. Column-level Structured Filters
  if (filters && filters.length > 0) {
    result = result.filter(row => {
      return filters.every(f => {
        const val = row[f.column];
        const valStr = val !== null && val !== undefined ? String(val).trim() : '';
        const lowerValStr = valStr.toLowerCase();
        const filterValStr = (f.value || '').toLowerCase().trim();

        switch (f.operator) {
          case 'equals':
            if (val === null || val === undefined) return false;
            if (!isNaN(Number(val)) && !isNaN(Number(f.value)) && f.value !== '') {
              return Number(val) === Number(f.value);
            }
            return lowerValStr === filterValStr;

          case 'does_not_equal':
            if (val === null || val === undefined) return true;
            if (!isNaN(Number(val)) && !isNaN(Number(f.value)) && f.value !== '') {
              return Number(val) !== Number(f.value);
            }
            return lowerValStr !== filterValStr;

          case 'contains':
            return lowerValStr.includes(filterValStr);

          case 'starts_with':
            return lowerValStr.startsWith(filterValStr);

          case 'ends_with':
            return lowerValStr.endsWith(filterValStr);

          case 'is_empty':
            return val === null || val === undefined || valStr === '';

          case 'is_not_empty':
            return val !== null && val !== undefined && valStr !== '';

          case 'greater_than': {
            if (val === null || val === undefined || valStr === '') return false;
            const numVal = Number(val);
            const targetNum = Number(f.value);
            return !isNaN(numVal) && !isNaN(targetNum) && numVal > targetNum;
          }

          case 'less_than': {
            if (val === null || val === undefined || valStr === '') return false;
            const numVal = Number(val);
            const targetNum = Number(f.value);
            return !isNaN(numVal) && !isNaN(targetNum) && numVal < targetNum;
          }

          case 'between': {
            if (val === null || val === undefined || valStr === '') return false;
            const numVal = Number(val);
            const targetLow = Number(f.value);
            const targetHigh = Number(f.secondaryValue);

            // Check if numeric between
            if (!isNaN(numVal) && !isNaN(targetLow) && !isNaN(targetHigh)) {
              return numVal >= Math.min(targetLow, targetHigh) && numVal <= Math.max(targetLow, targetHigh);
            }

            // Check if date between
            const dVal = new Date(val);
            const dLow = new Date(f.value);
            const dHigh = new Date(f.secondaryValue || '');
            if (isValid(dVal) && isValid(dLow) && isValid(dHigh)) {
              return dVal.getTime() >= dLow.getTime() && dVal.getTime() <= dHigh.getTime();
            }

            return false;
          }

          case 'before': {
            if (val === null || val === undefined || valStr === '') return false;
            const dVal = new Date(val);
            const dTarget = new Date(f.value);
            return isValid(dVal) && isValid(dTarget) && dVal.getTime() < dTarget.getTime();
          }

          case 'after': {
            if (val === null || val === undefined || valStr === '') return false;
            const dVal = new Date(val);
            const dTarget = new Date(f.value);
            return isValid(dVal) && isValid(dTarget) && dVal.getTime() > dTarget.getTime();
          }

          default:
            return true;
        }
      });
    });
  }

  return result;
}

/**
 * Sorts data based on multi-column sort rules without mutating the source.
 */
export function sortDataset(
  data: Record<string, any>[],
  sortRules: SortRule[]
): Record<string, any>[] {
  if (!data || data.length === 0 || !sortRules || sortRules.length === 0) {
    return data;
  }

  const sorted = [...data];

  sorted.sort((a, b) => {
    for (const rule of sortRules) {
      const aVal = a[rule.column];
      const bVal = b[rule.column];

      // Handle nulls / undefined (push nulls to end regardless of direction)
      const aIsNull = aVal === null || aVal === undefined || aVal === '';
      const bIsNull = bVal === null || bVal === undefined || bVal === '';

      if (aIsNull && bIsNull) continue;
      if (aIsNull) return 1;
      if (bIsNull) return -1;

      if (aVal === bVal) continue;

      let comparison = 0;

      // Numeric comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        comparison = Number(aVal) - Number(bVal);
      } else {
        // String comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) comparison = -1;
        else if (aStr > bStr) comparison = 1;
      }

      if (comparison !== 0) {
        return rule.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });

  return sorted;
}

/**
 * Calculates complete column statistics over the CURRENT FILTERED DATASET.
 */
export function calculateColumnStats(
  data: Record<string, any>[],
  column: string,
  colType: ColumnProfile['type']
): ColumnStatsResult {
  const totalCount = data.length;
  let nullCount = 0;
  const values: any[] = [];
  const freqMap: Record<string, number> = {};

  const nums: number[] = [];
  const dates: Date[] = [];

  for (const row of data) {
    const val = row[column];
    if (val === null || val === undefined || val === '') {
      nullCount++;
    } else {
      values.push(val);
      const strVal = String(val);
      freqMap[strVal] = (freqMap[strVal] || 0) + 1;

      if (colType === 'numeric') {
        const num = Number(val);
        if (!isNaN(num)) {
          nums.push(num);
        }
      } else if (colType === 'date') {
        const d = new Date(val);
        if (isValid(d) && !isNaN(d.getTime())) {
          dates.push(d);
        }
      }
    }
  }

  const nonNullCount = values.length;
  const missingPercentage = totalCount > 0 ? parseFloat(((nullCount / totalCount) * 100).toFixed(1)) : 0;
  const uniqueCount = Object.keys(freqMap).length;

  let min: number | null = null;
  let max: number | null = null;
  let sum: number | null = null;
  let mean: number | null = null;
  let median: number | null = null;
  let stdDev: number | null = null;

  if (colType === 'numeric' && nums.length > 0) {
    nums.sort((a, b) => a - b);
    min = nums[0];
    max = nums[nums.length - 1];
    sum = nums.reduce((acc, curr) => acc + curr, 0);
    mean = parseFloat((sum / nums.length).toFixed(2));

    const mid = Math.floor(nums.length / 2);
    if (nums.length % 2 === 0) {
      median = parseFloat(((nums[mid - 1] + nums[mid]) / 2).toFixed(2));
    } else {
      median = nums[mid];
    }

    // Standard deviation
    if (nums.length > 1) {
      const variance = nums.reduce((acc, curr) => acc + Math.pow(curr - mean!, 2), 0) / (nums.length - 1);
      stdDev = parseFloat(Math.sqrt(variance).toFixed(2));
    } else {
      stdDev = 0;
    }
    sum = parseFloat(sum.toFixed(2));
  }

  // Top values for categorical/text
  let topValues: { value: string; count: number; percentage: number }[] | undefined = undefined;
  if (colType !== 'numeric' && colType !== 'date') {
    topValues = Object.entries(freqMap)
      .map(([value, count]) => ({
        value,
        count,
        percentage: totalCount > 0 ? parseFloat(((count / totalCount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  // Min / Max Date
  let minDate: string | null = null;
  let maxDate: string | null = null;
  if (colType === 'date' && dates.length > 0) {
    dates.sort((a, b) => a.getTime() - b.getTime());
    minDate = dates[0].toISOString().split('T')[0];
    maxDate = dates[dates.length - 1].toISOString().split('T')[0];
  }

  return {
    column,
    type: colType || 'text',
    totalCount,
    nonNullCount,
    nullCount,
    missingPercentage,
    uniqueCount,
    min,
    max,
    sum,
    mean,
    median,
    stdDev,
    topValues,
    minDate,
    maxDate,
  };
}

/**
 * Calculates a single quick metric aggregation over filtered data.
 */
export function calculateQuickMetric(
  data: Record<string, any>[],
  column: string,
  aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max'
): { value: number | string; label: string } {
  if (!data || data.length === 0 || !column) {
    return { value: 0, label: aggregation.toUpperCase() };
  }

  const validValues: any[] = [];
  const nums: number[] = [];

  for (const row of data) {
    const val = row[column];
    if (val !== null && val !== undefined && val !== '') {
      validValues.push(val);
      const num = Number(val);
      if (!isNaN(num)) {
        nums.push(num);
      }
    }
  }

  switch (aggregation) {
    case 'sum': {
      const s = nums.reduce((acc, curr) => acc + curr, 0);
      return { value: Number(s.toFixed(2)), label: 'SUM' };
    }
    case 'avg': {
      if (nums.length === 0) return { value: 0, label: 'AVG' };
      const avg = nums.reduce((acc, curr) => acc + curr, 0) / nums.length;
      return { value: Number(avg.toFixed(2)), label: 'AVG' };
    }
    case 'count': {
      return { value: validValues.length, label: 'COUNT' };
    }
    case 'distinct_count': {
      const set = new Set(validValues.map(v => String(v)));
      return { value: set.size, label: 'DISTINCT COUNT' };
    }
    case 'min': {
      if (nums.length === 0) return { value: 'N/A', label: 'MIN' };
      return { value: Math.min(...nums), label: 'MIN' };
    }
    case 'max': {
      if (nums.length === 0) return { value: 'N/A', label: 'MAX' };
      return { value: Math.max(...nums), label: 'MAX' };
    }
    default:
      return { value: 0, label: 'COUNT' };
  }
}

/**
 * Performs Group & Analyze calculations over filtered data.
 */
export function calculateGroupAndAnalyze(
  data: Record<string, any>[],
  groupByColumn: string,
  metricColumn: string,
  aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max'
): GroupAnalysisResult {
  if (!data || data.length === 0 || !groupByColumn) {
    return {
      groupByColumn,
      metricColumn,
      aggregation,
      totalMetricValue: 0,
      totalRows: 0,
      groups: [],
    };
  }

  const groupMap: Record<string, any[]> = {};

  for (const row of data) {
    const keyVal = row[groupByColumn];
    const groupKey = keyVal !== null && keyVal !== undefined && String(keyVal).trim() !== '' 
      ? String(keyVal) 
      : '(Blank / Null)';

    if (!groupMap[groupKey]) {
      groupMap[groupKey] = [];
    }
    groupMap[groupKey].push(row);
  }

  const groupRows: GroupResultRow[] = [];
  let totalMetricValue = 0;

  for (const [groupValue, rows] of Object.entries(groupMap)) {
    const metricRes = calculateQuickMetric(rows, metricColumn, aggregation);
    const metricVal = typeof metricRes.value === 'number' ? metricRes.value : 0;
    totalMetricValue += metricVal;

    groupRows.push({
      groupValue,
      metricValue: metricVal,
      rowCount: rows.length,
      percentageOfTotal: 0,
    });
  }

  // Calculate percentage of total and sort descending by metricValue
  groupRows.sort((a, b) => b.metricValue - a.metricValue);

  const finalGroups = groupRows.map(g => ({
    ...g,
    percentageOfTotal: totalMetricValue > 0 ? parseFloat(((g.metricValue / totalMetricValue) * 100).toFixed(1)) : 0,
  }));

  return {
    groupByColumn,
    metricColumn,
    aggregation,
    totalMetricValue: Number(totalMetricValue.toFixed(2)),
    totalRows: data.length,
    groups: finalGroups,
  };
}

/**
 * Prepares concise structured analytical context for AI Explanation.
 */
export function compileAiContext(
  dataset: Dataset,
  filteredRows: Record<string, any>[],
  filters: ColumnFilter[],
  groupingConfig?: GroupingConfig | null,
  groupResult?: GroupAnalysisResult | null
) {
  const isFiltered = filters.length > 0 || filteredRows.length !== dataset.rowCount;

  const topGroupings = groupResult?.groups.slice(0, 5).map(g => (
    `${g.groupValue}: ${g.metricValue.toLocaleString()} (${g.percentageOfTotal}%, ${g.rowCount} rows)`
  )) || [];

  return {
    datasetName: dataset.name,
    totalRows: dataset.rowCount,
    filteredRowsCount: filteredRows.length,
    totalColumns: dataset.headers.length,
    isFiltered,
    activeFilters: filters.map(f => `${f.column} ${f.operator} ${f.value}${f.secondaryValue ? ` and ${f.secondaryValue}` : ''}`),
    grouping: groupingConfig ? {
      groupByColumn: groupingConfig.groupByColumn,
      metricColumn: groupingConfig.metricColumn,
      aggregation: groupingConfig.aggregation,
      topGroups: topGroupings,
    } : null,
  };
}
