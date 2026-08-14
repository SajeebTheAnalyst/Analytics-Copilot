import { Dataset, RelationshipSuggestion } from '@/types';
import { ModelIntegrityReport } from '@/lib/modelIntegrityEngine';

export type AggregationType = 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX';

export interface AnalyticalQuery {
  datasetId: string;
  metric: { column: string; aggregation: AggregationType };
  grouping?: { column: string; period?: 'Year' | 'Quarter' | 'Month' | 'Week' | 'Day' };
  filters?: { column: string; operator: 'equals' | 'greater' | 'less'; value: any }[];
  relatedDatasetId?: string;
  relationshipId?: string;
}

export interface AnalyticalResult {
  rows: Record<string, any>[];
  datasetId: string;
  query: AnalyticalQuery;
  warnings?: string[];
  errors?: string[];
  metadata: {
    executionTimeMs: number;
    rowCount: number;
  };
}

/**
 * Deterministic analytical query engine
 * for MIS reporting / dashboard generation.
 */
export function executeAnalyticalQuery(
  datasets: Dataset[],
  suggestions: RelationshipSuggestion[],
  integrityReport: ModelIntegrityReport,
  query: AnalyticalQuery
): AnalyticalResult {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Dataset Resolution
  const primaryDataset = datasets.find(d => d.id === query.datasetId);
  if (!primaryDataset) {
    return {
      rows: [],
      datasetId: query.datasetId,
      query,
      errors: ['Primary dataset not found.'],
      metadata: { executionTimeMs: 0, rowCount: 0 }
    };
  }

  // 2. Relationship/Context Resolution (simplified for now as per constraints)
  // Check if requested relationship is valid/blocked
  if (query.relationshipId) {
    const rel = suggestions.find(s => s.id === query.relationshipId);
    const integrityIssue = integrityReport.issues.find(i => i.relId === query.relationshipId && i.type === 'critical');
    
    if (!rel || integrityIssue) {
      errors.push(`MODEL_RELATIONSHIP_INVALID: ${query.relationshipId}`);
    }
  }

  // 3. Execution (Aggregated Data - deterministic)
  // Reusing aggregation logic principles from analyticsEngine.ts
  const data = primaryDataset.fullData || [];
  
  // Apply filtering (simplified)
  let filteredData = data;
  if (query.filters) {
    filteredData = filteredData.filter(row => {
      return query.filters!.every(filter => {
        const value = row[filter.column];
        if (filter.operator === 'equals') return value == filter.value;
        if (filter.operator === 'greater') return Number(value) > Number(filter.value);
        if (filter.operator === 'less') return Number(value) < Number(filter.value);
        return true;
      });
    });
  }

  // Perform aggregation/grouping
  let rows: Record<string, any>[] = [];
  
  if (query.grouping) {
    // Grouping
    const groups = new Map<string, any[]>();
    filteredData.forEach(row => {
      const groupValue = row[query.grouping!.column] || 'Unknown';
      if (!groups.has(groupValue)) groups.set(groupValue, []);
      groups.get(groupValue)!.push(row);
    });

    groups.forEach((groupRows, key) => {
      const aggVal = calculateAggregation(groupRows, query.metric.column, query.metric.aggregation);
      rows.push({ [query.grouping!.column]: key, result: aggVal });
    });
  } else {
    // Simple aggregation
    const aggVal = calculateAggregation(filteredData, query.metric.column, query.metric.aggregation);
    rows.push({ result: aggVal });
  }

  return {
    rows,
    datasetId: query.datasetId,
    query,
    warnings: warnings.length > 0 ? warnings : undefined,
    errors: errors.length > 0 ? errors : undefined,
    metadata: {
      executionTimeMs: performance.now() - startTime,
      rowCount: rows.length
    }
  };
}

function calculateAggregation(rows: any[], column: string, aggregation: AggregationType): number {
  if (rows.length === 0) return 0;
  const values = rows.map(r => Number(r[column])).filter(n => !isNaN(n));
  if (values.length === 0) return 0;

  switch (aggregation) {
    case 'SUM': return values.reduce((sum, val) => sum + val, 0);
    case 'AVERAGE': return values.reduce((sum, val) => sum + val, 0) / values.length;
    case 'COUNT': return values.length;
    case 'MIN': return Math.min(...values);
    case 'MAX': return Math.max(...values);
    default: return 0;
  }
}
