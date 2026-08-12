import { Dataset } from '../types';

export interface AnalyzePlan {
  type: 'aggregation' | 'statistical_summary' | 'anomaly_detection';
  datasetId: string;
  metrics?: { column: string; aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max' }[];
  dimensions?: string[];
  filters?: { column: string; operator: 'equals' | 'greater' | 'less' | 'contains'; value: any }[];
  targetColumn?: string; // For statistical summary
}

export function executeAnalysis(datasets: Dataset[], plan: AnalyzePlan) {
  const dataset = datasets.find(d => d.id === plan.datasetId || d.name === plan.datasetId);
  if (!dataset || !dataset.fullData) {
    return { error: 'Dataset not found or has no data.' };
  }

  let data = [...dataset.fullData];
  
  if (plan.filters) {
    for (const f of plan.filters) {
       data = data.filter(row => {
          const v = row[f.column];
          if (f.operator === 'equals') return v == f.value;
          if (f.operator === 'contains') return String(v).toLowerCase().includes(String(f.value).toLowerCase());
          if (f.operator === 'greater') return Number(v) > Number(f.value);
          if (f.operator === 'less') return Number(v) < Number(f.value);
          return true;
       });
    }
  }

  if (plan.type === 'aggregation') {
    if (!plan.metrics || plan.metrics.length === 0) return { error: 'No metrics provided.' };
    
    if (!plan.dimensions || plan.dimensions.length === 0) {
      // Overall aggregation
      const result: any = {};
      for (const m of plan.metrics) {
        result[`${m.aggregation}_${m.column}`] = aggregate(data, m.column, m.aggregation);
      }
      return [result];
    }

    // Group by dimensions
    const groups = new Map<string, any[]>();
    for (const row of data) {
      const key = plan.dimensions.map(d => row[d] || 'Unknown').join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const result = [];
    for (const [key, groupRows] of groups.entries()) {
      const row: any = {};
      const keyParts = key.split('|');
      plan.dimensions.forEach((d, i) => { row[d] = keyParts[i]; });
      
      for (const m of plan.metrics) {
        row[`${m.aggregation}_${m.column}`] = aggregate(groupRows, m.column, m.aggregation);
      }
      result.push(row);
    }
    
    // Sort by first metric descending by default
    const firstMetric = `${plan.metrics[0].aggregation}_${plan.metrics[0].column}`;
    result.sort((a, b) => (b[firstMetric] || 0) - (a[firstMetric] || 0));
    
    // Return top 100 rows to avoid exploding the context window
    return result.slice(0, 100);
  }

  if (plan.type === 'statistical_summary') {
    if (!plan.targetColumn) return { error: 'No target column provided.' };
    
    const values = data.map(r => Number(r[plan.targetColumn])).filter(n => !isNaN(n));
    if (values.length === 0) return { error: 'No numerical values found in target column.' };
    
    values.sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const min = values[0];
    const max = values[count - 1];
    const median = values[Math.floor(count / 2)];
    
    // Std dev
    const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);
    
    const q1 = values[Math.floor(count * 0.25)];
    const q3 = values[Math.floor(count * 0.75)];
    
    return {
      count, mean, median, min, max, stdDev, q1, q3,
      distribution: 'Summary computed successfully.'
    };
  }

  if (plan.type === 'anomaly_detection') {
    // Basic Z-score based anomaly detection on a target metric (usually after aggregation if dimensions provided)
    if (!plan.metrics || plan.metrics.length === 0) return { error: 'No metrics provided.' };
    const m = plan.metrics[0];
    
    let targetData = data;
    if (plan.dimensions && plan.dimensions.length > 0) {
      // Group first
      const groups = new Map<string, any[]>();
      for (const row of data) {
        const key = plan.dimensions.map(d => row[d] || 'Unknown').join('|');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }
      targetData = [];
      for (const [key, groupRows] of groups.entries()) {
        const row: any = {};
        const keyParts = key.split('|');
        plan.dimensions.forEach((d, i) => { row[d] = keyParts[i]; });
        row[m.column] = aggregate(groupRows, m.column, m.aggregation);
        targetData.push(row);
      }
    }

    const values = targetData.map(r => Number(r[m.column])).filter(n => !isNaN(n));
    if (values.length === 0) return { error: 'No values to analyze for anomalies.' };
    
    const count = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / count);
    
    const anomalies = targetData.filter(r => {
      const v = Number(r[m.column]);
      if (isNaN(v)) return false;
      const zScore = Math.abs((v - mean) / stdDev);
      return zScore > 2; // Threshold for anomaly
    });
    
    return {
      totalAnalyzed: count,
      mean,
      stdDev,
      anomalies: anomalies.slice(0, 50).map(a => ({
        ...a,
        _zScore: ((Number(a[m.column]) - mean) / stdDev).toFixed(2),
        _expectedRange: `${(mean - 2*stdDev).toFixed(2)} to ${(mean + 2*stdDev).toFixed(2)}`
      }))
    };
  }

  return { error: 'Unsupported analysis type.' };
}

function aggregate(rows: any[], column: string, fn: string): number {
  if (rows.length === 0) return 0;
  switch (fn) {
    case 'count': return rows.length;
    case 'sum': return rows.reduce((sum, row) => sum + (Number(row[column]) || 0), 0);
    case 'avg': return rows.reduce((sum, row) => sum + (Number(row[column]) || 0), 0) / rows.length;
    case 'min': return Math.min(...rows.map(row => Number(row[column]) || Infinity));
    case 'max': return Math.max(...rows.map(row => Number(row[column]) || -Infinity));
    default: return rows.length;
  }
}
