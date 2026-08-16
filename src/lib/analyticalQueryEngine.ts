import { Dataset, RelationshipSuggestion, FilterOperator } from '@/types';
import { ModelIntegrityReport } from '@/lib/modelIntegrityEngine';

export type AggregationType = 
  | 'SUM' | 'AVERAGE' | 'COUNT' | 'MIN' | 'MAX' | 'DISTINCT COUNT' 
  | 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count';

// Simple global cache for queries
const QUERY_CACHE = new Map<string, { result: AnalyticalResult; timestamp: number }>();

export interface AnalyticalQuery {
  datasetId: string;
  metric: { column: string; aggregation: AggregationType };
  grouping?: { column: string; period?: 'Year' | 'Quarter' | 'Month' | 'Week' | 'Day' };
  filters?: { column: string; operator: FilterOperator; value: any; secondaryValue?: any }[];
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
  const dataset = datasets.find(d => d.id === query.datasetId);
  const cacheKey = JSON.stringify({ 
    query, 
    datasetUpdate: dataset?.updatedAt || dataset?.rowCount
  });

  const cached = QUERY_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 300000)) { // 5 min cache
    return cached.result;
  }

  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Dataset Resolution
  const primaryDataset = dataset;
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
  
  // Apply filtering (expanded)
  let filteredData = data;
  if (query.filters) {
    filteredData = filteredData.filter(row => {
      return query.filters!.every(filter => {
        const value = row[filter.column];
        const targetValue = filter.value;
        const secondaryValue = filter.secondaryValue;

        // Date normalization if needed
        const isDateColumn = value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && (value.includes('-') || value.includes('/')));
        
        switch (filter.operator) {
          case 'equals': return String(value).toLowerCase() === String(targetValue).toLowerCase();
          case 'does_not_equal': return String(value).toLowerCase() !== String(targetValue).toLowerCase();
          case 'contains': return String(value).toLowerCase().includes(String(targetValue).toLowerCase());
          case 'does_not_contain': return !String(value).toLowerCase().includes(String(targetValue).toLowerCase());
          case 'greater_than': return Number(value) > Number(targetValue);
          case 'less_than': return Number(value) < Number(targetValue);
          case 'greater_than_or_equal': return Number(value) >= Number(targetValue);
          case 'less_than_or_equal': return Number(value) <= Number(targetValue);
          case 'between': {
            const val = Number(value);
            return val >= Number(targetValue) && val <= Number(secondaryValue);
          }
          case 'before': {
            const d1 = new Date(value).getTime();
            const d2 = new Date(targetValue).getTime();
            return d1 < d2;
          }
          case 'after': {
            const d1 = new Date(value).getTime();
            const d2 = new Date(targetValue).getTime();
            return d1 > d2;
          }
          case 'on': {
            const d1 = new Date(value).toDateString();
            const d2 = new Date(targetValue).toDateString();
            return d1 === d2;
          }
          case 'is_empty': return value === null || value === undefined || value === '';
          case 'is_not_empty': return value !== null && value !== undefined && value !== '';
          default: return true;
        }
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

  const result: AnalyticalResult = {
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

  // Cache the successful result
  if (errors.length === 0) {
    QUERY_CACHE.set(cacheKey, { result, timestamp: Date.now() });
  }

  return result;
}

function calculateAggregation(rows: any[], column: string, aggregation: AggregationType): number {
  if (rows.length === 0) return 0;

  const aggString = String(aggregation).toUpperCase().replace(/_/g, ' ').trim();

  if (aggString === 'DISTINCT COUNT') {
    const rawValues = rows
      .map(r => r[column])
      .filter(val => val !== undefined && val !== null);
    const distinctSet = new Set(rawValues.map(v => String(v).trim()));
    return distinctSet.size;
  }

  const values = rows.map(r => Number(r[column])).filter(n => !isNaN(n));
  if (values.length === 0) return 0;

  switch (aggString) {
    case 'SUM': return values.reduce((sum, val) => sum + val, 0);
    case 'AVERAGE': return values.reduce((sum, val) => sum + val, 0) / values.length;
    case 'COUNT': return values.length;
    case 'MIN': return Math.min(...values);
    case 'MAX': return Math.max(...values);
    default: return 0;
  }
}
