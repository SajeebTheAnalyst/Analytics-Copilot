import { Dataset, RelationshipSuggestion } from '@/types';
import { evaluateDataReadiness } from './dataReadinessEngine';

function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Calculates string similarity score between two column names (0.0 to 1.0)
 */
function calculateNameSimilarity(col1: string, col2: string, ds1Name: string, ds2Name: string): { score: number; matchType: string } {
  const n1 = normalizeName(col1);
  const n2 = normalizeName(col2);
  const t1 = normalizeName(ds1Name);
  const t2 = normalizeName(ds2Name);

  if (n1 === n2) {
    return { score: 1.0, matchType: 'exact' };
  }

  // Handle common ID prefixes/suffixes, e.g. Customers.CustomerID vs Orders.CustomerID
  // or Customers.id vs Orders.customer_id
  if (
    (n1 === 'id' && n2 === `${t1}id`) ||
    (n2 === 'id' && n1 === `${t2}id`) ||
    (n1 === 'id' && n2.endsWith('id') && n2.includes(t1)) ||
    (n2 === 'id' && n1.endsWith('id') && n1.includes(t2))
  ) {
    return { score: 0.95, matchType: 'primary-foreign-id' };
  }

  // Substring match: e.g. "Region" vs "RegionName" or "Region" vs "Region_Code"
  if (n1.includes(n2) || n2.includes(n1)) {
    const minLen = Math.min(n1.length, n2.length);
    const maxLen = Math.max(n1.length, n2.length);
    // If length difference is small, high similarity
    if (minLen / maxLen > 0.5) {
      return { score: 0.8, matchType: 'substring' };
    }
  }

  // Levenshtein-like character overlap or sharing common prefix
  if (n1.startsWith(n2) || n2.startsWith(n1)) {
    return { score: 0.7, matchType: 'prefix' };
  }

  return { score: 0, matchType: 'none' };
}

/**
 * Evaluates overlapping values between two datasets' columns.
 */
function evaluateValueOverlap(
  data1: any[],
  data2: any[],
  col1: string,
  col2: string
) {
  if (!data1.length || !data2.length) {
    return { overlapRatio: 0, overlapCount: 0, val1Size: 0, val2Size: 0, sampleMatches: [] as string[] };
  }

  const set1 = new Set(
    data1
      .map(r => String(r[col1] !== undefined && r[col1] !== null ? r[col1] : '').trim())
      .filter(v => v !== '' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined')
  );

  const set2 = new Set(
    data2
      .map(r => String(r[col2] !== undefined && r[col2] !== null ? r[col2] : '').trim())
      .filter(v => v !== '' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined')
  );

  if (set1.size === 0 || set2.size === 0) {
    return { overlapRatio: 0, overlapCount: 0, val1Size: 0, val2Size: 0, sampleMatches: [] };
  }

  let overlapCount = 0;
  const sampleMatches: string[] = [];

  for (const val of set1) {
    if (set2.has(val)) {
      overlapCount++;
      if (sampleMatches.length < 5) {
        sampleMatches.push(val);
      }
    }
  }

  // Overlap ratio over the smaller set
  const minSize = Math.min(set1.size, set2.size);
  const overlapRatio = overlapCount / minSize;

  return {
    overlapRatio,
    overlapCount,
    val1Size: set1.size,
    val2Size: set2.size,
    sampleMatches
  };
}

/**
 * Discovers potential relationships among READY datasets in the workspace.
 */
export function discoverRelationships(datasets: Dataset[]): RelationshipSuggestion[] {
  const suggestions: RelationshipSuggestion[] = [];

  // Analyze all datasets in the workspace for relationships
  const targetDatasets = datasets;

  if (targetDatasets.length < 2) {
    return suggestions;
  }

  for (let i = 0; i < targetDatasets.length; i++) {
    for (let j = i + 1; j < targetDatasets.length; j++) {
      const ds1 = targetDatasets[i];
      const ds2 = targetDatasets[j];

      for (const col1 of ds1.headers) {
        const prof1 = ds1.columnProfiles[col1];
        if (!prof1 || prof1.type === 'unknown' || prof1.type === 'boolean') continue;

        // Incompatible: mostly null check (over 50% nulls)
        const nullRatio1 = prof1.nullCount / ds1.rowCount;
        if (nullRatio1 > 0.5) continue;

        for (const col2 of ds2.headers) {
          const prof2 = ds2.columnProfiles[col2];
          if (!prof2 || prof2.type === 'unknown' || prof2.type === 'boolean') continue;

          const nullRatio2 = prof2.nullCount / ds2.rowCount;
          if (nullRatio2 > 0.5) continue;

          // 1. Data Type Compatibility
          const type1 = prof1.type;
          const type2 = prof2.type;
          const isCompatibleType = 
            type1 === type2 ||
            (type1 === 'text' && type2 === 'categorical') ||
            (type1 === 'categorical' && type2 === 'text');

          if (!isCompatibleType) continue;

          // 2. Name Similarity
          const { score: nameSim, matchType } = calculateNameSimilarity(col1, col2, ds1.name, ds2.name);

          // 3. Data Overlap evaluation
          const data1 = ds1.fullData && ds1.fullData.length > 0 ? ds1.fullData : ds1.data;
          const data2 = ds2.fullData && ds2.fullData.length > 0 ? ds2.fullData : ds2.data;

          const { overlapRatio, overlapCount, val1Size, val2Size } = evaluateValueOverlap(data1, data2, col1, col2);

          // SAFETY: low overlap check
          if (overlapRatio < 0.15 || overlapCount < 2) {
            // Reject matches with poor uniqueness + poor overlap, or just extremely low data evidence
            continue;
          }

          // Reject if both columns are free-form text with poor uniqueness (e.g. description fields)
          const isLowUniqueness1 = (prof1.uniqueCount / ds1.rowCount) < 0.05;
          const isLowUniqueness2 = (prof2.uniqueCount / ds2.rowCount) < 0.05;
          if (type1 === 'text' && type2 === 'text' && isLowUniqueness1 && isLowUniqueness2) {
            continue;
          }

          // 4. Calculate Confidence Score (0-100)
          let confidence = 0;
          const reasons: string[] = [];
          const warnings: string[] = [];

          // Column Names logic
          if (nameSim === 1.0) {
            confidence += 35;
            reasons.push(`Same column name ("${col1}")`);
          } else if (nameSim >= 0.8) {
            confidence += 28;
            reasons.push(`Highly similar column names ("${col1}" and "${col2}")`);
          } else if (nameSim >= 0.5) {
            confidence += 15;
            reasons.push(`Partially matching column names`);
          }

          // Data overlap weight
          if (overlapRatio >= 0.9) {
            confidence += 45;
            reasons.push(`${Math.round(overlapRatio * 100)}% unique value overlap between columns`);
          } else if (overlapRatio >= 0.6) {
            confidence += 35;
            reasons.push(`Significant data overlap (${Math.round(overlapRatio * 100)}% overlap)`);
          } else if (overlapRatio >= 0.3) {
            confidence += 25;
            reasons.push(`Moderate data overlap (${Math.round(overlapRatio * 100)}% overlap)`);
          } else {
            confidence += 10;
            reasons.push(`Subtle unique value intersection`);
          }

          // Key Uniqueness ratio & Cardinality
          // 1:N or N:1 or 1:1 or N:M
          const isUnique1 = prof1.uniqueCount >= ds1.rowCount * 0.95;
          const isUnique2 = prof2.uniqueCount >= ds2.rowCount * 0.95;

          let cardinality: '1:1' | '1:N' | 'N:1' | 'N:M' = 'N:M';
          let sourceDatasetId = ds1.id;
          let targetDatasetId = ds2.id;
          let sourceColumn = col1;
          let targetColumn = col2;

          if (isUnique1 && isUnique2) {
            cardinality = '1:1';
            confidence += 20;
            reasons.push(`Both columns are unique, suggesting a One-to-One relationship`);
          } else if (isUnique1 && !isUnique2) {
            cardinality = '1:N';
            confidence += 20;
            reasons.push(`"${col1}" is unique in ${ds1.name}, serving as a primary key`);
            const nonPresentRatio = (val2Size - overlapCount) / val2Size;
            if (nonPresentRatio > 0.05) {
              warnings.push(`${Math.round(nonPresentRatio * 100)}% of values in ${ds2.name}.${col2} do not exist in ${ds1.name}.${col1} (potential orphan values)`);
            }
          } else if (!isUnique1 && isUnique2) {
            // Let's standardise the suggestion to be source (One) -> target (Many)
            // So we swap source and target to make it One-to-Many (1:N)
            cardinality = '1:N';
            sourceDatasetId = ds2.id;
            targetDatasetId = ds1.id;
            sourceColumn = col2;
            targetColumn = col1;
            confidence += 20;
            reasons.push(`"${col2}" is unique in ${ds2.name}, serving as a primary key`);
            const nonPresentRatio = (val1Size - overlapCount) / val1Size;
            if (nonPresentRatio > 0.05) {
              warnings.push(`${Math.round(nonPresentRatio * 100)}% of values in ${ds1.name}.${col1} do not exist in ${ds2.name}.${col2} (potential orphan values)`);
            }
          } else {
            cardinality = 'N:M';
            confidence += 5;
            warnings.push(`Ambiguous many-to-many relationship (duplicate values on both sides)`);
          }

          // Data Type Match Reason
          reasons.push(`Identical data types (${type1})`);

          // Clamp confidence
          const finalConfidence = Math.min(99, Math.max(10, Math.round(confidence)));

          // Discard if confidence is too low and has poor data overlap or unrelated
          if (finalConfidence < 40) continue;

          // Prevent duplicate suggestions with different order
          const existingSug = suggestions.find(s => 
            (s.sourceDatasetId === sourceDatasetId && s.targetDatasetId === targetDatasetId && s.sourceColumn === sourceColumn && s.targetColumn === targetColumn) ||
            (s.sourceDatasetId === targetDatasetId && s.targetDatasetId === sourceDatasetId && s.sourceColumn === targetColumn && s.targetColumn === sourceColumn)
          );

          if (!existingSug) {
            suggestions.push({
              id: `${sourceDatasetId}-${sourceColumn}-${targetDatasetId}-${targetColumn}`,
              sourceDatasetId,
              targetDatasetId,
              sourceColumn,
              targetColumn,
              confidence: finalConfidence,
              type: cardinality,
              reason: reasons.join('. '),
              status: 'pending',
              warnings
            });
          }
        }
      }
    }
  }

  // Sort by highest confidence first
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

export interface RelationshipValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    overlapPct: number;
    unmatchedCount: number;
    totalCount: number;
    sampleMatches: string[];
  };
}

export function validateRelationship(
  sourceDataset: Dataset,
  sourceColumn: string,
  targetDataset: Dataset,
  targetColumn: string,
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:M'
): RelationshipValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Existing checks
  if (!sourceDataset || !targetDataset) {
    return {
      isValid: false,
      errors: ['One or both datasets do not exist.'],
      warnings: [],
      stats: { overlapPct: 0, unmatchedCount: 0, totalCount: 0, sampleMatches: [] }
    };
  }

  const srcHeaders = sourceDataset.headers || [];
  const tgtHeaders = targetDataset.headers || [];

  if (!sourceColumn || !srcHeaders.includes(sourceColumn)) {
    errors.push(`Column "${sourceColumn}" does not exist in dataset "${sourceDataset.name}".`);
  }
  if (!targetColumn || !tgtHeaders.includes(targetColumn)) {
    errors.push(`Column "${targetColumn}" does not exist in dataset "${targetDataset.name}".`);
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
      stats: { overlapPct: 0, unmatchedCount: 0, totalCount: 0, sampleMatches: [] }
    };
  }

  // 2. Circular / self relationship
  if (sourceDataset.id === targetDataset.id) {
    if (sourceColumn === targetColumn) {
      errors.push('Cannot relate a column to itself in the same dataset.');
    } else {
      warnings.push(`Self-relationship detected: relating different columns in the same dataset "${sourceDataset.name}".`);
    }
  }

  const prof1 = sourceDataset.columnProfiles[sourceColumn];
  const prof2 = targetDataset.columnProfiles[targetColumn];

  // 3. Data type compatibility
  if (prof1 && prof2) {
    const type1 = prof1.type;
    const type2 = prof2.type;
    const isCompatible = 
      type1 === type2 ||
      (type1 === 'text' && type2 === 'categorical') ||
      (type1 === 'categorical' && type2 === 'text') ||
      (type1 === 'numeric' && type2 === 'text') ||
      (type1 === 'text' && type2 === 'numeric');

    if (!isCompatible) {
      errors.push(`Incompatible data types: "${sourceColumn}" is ${type1}, but "${targetColumn}" is ${type2}.`);
    } else if (type1 !== type2) {
      warnings.push(`Mixed data types: relating a ${type1} column to a ${type2} column.`);
    }
  }

  // 4. Overlap & unique key statistics
  const data1 = sourceDataset.fullData && sourceDataset.fullData.length > 0 ? sourceDataset.fullData : sourceDataset.data;
  const data2 = targetDataset.fullData && targetDataset.fullData.length > 0 ? targetDataset.fullData : targetDataset.data;

  const set1 = new Set(
    data1
      .map(r => String(r[sourceColumn] !== undefined && r[sourceColumn] !== null ? r[sourceColumn] : '').trim())
      .filter(v => v !== '' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined')
  );

  const set2 = new Set(
    data2
      .map(r => String(r[targetColumn] !== undefined && r[targetColumn] !== null ? r[targetColumn] : '').trim())
      .filter(v => v !== '' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'undefined')
  );

  const totalCount = set2.size;
  let matchedCount = 0;
  const sampleMatches: string[] = [];

  for (const val of set2) {
    if (set1.has(val)) {
      matchedCount++;
      if (sampleMatches.length < 5) {
        sampleMatches.push(val);
      }
    }
  }

  const unmatchedCount = totalCount - matchedCount;
  const overlapPct = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

  if (totalCount === 0 || set1.size === 0) {
    errors.push('No valid records found in one or both columns to compute values alignment.');
  } else if (overlapPct === 0) {
    errors.push('Zero value overlap: columns do not contain any matching key values.');
  } else if (overlapPct < 15) {
    warnings.push(`Extremely low overlap (${overlapPct}%): only ${matchedCount} out of ${totalCount} keys align.`);
  } else if (overlapPct < 70) {
    warnings.push(`Moderate overlap (${overlapPct}%): ${unmatchedCount} values are unmatched. This might lead to missing relation keys.`);
  }

  // 5. Cardinality Compatibility check
  const isUnique1 = prof1 ? prof1.uniqueCount >= sourceDataset.rowCount * 0.95 : true;
  const isUnique2 = prof2 ? prof2.uniqueCount >= targetDataset.rowCount * 0.95 : true;

  if (cardinality === '1:1') {
    if (!isUnique1 || !isUnique2) {
      warnings.push('One-to-One selected, but one or both columns contain duplicate values.');
    }
  } else if (cardinality === '1:N') {
    if (!isUnique1) {
      warnings.push(`One-to-Many selected, but "${sourceColumn}" contains duplicate values (should act as unique key in "${sourceDataset.name}").`);
    }
  } else if (cardinality === 'N:1') {
    if (!isUnique2) {
      warnings.push(`Many-to-One selected, but "${targetColumn}" contains duplicate values (should act as unique key in "${targetDataset.name}").`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      overlapPct,
      unmatchedCount,
      totalCount,
      sampleMatches
    }
  };
}
