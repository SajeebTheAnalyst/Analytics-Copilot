import { Dataset, ColumnType } from '@/types';
import { parseFlexibleDateTime, isBlankValue, parseFlexibleNumeric } from './typeStandardizer';

export type IssueCategory =
  | 'Missing Data'
  | 'Duplicates'
  | 'Formatting'
  | 'Type Problems'
  | 'Date Problems'
  | 'Inconsistent Values'
  | 'Suspicious Values';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface QualityIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  column?: string;
  title: string;
  whatIsWrong: string;
  whereIsIt: string;
  affectedRowsCount: number;
  affectedValues: string[];
  suggestedAction: string;
}

export interface ColumnQualityProfile {
  header: string;
  qualityScore: number; // 0 - 100
  missingPercentage: number;
  uniqueCount: number;
  detectedType: ColumnType | string;
  issueCount: number;
  issues: QualityIssue[];
}

export interface DatasetQualityReport {
  overallScore: number; // 0 - 100
  totalRows: number;
  totalColumns: number;
  totalIssues: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  infoIssuesCount: number;
  columnProfiles: Record<string, ColumnQualityProfile>;
  issuesByCategory: Record<IssueCategory, QualityIssue[]>;
  allIssues: QualityIssue[];
}

/**
 * Calculates Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Read-only quality scanner for datasets.
 * Analyzes active data rows without modifying any state or dataset contents.
 */
export function scanDatasetQuality(
  dataset: Dataset,
  overrideWorkingData?: Record<string, any>[]
): DatasetQualityReport {
  const rows = overrideWorkingData || dataset.fullData || dataset.data || [];
  const headers = dataset.headers || (rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== '_rowId') : []);
  const totalRows = rows.length;
  const totalColumns = headers.length;

  const allIssues: QualityIssue[] = [];
  const columnProfiles: Record<string, ColumnQualityProfile> = {};

  const issuesByCategory: Record<IssueCategory, QualityIssue[]> = {
    'Missing Data': [],
    'Duplicates': [],
    'Formatting': [],
    'Type Problems': [],
    'Date Problems': [],
    'Inconsistent Values': [],
    'Suspicious Values': [],
  };

  if (totalRows === 0 || totalColumns === 0) {
    return {
      overallScore: 100,
      totalRows: 0,
      totalColumns: 0,
      totalIssues: 0,
      criticalIssuesCount: 0,
      warningIssuesCount: 0,
      infoIssuesCount: 0,
      columnProfiles: {},
      issuesByCategory,
      allIssues: [],
    };
  }

  // 1. GLOBAL CHECK: Duplicate Rows
  const rowHashMap = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    const hash = headers.map(h => String(row[h] ?? '')).join('||');
    if (!rowHashMap.has(hash)) {
      rowHashMap.set(hash, []);
    }
    rowHashMap.get(hash)!.push(idx + 1);
  });

  let duplicateRowCount = 0;
  const duplicateRowSample: string[] = [];
  rowHashMap.forEach((indices) => {
    if (indices.length > 1) {
      duplicateRowCount += indices.length - 1;
      if (duplicateRowSample.length < 3) {
        duplicateRowSample.push(`Rows ${indices.join(', ')} are identical`);
      }
    }
  });

  if (duplicateRowCount > 0) {
    const issue: QualityIssue = {
      id: `${dataset.id}-duplicate-rows`,
      category: 'Duplicates',
      severity: duplicateRowCount / totalRows > 0.1 ? 'critical' : 'warning',
      title: `${duplicateRowCount} Duplicate Rows Detected`,
      whatIsWrong: `Found ${duplicateRowCount} exact duplicate rows across all ${totalColumns} columns.`,
      whereIsIt: `Entire dataset (${duplicateRowCount} redundant rows)`,
      affectedRowsCount: duplicateRowCount,
      affectedValues: duplicateRowSample,
      suggestedAction: 'Remove duplicate rows',
    };
    allIssues.push(issue);
    issuesByCategory['Duplicates'].push(issue);
  }

  // 2. GLOBAL CHECK: Empty Rows
  const emptyRowIndices: number[] = [];
  rows.forEach((row, idx) => {
    const isEmpty = headers.every(h => isBlankValue(row[h]));
    if (isEmpty) {
      emptyRowIndices.push(idx + 1);
    }
  });

  if (emptyRowIndices.length > 0) {
    const issue: QualityIssue = {
      id: `${dataset.id}-empty-rows`,
      category: 'Missing Data',
      severity: 'critical',
      title: `${emptyRowIndices.length} Completely Empty Rows`,
      whatIsWrong: `Found ${emptyRowIndices.length} rows where every single column is blank or null.`,
      whereIsIt: `Rows ${emptyRowIndices.slice(0, 5).join(', ')}${emptyRowIndices.length > 5 ? '...' : ''}`,
      affectedRowsCount: emptyRowIndices.length,
      affectedValues: emptyRowIndices.slice(0, 5).map(r => `Row #${r} is empty`),
      suggestedAction: 'Fill missing values or remove empty rows',
    };
    allIssues.push(issue);
    issuesByCategory['Missing Data'].push(issue);
  }

  // 3. COLUMN-BY-COLUMN SCAN
  headers.forEach(header => {
    const colIssues: QualityIssue[] = [];
    const colType = dataset.columnTypes?.[header] || 'text';

    let blankCount = 0;
    const nonBlankValues: any[] = [];
    const rawStringValues: string[] = [];

    rows.forEach(row => {
      const val = row[header];
      if (isBlankValue(val)) {
        blankCount++;
      } else {
        nonBlankValues.push(val);
        rawStringValues.push(String(val));
      }
    });

    const missingPercentage = totalRows > 0 ? (blankCount / totalRows) * 100 : 0;
    const uniqueValSet = new Set(rawStringValues);
    const uniqueCount = uniqueValSet.size;

    // A. Missing / Blank Values per Column
    if (blankCount === totalRows) {
      const issue: QualityIssue = {
        id: `${dataset.id}-col-empty-${header}`,
        category: 'Missing Data',
        severity: 'critical',
        column: header,
        title: `Column "${header}" is 100% Empty`,
        whatIsWrong: `Column "${header}" contains 0 non-null values out of ${totalRows} rows.`,
        whereIsIt: `Column "${header}" (all ${totalRows} rows)`,
        affectedRowsCount: totalRows,
        affectedValues: ['All cells are null / blank'],
        suggestedAction: 'Remove unused columns',
      };
      colIssues.push(issue);
    } else if (missingPercentage >= 50) {
      const issue: QualityIssue = {
        id: `${dataset.id}-col-mostly-empty-${header}`,
        category: 'Missing Data',
        severity: missingPercentage > 80 ? 'critical' : 'warning',
        column: header,
        title: `Column "${header}" has ${missingPercentage.toFixed(1)}% Missing Values`,
        whatIsWrong: `Column "${header}" contains ${blankCount} blank values out of ${totalRows} rows.`,
        whereIsIt: `Column "${header}" (${blankCount} rows affected)`,
        affectedRowsCount: blankCount,
        affectedValues: [`${blankCount} missing values (${missingPercentage.toFixed(1)}%)`],
        suggestedAction: 'Fill missing values or remove unused columns',
      };
      colIssues.push(issue);
    } else if (blankCount > 0) {
      const issue: QualityIssue = {
        id: `${dataset.id}-col-missing-${header}`,
        category: 'Missing Data',
        severity: missingPercentage > 20 ? 'warning' : 'info',
        column: header,
        title: `Missing Values in "${header}" (${blankCount} cells)`,
        whatIsWrong: `Column "${header}" contains ${blankCount} missing or empty cells.`,
        whereIsIt: `Column "${header}" (${blankCount} rows affected)`,
        affectedRowsCount: blankCount,
        affectedValues: [`${blankCount} null cells`],
        suggestedAction: 'Fill missing values',
      };
      colIssues.push(issue);
    }

    // B. Whitespace & Formatting Issues
    let whitespaceCount = 0;
    const whitespaceSamples: string[] = [];
    rawStringValues.forEach(str => {
      if (str.trim() !== str) {
        whitespaceCount++;
        if (whitespaceSamples.length < 4) {
          whitespaceSamples.push(`"${str}"`);
        }
      }
    });

    if (whitespaceCount > 0) {
      const issue: QualityIssue = {
        id: `${dataset.id}-col-whitespace-${header}`,
        category: 'Formatting',
        severity: 'warning',
        column: header,
        title: `Unnecessary Whitespace in "${header}"`,
        whatIsWrong: `Column "${header}" contains ${whitespaceCount} values with leading or trailing whitespace.`,
        whereIsIt: `Column "${header}" (${whitespaceCount} affected cells)`,
        affectedRowsCount: whitespaceCount,
        affectedValues: whitespaceSamples,
        suggestedAction: 'Trim whitespace',
      };
      colIssues.push(issue);
    }

    // Special Characters Check
    let specialCharCount = 0;
    const specialCharSamples: string[] = [];
    rawStringValues.forEach(str => {
      // Check for unprintable control chars or unescaped HTML tags
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(str) || /<script.*?>/i.test(str)) {
        specialCharCount++;
        if (specialCharSamples.length < 3) {
          specialCharSamples.push(`"${str.slice(0, 30)}"`);
        }
      }
    });

    if (specialCharCount > 0) {
      const issue: QualityIssue = {
        id: `${dataset.id}-col-specialchar-${header}`,
        category: 'Formatting',
        severity: 'warning',
        column: header,
        title: `Unexpected Special / Control Chars in "${header}"`,
        whatIsWrong: `Found ${specialCharCount} values containing unprintable control characters or unescaped symbols.`,
        whereIsIt: `Column "${header}" (${specialCharCount} affected cells)`,
        affectedRowsCount: specialCharCount,
        affectedValues: specialCharSamples,
        suggestedAction: 'Clean special characters',
      };
      colIssues.push(issue);
    }

    // C. Case Inconsistencies & Categorical Variations
    if (nonBlankValues.length > 0 && ['text', 'categorical', 'unknown'].includes(String(colType).toLowerCase())) {
      // 1. Case Inconsistent Variations e.g. "Dhaka" vs "dhaka" vs " DHAKA"
      const lowerMap = new Map<string, Set<string>>();
      rawStringValues.forEach(str => {
        const trimmed = str.trim();
        if (!trimmed) return;
        const lower = trimmed.toLowerCase();
        if (!lowerMap.has(lower)) lowerMap.set(lower, new Set());
        lowerMap.get(lower)!.add(trimmed);
      });

      const casedInconsistentClusters: string[][] = [];
      lowerMap.forEach((varSet) => {
        if (varSet.size > 1) {
          casedInconsistentClusters.push(Array.from(varSet));
        }
      });

      if (casedInconsistentClusters.length > 0) {
        const firstCluster = casedInconsistentClusters[0];
        let totalAffected = 0;
        casedInconsistentClusters.forEach(c => { totalAffected += c.length; });

        const issue: QualityIssue = {
          id: `${dataset.id}-col-case-${header}`,
          category: 'Inconsistent Values',
          severity: 'warning',
          column: header,
          title: `Capitalization Inconsistencies in "${header}"`,
          whatIsWrong: `Column "${header}" contains category variations that differ only by capitalization (e.g. ${firstCluster.slice(0, 3).map(v => `"${v}"`).join(' vs ')}).`,
          whereIsIt: `Column "${header}" (${casedInconsistentClusters.length} distinct groups affected)`,
          affectedRowsCount: totalAffected,
          affectedValues: firstCluster,
          suggestedAction: 'Standardize capitalization',
        };
        colIssues.push(issue);
      }

      // 2. Suspicious Categorical Variations (Near matches / typos e.g. Rangpur, rangpur, Rangpurrr, Raaangpur)
      const uniqueTrimmed = Array.from(new Set(rawStringValues.map(s => s.trim()))).filter(Boolean);
      if (uniqueTrimmed.length > 1 && uniqueTrimmed.length <= 150) {
        const visited = new Set<string>();
        const clusters: string[][] = [];

        for (let i = 0; i < uniqueTrimmed.length; i++) {
          const u1 = uniqueTrimmed[i];
          if (visited.has(u1)) continue;

          const cluster = [u1];
          const l1 = u1.toLowerCase();

          for (let j = i + 1; j < uniqueTrimmed.length; j++) {
            const u2 = uniqueTrimmed[j];
            if (visited.has(u2)) continue;

            const l2 = u2.toLowerCase();
            const dist = levenshteinDistance(l1, l2);

            // Match if small edit distance relative to length
            const maxLen = Math.max(l1.length, l2.length);
            const isNearMatch = (maxLen >= 4 && dist <= 2) || (maxLen === 3 && dist === 1);

            if (isNearMatch) {
              cluster.push(u2);
              visited.add(u2);
            }
          }

          if (cluster.length > 1) {
            visited.add(u1);
            clusters.push(cluster);
          }
        }

        if (clusters.length > 0) {
          const sampleCluster = clusters[0];
          let affectedRows = 0;
          rawStringValues.forEach(str => {
            if (sampleCluster.includes(str.trim())) affectedRows++;
          });

          const issue: QualityIssue = {
            id: `${dataset.id}-col-similar-${header}`,
            category: 'Inconsistent Values',
            severity: 'warning',
            column: header,
            title: `Suspicious Categorical Variations in "${header}"`,
            whatIsWrong: `${header} contains ${sampleCluster.length} potentially inconsistent values: ${sampleCluster.slice(0, 5).join(', ')}.`,
            whereIsIt: `Column "${header}" (${affectedRows} affected rows)`,
            affectedRowsCount: affectedRows,
            affectedValues: sampleCluster,
            suggestedAction: 'Review similar categorical values',
          };
          colIssues.push(issue);
        }
      }
    }

    // D. Type Problems & Numeric Checks
    let numericCount = 0;
    let numericTextCount = 0; // Strings like "$2,500" or "30%" or "1,500.50"
    const numericTextSamples: string[] = [];

    nonBlankValues.forEach(val => {
      const { numeric, isPercentage } = parseFlexibleNumeric(val);
      if (numeric !== null) {
        numericCount++;
        if (typeof val === 'string') {
          if (val.includes('$') || val.includes(',') || val.includes('%') || val.includes('€') || val.includes('£')) {
            numericTextCount++;
            if (numericTextSamples.length < 4) {
              numericTextSamples.push(`"${val}"`);
            }
          }
        }
      }
    });

    const nonBlankTotal = nonBlankValues.length;

    // Check if numeric numbers stored as text
    if (nonBlankTotal > 3 && numericCount / nonBlankTotal >= 0.8 && String(colType).toLowerCase() === 'text') {
      const issue: QualityIssue = {
        id: `${dataset.id}-col-numtext-${header}`,
        category: 'Type Problems',
        severity: 'warning',
        column: header,
        title: `Numbers Stored as Text in "${header}"`,
        whatIsWrong: `Column "${header}" contains ${numericCount} numeric values formatted as text strings.`,
        whereIsIt: `Column "${header}" (${numericCount} values)`,
        affectedRowsCount: numericCount,
        affectedValues: numericTextSamples.length > 0 ? numericTextSamples : rawStringValues.slice(0, 4),
        suggestedAction: 'Convert invalid numeric values',
      };
      colIssues.push(issue);
    }

    // E. Date Problems & Date Intelligence
    const headerLower = header.toLowerCase();
    const isDateHeader = String(colType).toLowerCase() === 'date' || 
                         headerLower.includes('date') || 
                         headerLower.includes('time') || 
                         headerLower.includes('created') || 
                         headerLower.includes('at');

    if (isDateHeader && nonBlankTotal > 0) {
      let invalidDateCount = 0;
      const invalidDateSamples: string[] = [];
      const dateFormatsSeen = new Set<string>();

      nonBlankValues.forEach(val => {
        const { date, isDateTime, isTimeOnly } = parseFlexibleDateTime(val);
        if (!date) {
          invalidDateCount++;
          if (invalidDateSamples.length < 4) {
            invalidDateSamples.push(String(val));
          }
        } else {
          const str = String(val).trim();
          if (str.includes('/')) dateFormatsSeen.add('DD/MM/YYYY');
          else if (str.includes('-')) dateFormatsSeen.add('YYYY-MM-DD');
          else if (str.toLowerCase().includes('gmt')) dateFormatsSeen.add('GMT String');
          else dateFormatsSeen.add('Named Month');
        }
      });

      if (invalidDateCount > 0) {
        const issue: QualityIssue = {
          id: `${dataset.id}-col-invaliddate-${header}`,
          category: 'Date Problems',
          severity: 'critical',
          column: header,
          title: `Invalid Dates Detected in "${header}"`,
          whatIsWrong: `Found ${invalidDateCount} values (e.g. ${invalidDateSamples.slice(0, 3).map(v => `"${v}"`).join(', ')}) that cannot be parsed as valid dates.`,
          whereIsIt: `Column "${header}" (${invalidDateCount} invalid entries)`,
          affectedRowsCount: invalidDateCount,
          affectedValues: invalidDateSamples,
          suggestedAction: 'Review invalid dates',
        };
        colIssues.push(issue);
      }

      if (dateFormatsSeen.size > 1) {
        const issue: QualityIssue = {
          id: `${dataset.id}-col-mixeddate-${header}`,
          category: 'Date Problems',
          severity: 'warning',
          column: header,
          title: `Mixed Date Formats in "${header}"`,
          whatIsWrong: `Dates in "${header}" use multiple date formats (${Array.from(dateFormatsSeen).join(', ')}).`,
          whereIsIt: `Column "${header}" (${nonBlankTotal - invalidDateCount} valid dates)`,
          affectedRowsCount: nonBlankTotal - invalidDateCount,
          affectedValues: Array.from(dateFormatsSeen),
          suggestedAction: 'Standardize date formats to YYYY-MM-DD',
        };
        colIssues.push(issue);
      }
    }

    // F. Constant / Near-Constant Columns & Outliers
    if (nonBlankTotal > 5) {
      const frequencyMap = new Map<string, number>();
      rawStringValues.forEach(str => {
        frequencyMap.set(str, (frequencyMap.get(str) || 0) + 1);
      });

      let maxFreq = 0;
      let mostCommonVal = '';
      frequencyMap.forEach((cnt, val) => {
        if (cnt > maxFreq) {
          maxFreq = cnt;
          mostCommonVal = val;
        }
      });

      if (uniqueCount === 1) {
        const issue: QualityIssue = {
          id: `${dataset.id}-col-constant-${header}`,
          category: 'Suspicious Values',
          severity: 'warning',
          column: header,
          title: `Constant Column "${header}"`,
          whatIsWrong: `All ${nonBlankTotal} non-blank rows in "${header}" contain the exact same value "${mostCommonVal}".`,
          whereIsIt: `Column "${header}" (100% constant)`,
          affectedRowsCount: nonBlankTotal,
          affectedValues: [`"${mostCommonVal}"`],
          suggestedAction: 'Remove unused columns',
        };
        colIssues.push(issue);
      } else if (maxFreq / nonBlankTotal >= 0.98) {
        const issue: QualityIssue = {
          id: `${dataset.id}-col-nearconstant-${header}`,
          category: 'Suspicious Values',
          severity: 'info',
          column: header,
          title: `Near-Constant Column "${header}"`,
          whatIsWrong: `Column "${header}" has value "${mostCommonVal}" in ${((maxFreq / nonBlankTotal) * 100).toFixed(1)}% of non-blank rows.`,
          whereIsIt: `Column "${header}" (${maxFreq} / ${nonBlankTotal} rows)`,
          affectedRowsCount: maxFreq,
          affectedValues: [`"${mostCommonVal}" (${maxFreq} occurrences)`],
          suggestedAction: 'Remove unused columns',
        };
        colIssues.push(issue);
      }
    }

    // Column Quality Score Calculation
    let colPenalty = 0;
    colIssues.forEach(i => {
      if (i.severity === 'critical') colPenalty += 25;
      else if (i.severity === 'warning') colPenalty += 10;
      else colPenalty += 4;
    });

    colPenalty += Math.min(30, missingPercentage * 0.4);
    const colScore = Math.max(0, Math.min(100, Math.round(100 - colPenalty)));

    columnProfiles[header] = {
      header,
      qualityScore: colScore,
      missingPercentage: parseFloat(missingPercentage.toFixed(1)),
      uniqueCount,
      detectedType: colType,
      issueCount: colIssues.length,
      issues: colIssues,
    };

    colIssues.forEach(issue => {
      allIssues.push(issue);
      issuesByCategory[issue.category].push(issue);
    });
  });

  // Calculate Overall Quality Score
  let totalCritical = 0;
  let totalWarning = 0;
  let totalInfo = 0;

  allIssues.forEach(i => {
    if (i.severity === 'critical') totalCritical++;
    else if (i.severity === 'warning') totalWarning++;
    else totalInfo++;
  });

  const colScores = Object.values(columnProfiles).map(cp => cp.qualityScore);
  const avgColScore = colScores.length > 0 ? colScores.reduce((a, b) => a + b, 0) / colScores.length : 100;
  
  let globalPenalty = 0;
  if (duplicateRowCount > 0) globalPenalty += Math.min(20, (duplicateRowCount / totalRows) * 50);
  if (emptyRowIndices.length > 0) globalPenalty += Math.min(20, (emptyRowIndices.length / totalRows) * 50);

  const overallScore = Math.max(0, Math.min(100, Math.round(avgColScore - globalPenalty)));

  return {
    overallScore,
    totalRows,
    totalColumns,
    totalIssues: allIssues.length,
    criticalIssuesCount: totalCritical,
    warningIssuesCount: totalWarning,
    infoIssuesCount: totalInfo,
    columnProfiles,
    issuesByCategory,
    allIssues,
  };
}
