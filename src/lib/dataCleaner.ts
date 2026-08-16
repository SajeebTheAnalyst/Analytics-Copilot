import { Dataset, CleaningIssue, CleaningLog, RelationshipSuggestion } from '../types';
import { recalculateDatasetProfiles } from './analyzer';
import { calculateDatasetHealth } from './profiler';
import { isValid, parse } from 'date-fns';

function cloneRows(rows: Record<string, any>[]): Record<string, any>[] {
  if (!rows) return [];
  return rows.map(r => ({ ...r }));
}

export interface OutlierStats {
  column: string;
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
  outlierCount: number;
  outlierIndices: number[];
}

/**
 * Calculates IQR statistics for a numeric column.
 */
export function calculateIQRStats(data: Record<string, any>[], column: string): OutlierStats | null {
  if (!data || data.length < 4) return null;

  const nums: { val: number; index: number }[] = [];
  data.forEach((row, i) => {
    const v = row[column];
    if (v !== null && v !== undefined && v !== '' && !isNaN(Number(v))) {
      nums.push({ val: Number(v), index: i });
    }
  });

  if (nums.length < 4) return null;

  nums.sort((a, b) => a.val - b.val);

  const getPercentile = (vals: number[], p: number) => {
    const pos = (vals.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (vals[base + 1] !== undefined) {
      return vals[base] + rest * (vals[base + 1] - vals[base]);
    }
    return vals[base];
  };

  const vals = nums.map(n => n.val);
  const q1 = parseFloat(getPercentile(vals, 0.25).toFixed(2));
  const q3 = parseFloat(getPercentile(vals, 0.75).toFixed(2));
  const iqr = parseFloat((q3 - q1).toFixed(2));

  const lowerBound = parseFloat((q1 - 1.5 * iqr).toFixed(2));
  const upperBound = parseFloat((q3 + 1.5 * iqr).toFixed(2));

  const outlierIndices: number[] = [];
  nums.forEach(item => {
    if (item.val < lowerBound || item.val > upperBound) {
      outlierIndices.push(item.index);
    }
  });

  return {
    column,
    q1,
    q3,
    iqr,
    lowerBound,
    upperBound,
    outlierCount: outlierIndices.length,
    outlierIndices
  };
}

/**
 * Detects all real quality issues in the active dataset.
 */
export function detectIssues(datasets: Dataset[], relationships: RelationshipSuggestion[] = []): Dataset[] {
  return datasets.map(dataset => {
    if (!dataset.fullData || dataset.fullData.length === 0) return dataset;

    const issues: CleaningIssue[] = [];
    const data = dataset.fullData;
    const rowCount = data.length;

    // 1. Detect Empty Rows
    const emptyRowIndices: number[] = [];
    data.forEach((row, idx) => {
      const isAllNull = dataset.headers.every(h => {
        const val = row[h];
        return val === null || val === undefined || String(val).trim() === '';
      });
      if (isAllNull) emptyRowIndices.push(idx);
    });

    if (emptyRowIndices.length > 0) {
      issues.push({
        id: `${dataset.id}-empty-rows`,
        datasetId: dataset.id,
        type: 'empty_rows',
        title: `Empty rows detected (${emptyRowIndices.length})`,
        description: `Found ${emptyRowIndices.length} completely empty rows across all columns.`,
        affectedRowCount: emptyRowIndices.length,
        affectedCellCount: emptyRowIndices.length * dataset.headers.length,
        suggestedAction: `Remove ${emptyRowIndices.length} empty rows`,
        riskLevel: 'high',
        sampleBefore: ['[Empty Row]'],
        sampleAfter: ['[Removed]'],
        status: 'pending'
      });
    }

    // 2. Detect Empty Columns
    for (const header of dataset.headers) {
      let nullCount = 0;
      for (const row of data) {
        const val = row[header];
        if (val === null || val === undefined || String(val).trim() === '') {
          nullCount++;
        }
      }

      if (nullCount === rowCount && rowCount > 0) {
        issues.push({
          id: `${dataset.id}-empty-col-${header}`,
          datasetId: dataset.id,
          column: header,
          type: 'empty_columns',
          title: `Empty column "${header}"`,
          description: `All ${rowCount} values in column "${header}" are empty or null.`,
          affectedRowCount: rowCount,
          affectedCellCount: rowCount,
          suggestedAction: `Drop column "${header}"`,
          riskLevel: 'high',
          sampleBefore: ['null', '""'],
          sampleAfter: ['[Column Removed]'],
          status: 'pending'
        });
      } else if (nullCount > 0) {
        // Missing Values Issue
        const missingPct = (nullCount / rowCount) * 100;
        issues.push({
          id: `${dataset.id}-missing-${header}`,
          datasetId: dataset.id,
          column: header,
          type: 'missing_values',
          title: `Missing values in "${header}" (${nullCount})`,
          description: `Found ${nullCount} rows (${missingPct.toFixed(1)}%) with missing or empty values.`,
          affectedRowCount: nullCount,
          affectedCellCount: nullCount,
          suggestedAction: dataset.columnTypes[header] === 'numeric' ? `Fill missing values with median/mean` : `Fill missing values with default string`,
          riskLevel: missingPct > 20 ? 'high' : 'medium',
          sampleBefore: ['null', '""'],
          sampleAfter: [dataset.columnTypes[header] === 'numeric' ? '0' : '"Unknown"'],
          status: 'pending'
        });
      }

      // 3. Whitespace Issues
      let whitespaceCount = 0;
      let whitespaceSample = '';
      for (const row of data) {
        const val = row[header];
        if (typeof val === 'string' && val.trim() !== val) {
          whitespaceCount++;
          if (!whitespaceSample) whitespaceSample = val;
        }
      }

      if (whitespaceCount > 0) {
        issues.push({
          id: `${dataset.id}-whitespace-${header}`,
          datasetId: dataset.id,
          column: header,
          type: 'whitespace',
          title: `Unnecessary whitespace in "${header}" (${whitespaceCount})`,
          description: `Found ${whitespaceCount} text values with leading or trailing whitespace.`,
          affectedRowCount: whitespaceCount,
          affectedCellCount: whitespaceCount,
          suggestedAction: `Trim whitespace in "${header}"`,
          riskLevel: 'low',
          sampleBefore: [`"${whitespaceSample}"`],
          sampleAfter: [`"${whitespaceSample.trim()}"`],
          status: 'pending'
        });
      }

      // 4. Inconsistent Case
      const colType = dataset.columnTypes[header];
      if (colType === 'categorical' || colType === 'text') {
        const valueMap = new Map<string, Set<string>>();
        for (const row of data) {
          const val = row[header];
          if (typeof val === 'string' && val.trim() !== '') {
            const lower = val.trim().toLowerCase();
            if (!valueMap.has(lower)) valueMap.set(lower, new Set());
            valueMap.get(lower)!.add(val.trim());
          }
        }

        let inconsistentCount = 0;
        let sampleSet: Set<string> | null = null;
        for (const [, originalSet] of valueMap.entries()) {
          if (originalSet.size > 1) {
            inconsistentCount += Array.from(originalSet).length;
            if (!sampleSet) sampleSet = originalSet;
          }
        }

        if (inconsistentCount > 0 && sampleSet) {
          const arr = Array.from(sampleSet);
          issues.push({
            id: `${dataset.id}-case-${header}`,
            datasetId: dataset.id,
            column: header,
            type: 'inconsistent_case',
            title: `Inconsistent casing in "${header}" (${inconsistentCount})`,
            description: `Found category variations differing only by capitalization (e.g., "${arr[0]}" vs "${arr[1]}").`,
            affectedRowCount: inconsistentCount,
            affectedCellCount: inconsistentCount,
            suggestedAction: `Standardize to Title Case`,
            riskLevel: 'low',
            sampleBefore: arr.slice(0, 2).map(v => `"${v}"`),
            sampleAfter: [`"${arr[0]}"`, `"${arr[0]}"`],
            status: 'pending'
          });
        }

        // 5. Numeric values stored as text
        let numericStringsCount = 0;
        let totalNonEmpty = 0;
        for (const row of data) {
          const val = row[header];
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            totalNonEmpty++;
            if (typeof val === 'string' && !isNaN(Number(val))) {
              numericStringsCount++;
            }
          }
        }

        if (totalNonEmpty > 5 && (numericStringsCount / totalNonEmpty) > 0.8) {
          issues.push({
            id: `${dataset.id}-numtext-${header}`,
            datasetId: dataset.id,
            column: header,
            type: 'numeric_as_text',
            title: `Numeric numbers stored as text in "${header}"`,
            description: `${numericStringsCount} out of ${totalNonEmpty} non-empty values are numeric numbers stored as text strings.`,
            affectedRowCount: numericStringsCount,
            affectedCellCount: numericStringsCount,
            suggestedAction: `Cast "${header}" to Numeric`,
            riskLevel: 'low',
            sampleBefore: ['"1250.00"', '"299.00"'],
            sampleAfter: ['1250.00', '299.00'],
            status: 'pending'
          });
        }
      }

      // 6. Invalid Dates or Mixed Date Formats
      const headerLower = header.toLowerCase();
      const isDateCandidate = colType === 'date' || headerLower.includes('date') || headerLower.includes('time') || headerLower.includes('created');
      if (isDateCandidate) {
        let invalidDateCount = 0;
        const dateFormatsSeen = new Set<string>();

        for (const row of data) {
          const val = row[header];
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            if (val instanceof Date) {
              if (isNaN(val.getTime())) invalidDateCount++;
              else dateFormatsSeen.add('ISO Date');
            } else if (typeof val === 'string') {
              const str = val.trim();
              const parsedDate = new Date(str);
              if (isNaN(parsedDate.getTime())) {
                invalidDateCount++;
              } else {
                if (str.includes('-')) dateFormatsSeen.add('YYYY-MM-DD');
                else if (str.includes('/')) dateFormatsSeen.add('MM/DD/YYYY');
                else dateFormatsSeen.add('Other');
              }
            } else if (typeof val === 'number') {
              // Numbers like timestamps or Excel serials
              if (val < 0 || val > 253402300799000) invalidDateCount++;
            }
          }
        }

        if (invalidDateCount > 0) {
          issues.push({
            id: `${dataset.id}-invaliddate-${header}`,
            datasetId: dataset.id,
            column: header,
            type: 'invalid_dates',
            title: `Invalid date entries in "${header}" (${invalidDateCount})`,
            description: `Found ${invalidDateCount} values that cannot be parsed as valid dates.`,
            affectedRowCount: invalidDateCount,
            affectedCellCount: invalidDateCount,
            suggestedAction: `Standardize or clear invalid dates`,
            riskLevel: 'high',
            sampleBefore: ['"2024-13-45"', '"N/A"'],
            sampleAfter: ['null', '"2024-01-15"'],
            status: 'pending'
          });
        }

        if (dateFormatsSeen.size > 1) {
          issues.push({
            id: `${dataset.id}-mixeddate-${header}`,
            datasetId: dataset.id,
            column: header,
            type: 'mixed_dates',
            title: `Mixed date formats in "${header}"`,
            description: `Dates in "${header}" use multiple date formats (${Array.from(dateFormatsSeen).join(', ')}).`,
            affectedRowCount: rowCount - invalidDateCount,
            affectedCellCount: rowCount - invalidDateCount,
            suggestedAction: `Standardize all dates to ISO YYYY-MM-DD`,
            riskLevel: 'medium',
            sampleBefore: Array.from(dateFormatsSeen),
            sampleAfter: ['YYYY-MM-DD'],
            status: 'pending'
          });
        }
      }

      // 7. Outlier Detection for Numeric Columns
      if (colType === 'numeric') {
        const stats = calculateIQRStats(data, header);
        if (stats && stats.outlierCount > 0) {
          issues.push({
            id: `${dataset.id}-outlier-${header}`,
            datasetId: dataset.id,
            column: header,
            type: 'outliers',
            title: `Potential outliers in "${header}" (${stats.outlierCount})`,
            description: `Found ${stats.outlierCount} numeric values outside IQR bounds [${stats.lowerBound} to ${stats.upperBound}].`,
            affectedRowCount: stats.outlierCount,
            affectedCellCount: stats.outlierCount,
            suggestedAction: `Review or exclude ${stats.outlierCount} outliers`,
            riskLevel: 'medium',
            sampleBefore: [`Q1: ${stats.q1}`, `Q3: ${stats.q3}`],
            sampleAfter: [`Range: [${stats.lowerBound}, ${stats.upperBound}]`],
            status: 'pending'
          });
        }
      }
    }

    // 8. Detect Duplicate Rows across all columns
    const rowHashes = new Set<string>();
    let duplicateCount = 0;
    data.forEach(row => {
      const keys = Object.keys(row).sort();
      const hash = keys.map(k => `${k}:${row[k]}`).join('|');
      if (rowHashes.has(hash)) {
        duplicateCount++;
      } else {
        rowHashes.add(hash);
      }
    });

    if (duplicateCount > 0) {
      issues.push({
        id: `${dataset.id}-duplicate-rows`,
        datasetId: dataset.id,
        type: 'duplicate_rows',
        title: `Exact duplicate rows (${duplicateCount})`,
        description: `Found ${duplicateCount} exact duplicate rows across all columns.`,
        affectedRowCount: duplicateCount,
        affectedCellCount: duplicateCount * dataset.headers.length,
        suggestedAction: `Remove ${duplicateCount} duplicate rows`,
        riskLevel: 'medium',
        sampleBefore: ['[Duplicate Row]'],
        sampleAfter: ['[Removed]'],
        status: 'pending'
      });
    }

    // Preserve existing issue status if issue ID matches
    const existingIssues = dataset.issues || [];
    const mergedIssues = issues.map(issue => {
      const existing = existingIssues.find(e => e.id === issue.id);
      if (existing) {
        return { ...issue, status: existing.status };
      }
      return issue;
    });

    const pendingCount = mergedIssues.filter(i => i.status === 'pending').length;
    const cleaningStatus = pendingCount > 0 ? 'issues-found' : (dataset.cleaningStatus === 'cleaned' ? 'cleaned' : 'original');

    // If issues and status are identical, preserve existing dataset reference to avoid unnecessary re-renders
    const isSameIssues = dataset.issues &&
      dataset.issues.length === mergedIssues.length &&
      dataset.issues.every((iss, idx) => iss.id === mergedIssues[idx].id && iss.status === mergedIssues[idx].status);

    if (isSameIssues && dataset.cleaningStatus === cleaningStatus) {
      return dataset;
    }

    return {
      ...dataset,
      issues: mergedIssues,
      cleaningStatus: cleaningStatus as Dataset['cleaningStatus']
    };
  });
}

/**
 * Applies a specific issue resolution.
 */
export function applyCleaningAction(dataset: Dataset, issueId: string): Dataset {
  const issue = (dataset.issues || []).find(i => i.id === issueId);
  if (!issue || issue.status === 'applied') return dataset;

  const originalDataSnapshot = cloneRows(dataset.fullData);
  const previousHealth = calculateDatasetHealth(dataset);
  let newData = [...dataset.fullData];
  let rowsAffected = 0;
  let cellsAffected = 0;

  switch (issue.type) {
    case 'missing_values':
      if (issue.column) {
        const colType = dataset.columnTypes[issue.column];
        let fillVal: any = 'Unknown';

        if (colType === 'numeric') {
          const nums = newData.map(r => Number(r[issue.column!])).filter(n => !isNaN(n));
          fillVal = nums.length > 0 ? parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : 0;
        }

        newData = newData.map(row => {
          const val = row[issue.column!];
          if (val === null || val === undefined || String(val).trim() === '') {
            rowsAffected++;
            cellsAffected++;
            return { ...row, [issue.column!]: fillVal };
          }
          return row;
        });
      }
      break;

    case 'whitespace':
      if (issue.column) {
        newData = newData.map(row => {
          const val = row[issue.column!];
          if (typeof val === 'string' && val.trim() !== val) {
            rowsAffected++;
            cellsAffected++;
            return { ...row, [issue.column!]: val.trim() };
          }
          return row;
        });
      }
      break;

    case 'inconsistent_case':
      if (issue.column) {
        newData = newData.map(row => {
          const val = row[issue.column!];
          if (typeof val === 'string' && val.trim() !== '') {
            const titleCased = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            if (val !== titleCased) {
              rowsAffected++;
              cellsAffected++;
              return { ...row, [issue.column!]: titleCased };
            }
          }
          return row;
        });
      }
      break;

    case 'duplicate_rows': {
      const seen = new Set<string>();
      const filtered: Record<string, any>[] = [];
      dataLoop: for (const row of newData) {
        const keys = Object.keys(row).sort();
        const hash = keys.map(k => `${k}:${row[k]}`).join('|');
        if (seen.has(hash)) {
          rowsAffected++;
          cellsAffected += dataset.headers.length;
        } else {
          seen.add(hash);
          filtered.push(row);
        }
      }
      newData = filtered;
      break;
    }

    case 'empty_rows': {
      newData = newData.filter(row => {
        const isEmpty = dataset.headers.every(h => {
          const v = row[h];
          return v === null || v === undefined || String(v).trim() === '';
        });
        if (isEmpty) {
          rowsAffected++;
          cellsAffected += dataset.headers.length;
          return false;
        }
        return true;
      });
      break;
    }

    case 'empty_columns': {
      if (issue.column) {
        const newHeaders = dataset.headers.filter(h => h !== issue.column);
        newData = newData.map(row => {
          const { [issue.column!]: _, ...rest } = row;
          return rest;
        });
        rowsAffected = newData.length;
        cellsAffected = newData.length;

        const updatedDataset = recalculateDatasetProfiles({
          ...dataset,
          headers: newHeaders,
          fullData: newData,
          issues: (dataset.issues || []).map(i => i.id === issueId ? { ...i, status: 'applied' as const } : i),
          cleaningStatus: 'cleaned' as const
        });

        const newHealth = calculateDatasetHealth(updatedDataset);
        const log: CleaningLog = {
          id: `log-${Date.now()}-${issueId}`,
          timestamp: Date.now(),
          datasetId: dataset.id,
          datasetName: dataset.name,
          issueId: issue.id,
          operation: issue.title,
          column: issue.column,
          rowsAffected,
          cellsAffected,
          previousHealthScore: previousHealth.score,
          newHealthScore: newHealth.score,
          previousData: originalDataSnapshot
        };

        return {
          ...updatedDataset,
          cleaningLogs: [...(dataset.cleaningLogs || []), log]
        };
      }
      break;
    }

    case 'numeric_as_text':
      if (issue.column) {
        newData = newData.map(row => {
          const val = row[issue.column!];
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            const num = Number(val);
            if (!isNaN(num)) {
              rowsAffected++;
              cellsAffected++;
              return { ...row, [issue.column!]: num };
            }
          }
          return row;
        });
      }
      break;

    case 'invalid_dates':
    case 'mixed_dates':
      if (issue.column) {
        newData = newData.map(row => {
          const val = row[issue.column!];
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const formatted = d.toISOString().split('T')[0];
              if (val !== formatted) {
                rowsAffected++;
                cellsAffected++;
                return { ...row, [issue.column!]: formatted };
              }
            } else {
              rowsAffected++;
              cellsAffected++;
              return { ...row, [issue.column!]: null };
            }
          }
          return row;
        });
      }
      break;

    case 'outliers':
      if (issue.column) {
        const stats = calculateIQRStats(newData, issue.column);
        if (stats) {
          const outlierSet = new Set(stats.outlierIndices);
          newData = newData.filter((_, idx) => {
            if (outlierSet.has(idx)) {
              rowsAffected++;
              cellsAffected++;
              return false;
            }
            return true;
          });
        }
      }
      break;
  }

  const updatedIssues = (dataset.issues || []).map(i => i.id === issueId ? { ...i, status: 'applied' as const } : i);

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    fullData: newData,
    issues: updatedIssues,
    cleaningStatus: 'cleaned' as const
  });

  const newHealth = calculateDatasetHealth(updatedDataset);

  const log: CleaningLog = {
    id: `log-${Date.now()}-${issueId}`,
    timestamp: Date.now(),
    datasetId: dataset.id,
    datasetName: dataset.name,
    issueId: issue.id,
    operation: issue.title,
    column: issue.column,
    rowsAffected: rowsAffected || issue.affectedRowCount,
    cellsAffected: cellsAffected || issue.affectedCellCount || rowsAffected,
    previousHealthScore: previousHealth.score,
    newHealthScore: newHealth.score,
    previousData: originalDataSnapshot
  };

  return {
    ...updatedDataset,
    cleaningLogs: [...(dataset.cleaningLogs || []), log]
  };
}

/**
 * Custom tool function: Remove or fill missing values
 */
export function removeNullsCustom(
  dataset: Dataset,
  column: string,
  strategy: 'drop' | 'zero' | 'mean' | 'median' | 'mode' | 'text' | 'date',
  customVal?: any
): Dataset {
  const originalDataSnapshot = cloneRows(dataset.fullData);
  const previousHealth = calculateDatasetHealth(dataset);
  let rowsAffected = 0;
  let cellsAffected = 0;
  let newData = [...dataset.fullData];

  if (strategy === 'drop') {
    newData = newData.filter(row => {
      const val = row[column];
      if (val === null || val === undefined || String(val).trim() === '') {
        rowsAffected++;
        cellsAffected++;
        return false;
      }
      return true;
    });
  } else {
    let fillVal: any = customVal ?? 'Unknown';

    if (strategy === 'zero') {
      fillVal = 0;
    } else if (strategy === 'mean') {
      const nums = newData.map(r => Number(r[column])).filter(n => !isNaN(n));
      fillVal = nums.length > 0 ? parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)) : 0;
    } else if (strategy === 'median') {
      const nums = newData.map(r => Number(r[column])).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (nums.length > 0) {
        const mid = Math.floor(nums.length / 2);
        fillVal = nums.length % 2 === 0 ? parseFloat(((nums[mid - 1] + nums[mid]) / 2).toFixed(2)) : nums[mid];
      } else {
        fillVal = 0;
      }
    } else if (strategy === 'mode') {
      const counts: Record<string, number> = {};
      let maxCount = 0;
      let maxKey = 'Unknown';
      newData.forEach(r => {
        const v = r[column];
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          const key = String(v);
          counts[key] = (counts[key] || 0) + 1;
          if (counts[key] > maxCount) {
            maxCount = counts[key];
            maxKey = key;
          }
        }
      });
      fillVal = maxKey;
    }

    newData = newData.map(row => {
      const val = row[column];
      if (val === null || val === undefined || String(val).trim() === '') {
        rowsAffected++;
        cellsAffected++;
        return { ...row, [column]: fillVal };
      }
      return row;
    });
  }

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    fullData: newData,
    cleaningStatus: 'cleaned'
  });

  const newHealth = calculateDatasetHealth(updatedDataset);

  const log: CleaningLog = {
    id: `log-nulls-${Date.now()}`,
    timestamp: Date.now(),
    datasetId: dataset.id,
    datasetName: dataset.name,
    issueId: `manual-nulls-${column}`,
    operation: `Fill/Remove Nulls in "${column}" (${strategy})`,
    column,
    rowsAffected,
    cellsAffected,
    previousHealthScore: previousHealth.score,
    newHealthScore: newHealth.score,
    previousData: originalDataSnapshot
  };

  return {
    ...updatedDataset,
    cleaningLogs: [...(dataset.cleaningLogs || []), log]
  };
}

/**
 * Custom tool function: Text Transformation (Trim, Lowercase, Uppercase, Title Case)
 */
export function transformTextCustom(
  dataset: Dataset,
  column: string,
  action: 'trim' | 'lowercase' | 'uppercase' | 'titlecase'
): Dataset {
  const originalDataSnapshot = cloneRows(dataset.fullData);
  const previousHealth = calculateDatasetHealth(dataset);
  let rowsAffected = 0;
  let cellsAffected = 0;

  const newData = dataset.fullData.map(row => {
    const val = row[column];
    if (typeof val === 'string') {
      let transformed = val;
      if (action === 'trim') transformed = val.trim();
      else if (action === 'lowercase') transformed = val.toLowerCase();
      else if (action === 'uppercase') transformed = val.toUpperCase();
      else if (action === 'titlecase') {
        transformed = val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }

      if (val !== transformed) {
        rowsAffected++;
        cellsAffected++;
        return { ...row, [column]: transformed };
      }
    }
    return row;
  });

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    fullData: newData,
    cleaningStatus: 'cleaned'
  });

  const newHealth = calculateDatasetHealth(updatedDataset);

  const log: CleaningLog = {
    id: `log-text-${Date.now()}`,
    timestamp: Date.now(),
    datasetId: dataset.id,
    datasetName: dataset.name,
    issueId: `manual-text-${column}`,
    operation: `Text ${action} on "${column}"`,
    column,
    rowsAffected,
    cellsAffected,
    previousHealthScore: previousHealth.score,
    newHealthScore: newHealth.score,
    previousData: originalDataSnapshot
  };

  return {
    ...updatedDataset,
    cleaningLogs: [...(dataset.cleaningLogs || []), log]
  };
}

/**
 * Custom tool function: Cast column data type
 */
export function castColumnTypeCustom(
  dataset: Dataset,
  column: string,
  targetType: 'numeric' | 'text' | 'date' | 'boolean'
): Dataset {
  const originalDataSnapshot = cloneRows(dataset.fullData);
  const previousHealth = calculateDatasetHealth(dataset);
  let rowsAffected = 0;
  let cellsAffected = 0;

  const newData = dataset.fullData.map(row => {
    const val = row[column];
    let converted = val;

    if (val !== null && val !== undefined && String(val).trim() !== '') {
      if (targetType === 'numeric') {
        const num = Number(val);
        if (!isNaN(num)) {
          converted = num;
          if (typeof val !== 'number') {
            rowsAffected++;
            cellsAffected++;
          }
        }
      } else if (targetType === 'text') {
        converted = String(val);
        if (typeof val !== 'string') {
          rowsAffected++;
          cellsAffected++;
        }
      } else if (targetType === 'boolean') {
        converted = String(val).toLowerCase() === 'true' || String(val) === '1' || val === true;
        if (typeof val !== 'boolean') {
          rowsAffected++;
          cellsAffected++;
        }
      } else if (targetType === 'date') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          converted = d.toISOString().split('T')[0];
          rowsAffected++;
          cellsAffected++;
        }
      }
    }

    return { ...row, [column]: converted };
  });

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    fullData: newData,
    columnTypes: { ...dataset.columnTypes, [column]: targetType },
    cleaningStatus: 'cleaned'
  });

  const newHealth = calculateDatasetHealth(updatedDataset);

  const log: CleaningLog = {
    id: `log-cast-${Date.now()}`,
    timestamp: Date.now(),
    datasetId: dataset.id,
    datasetName: dataset.name,
    issueId: `manual-cast-${column}`,
    operation: `Change "${column}" type to ${targetType}`,
    column,
    rowsAffected,
    cellsAffected,
    previousHealthScore: previousHealth.score,
    newHealthScore: newHealth.score,
    previousData: originalDataSnapshot
  };

  return {
    ...updatedDataset,
    cleaningLogs: [...(dataset.cleaningLogs || []), log]
  };
}

/**
 * Custom tool function: Date Standardization
 */
export function standardizeDatesCustom(
  dataset: Dataset,
  column: string,
  targetFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' = 'YYYY-MM-DD'
): Dataset {
  const originalDataSnapshot = cloneRows(dataset.fullData);
  const previousHealth = calculateDatasetHealth(dataset);
  let rowsAffected = 0;
  let cellsAffected = 0;

  const newData = dataset.fullData.map(row => {
    const val = row[column];
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');

        let formatted = `${yyyy}-${mm}-${dd}`;
        if (targetFormat === 'MM/DD/YYYY') formatted = `${mm}/${dd}/${yyyy}`;
        else if (targetFormat === 'DD/MM/YYYY') formatted = `${dd}/${mm}/${yyyy}`;

        if (String(val) !== formatted) {
          rowsAffected++;
          cellsAffected++;
          return { ...row, [column]: formatted };
        }
      }
    }
    return row;
  });

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    fullData: newData,
    cleaningStatus: 'cleaned'
  });

  const newHealth = calculateDatasetHealth(updatedDataset);

  const log: CleaningLog = {
    id: `log-date-${Date.now()}`,
    timestamp: Date.now(),
    datasetId: dataset.id,
    datasetName: dataset.name,
    issueId: `manual-date-${column}`,
    operation: `Standardize Date Format in "${column}" (${targetFormat})`,
    column,
    rowsAffected,
    cellsAffected,
    previousHealthScore: previousHealth.score,
    newHealthScore: newHealth.score,
    previousData: originalDataSnapshot
  };

  return {
    ...updatedDataset,
    cleaningLogs: [...(dataset.cleaningLogs || []), log]
  };
}

/**
 * Custom tool function: Remove Outliers by IQR
 */
export function filterOutliersCustom(
  dataset: Dataset,
  column: string,
  iqrMultiplier = 1.5
): Dataset {
  const originalDataSnapshot = cloneRows(dataset.fullData);
  const previousHealth = calculateDatasetHealth(dataset);
  const stats = calculateIQRStats(dataset.fullData, column);

  if (!stats || stats.outlierCount === 0) return dataset;

  const outlierSet = new Set(stats.outlierIndices);
  let rowsAffected = 0;

  const newData = dataset.fullData.filter((_, idx) => {
    if (outlierSet.has(idx)) {
      rowsAffected++;
      return false;
    }
    return true;
  });

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    fullData: newData,
    cleaningStatus: 'cleaned'
  });

  const newHealth = calculateDatasetHealth(updatedDataset);

  const log: CleaningLog = {
    id: `log-outliers-${Date.now()}`,
    timestamp: Date.now(),
    datasetId: dataset.id,
    datasetName: dataset.name,
    issueId: `manual-outlier-${column}`,
    operation: `Exclude Outliers in "${column}" (IQR x ${iqrMultiplier})`,
    column,
    rowsAffected,
    cellsAffected: rowsAffected,
    previousHealthScore: previousHealth.score,
    newHealthScore: newHealth.score,
    previousData: originalDataSnapshot
  };

  return {
    ...updatedDataset,
    cleaningLogs: [...(dataset.cleaningLogs || []), log]
  };
}

/**
 * Clean Headers (snake_case, lowercase, trim)
 */
export function cleanHeadersCustom(
  dataset: Dataset,
  style: 'snake_case' | 'lowercase' | 'trim'
): Dataset {
  const originalDataSnapshot = cloneRows(dataset.fullData);
  const previousHealth = calculateDatasetHealth(dataset);
  const oldHeaders = dataset.headers;

  const headerMap: Record<string, string> = {};
  const newHeaders = oldHeaders.map(h => {
    let clean = h.trim();
    if (style === 'lowercase') {
      clean = clean.toLowerCase();
    } else if (style === 'snake_case') {
      clean = clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
    headerMap[h] = clean || h;
    return clean || h;
  });

  const newData = dataset.fullData.map(row => {
    const updatedRow: Record<string, any> = {};
    for (const oldKey of oldHeaders) {
      const newKey = headerMap[oldKey];
      updatedRow[newKey] = row[oldKey];
    }
    return updatedRow;
  });

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    headers: newHeaders,
    fullData: newData,
    cleaningStatus: 'cleaned'
  });

  const newHealth = calculateDatasetHealth(updatedDataset);

  const log: CleaningLog = {
    id: `log-headers-${Date.now()}`,
    timestamp: Date.now(),
    datasetId: dataset.id,
    datasetName: dataset.name,
    issueId: `manual-headers-${style}`,
    operation: `Clean Headers (${style})`,
    rowsAffected: dataset.fullData.length,
    cellsAffected: dataset.fullData.length * newHeaders.length,
    previousHealthScore: previousHealth.score,
    newHealthScore: newHealth.score,
    previousData: originalDataSnapshot
  };

  return {
    ...updatedDataset,
    cleaningLogs: [...(dataset.cleaningLogs || []), log]
  };
}

/**
 * Undo cleaning action
 */
export function undoCleaningAction(dataset: Dataset, logId: string): Dataset {
  const logIndex = (dataset.cleaningLogs || []).findIndex(l => l.id === logId);
  if (logIndex === -1) return dataset;

  const log = dataset.cleaningLogs![logIndex];
  const restoredData = log.previousData;
  const newLogs = dataset.cleaningLogs!.slice(0, logIndex);

  const updatedIssues = (dataset.issues || []).map(i => i.id === log.issueId ? { ...i, status: 'pending' as const } : i);

  const updatedDataset = recalculateDatasetProfiles({
    ...dataset,
    fullData: restoredData,
    cleaningLogs: newLogs,
    issues: updatedIssues,
    cleaningStatus: newLogs.length > 0 ? 'cleaned' as const : 'issues-found' as const
  });

  return updatedDataset;
}

/**
 * Restores original dataset state
 */
export function restoreOriginal(dataset: Dataset): Dataset {
  const restored = recalculateDatasetProfiles({
    ...dataset,
    fullData: cloneRows(dataset.originalData),
    cleaningLogs: [],
    issues: (dataset.issues || []).map(i => ({ ...i, status: 'pending' as const })),
    cleaningStatus: 'original' as const
  });

  return restored;
}
