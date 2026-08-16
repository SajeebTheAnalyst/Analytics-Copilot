import { Dataset, ColumnProfile } from '@/types';
import { isValid, parseISO } from 'date-fns';

export interface ExtendedColumnProfile extends ColumnProfile {
  missingPercentage: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
  median?: number | null;
  invalidDateCount?: number;
  minDate?: string | null;
  maxDate?: string | null;
}

export interface DatasetHealthSummary {
  score: number; // 0 - 100
  status: 'Healthy' | 'Needs Attention' | 'Critical';
  totalCells: number;
  missingCells: number;
  missingCellsPercentage: number;
  duplicateRows: number;
  duplicateRowsPercentage: number;
  issuesCount: number;
  issueBreakdown: {
    missingValuesColumns: number;
    duplicateRowsCount: number;
    invalidDatesCount: number;
    emptyColumnsCount: number;
  };
}

const profileCache = new Map<string, ExtendedColumnProfile>();

/**
 * Calculates complete column statistics for a single column.
 */
export function profileColumn(data: Record<string, any>[], header: string, colType: string): ExtendedColumnProfile {
  if (!data || data.length === 0) {
    return {
      name: header,
      type: (colType as ColumnProfile['type']) || 'text',
      nullCount: 0,
      uniqueCount: 0,
      exampleValue: null,
      missingPercentage: 0
    };
  }

  const cacheKey = `${data.length}_${header}_${colType}_${data[0]?._rowId || ''}_${data[data.length - 1]?._rowId || ''}_${data[0]?.[header] || ''}`;
  if (profileCache.has(cacheKey)) {
    return profileCache.get(cacheKey)!;
  }

  let nullCount = 0;
  const uniqueValues = new Set<any>();
  let exampleValue: any = null;

  const numericValues: number[] = [];
  const dateValues: Date[] = [];
  let invalidDateCount = 0;

  for (const row of data) {
    const val = row[header];
    if (val === null || val === undefined || val === '') {
      nullCount++;
    } else {
      uniqueValues.add(val);
      if (exampleValue === null) {
        exampleValue = val;
      }

      if (colType === 'numeric') {
        const num = Number(val);
        if (!isNaN(num)) {
          numericValues.push(num);
        }
      } else if (colType === 'date') {
        if (val instanceof Date) {
          if (!isNaN(val.getTime())) dateValues.push(val);
          else invalidDateCount++;
        } else if (typeof val === 'string' || typeof val === 'number') {
          const parsed = new Date(val);
          if (isValid(parsed) && !isNaN(parsed.getTime())) {
            dateValues.push(parsed);
          } else {
            invalidDateCount++;
          }
        }
      }
    }
  }

  const rowCount = data.length;
  const missingPercentage = rowCount > 0 ? parseFloat(((nullCount / rowCount) * 100).toFixed(1)) : 0;

  let min: number | string | null = null;
  let max: number | string | null = null;
  let mean: number | null = null;
  let median: number | null = null;

  if (colType === 'numeric' && numericValues.length > 0) {
    numericValues.sort((a, b) => a - b);
    min = numericValues[0];
    max = numericValues[numericValues.length - 1];
    const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
    mean = parseFloat((sum / numericValues.length).toFixed(2));

    const mid = Math.floor(numericValues.length / 2);
    if (numericValues.length % 2 === 0) {
      median = parseFloat(((numericValues[mid - 1] + numericValues[mid]) / 2).toFixed(2));
    } else {
      median = numericValues[mid];
    }
  }

  let minDate: string | null = null;
  let maxDate: string | null = null;

  if (colType === 'date' && dateValues.length > 0) {
    dateValues.sort((a, b) => a.getTime() - b.getTime());
    minDate = dateValues[0].toISOString().split('T')[0];
    maxDate = dateValues[dateValues.length - 1].toISOString().split('T')[0];
  }

  const profileResult: ExtendedColumnProfile = {
    name: header,
    type: (colType as ColumnProfile['type']) || 'text',
    nullCount,
    uniqueCount: uniqueValues.size,
    exampleValue: exampleValue instanceof Date ? exampleValue.toISOString() : exampleValue,
    missingPercentage,
    min,
    max,
    mean,
    median,
    invalidDateCount,
    minDate,
    maxDate,
  };

  profileCache.set(cacheKey, profileResult);
  return profileResult;
}

const dupCache = new WeakMap<Record<string, any>[], number>();

/**
 * Calculates exact duplicate row count across full dataset.
 */
export function calculateDuplicateRows(data: Record<string, any>[]): number {
  if (!data || data.length === 0) return 0;
  if (dupCache.has(data)) {
    return dupCache.get(data)!;
  }

  const seen = new Set<string>();
  let duplicates = 0;

  for (const row of data) {
    let key = '';
    for (const k in row) {
      if (k !== '_rowId') {
        key += `${k}:${row[k]}|`;
      }
    }
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.add(key);
    }
  }

  dupCache.set(data, duplicates);
  return duplicates;
}

const healthCache = new WeakMap<Dataset, { fingerprint: string; result: DatasetHealthSummary }>();

/**
 * Computes overall dataset health score and issue breakdown.
 */
export function calculateDatasetHealth(dataset: Dataset): DatasetHealthSummary {
  if (!dataset) {
    return {
      score: 100,
      status: 'Healthy',
      totalCells: 0,
      missingCells: 0,
      missingCellsPercentage: 0,
      duplicateRows: 0,
      duplicateRowsPercentage: 0,
      issuesCount: 0,
      issueBreakdown: {
        missingValuesColumns: 0,
        duplicateRowsCount: 0,
        invalidDatesCount: 0,
        emptyColumnsCount: 0
      }
    };
  }

  const data = dataset.fullData || dataset.data || [];
  const fingerprint = `${dataset.id}_${dataset.rowCount || data.length}_${dataset.colCount || dataset.headers?.length}_${dataset.issues?.length || 0}_${dataset.cleaningLogs?.length || 0}_${dataset.updatedAt || ''}`;

  const cached = healthCache.get(dataset);
  if (cached && cached.fingerprint === fingerprint) {
    return cached.result;
  }

  const rowCount = dataset.rowCount || data.length;
  const colCount = dataset.colCount || dataset.headers.length;
  const totalCells = rowCount * colCount;

  let missingCells = 0;
  let missingValuesColumns = 0;
  let emptyColumnsCount = 0;
  let invalidDatesCount = 0;

  const columnProfilesMap: Record<string, ExtendedColumnProfile> = {};

  for (const header of dataset.headers) {
    const colType = dataset.columnTypes?.[header] || 'text';
    const profile = profileColumn(data, header, colType);
    columnProfilesMap[header] = profile;

    missingCells += profile.nullCount;
    if (profile.nullCount > 0) missingValuesColumns++;
    if (profile.nullCount === rowCount && rowCount > 0) emptyColumnsCount++;
    if (profile.invalidDateCount) invalidDatesCount += profile.invalidDateCount;
  }

  const duplicateRows = calculateDuplicateRows(data);

  const missingCellsPercentage = totalCells > 0 ? parseFloat(((missingCells / totalCells) * 100).toFixed(2)) : 0;
  const duplicateRowsPercentage = rowCount > 0 ? parseFloat(((duplicateRows / rowCount) * 100).toFixed(2)) : 0;

  // Health Score deductions
  let score = 100;

  // Deduct for missing cells (up to 30 points)
  score -= Math.min(30, missingCellsPercentage * 3);

  // Deduct for duplicates (up to 30 points)
  score -= Math.min(30, duplicateRowsPercentage * 5);

  // Deduct for empty columns (up to 20 points)
  if (emptyColumnsCount > 0) {
    score -= Math.min(20, emptyColumnsCount * 10);
  }

  // Deduct for pending issues if detected
  const pendingIssues = (dataset.issues || []).filter(i => i.status === 'pending');
  score -= Math.min(20, pendingIssues.length * 5);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: 'Healthy' | 'Needs Attention' | 'Critical' = 'Healthy';
  if (score < 70) {
    status = 'Critical';
  } else if (score < 90) {
    status = 'Needs Attention';
  }

  const result: DatasetHealthSummary = {
    score,
    status,
    totalCells,
    missingCells,
    missingCellsPercentage,
    duplicateRows,
    duplicateRowsPercentage,
    issuesCount: pendingIssues.length,
    issueBreakdown: {
      missingValuesColumns,
      duplicateRowsCount: duplicateRows,
      invalidDatesCount,
      emptyColumnsCount
    }
  };

  healthCache.set(dataset, { fingerprint, result });
  return result;
}
