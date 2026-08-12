import { Dataset, DashboardFilter, WidgetConfig, RelationshipSuggestion } from '../types';

export function executeQuery(
  datasets: Dataset[],
  relationships: RelationshipSuggestion[],
  widget: WidgetConfig,
  filters: DashboardFilter[]
) {
  const primaryDataset = datasets.find(d => d.name === widget.datasetId || d.id === widget.datasetId);
  if (!primaryDataset || !primaryDataset.fullData) return [];

  let data = [...primaryDataset.fullData];

  // TODO: Cross-dataset joins if needed (skipped for now, assuming metrics are mostly derived from primary dataset)
  // For filters, we apply them to the data if the filter's dataset matches
  const applicableFilters = filters.filter(f => f.datasetId === primaryDataset.name || f.datasetId === primaryDataset.id);
  
  for (const filter of applicableFilters) {
    if (filter.value === null) continue;
    data = data.filter(row => row[filter.column] === filter.value);
  }
  
  if (widget.filter) {
    data = data.filter(row => {
      const val = row[widget.filter!.column];
      switch (widget.filter!.operator) {
        case 'equals': return val === widget.filter!.value;
        case 'greater': return Number(val) > Number(widget.filter!.value);
        case 'less': return Number(val) < Number(widget.filter!.value);
        case 'contains': return String(val).toLowerCase().includes(String(widget.filter!.value).toLowerCase());
        default: return true;
      }
    });
  }

  // Handle Aggregations
  if (widget.type === 'kpi') {
    return [{ value: aggregate(data, widget.yAxisColumn!, widget.aggregation || 'count') }];
  } else {
    // For charts, group by xAxis and aggregate yAxis
    if (!widget.xAxisColumn || !widget.yAxisColumn) return [];
    
    const groups = new Map<any, any[]>();
    for (const row of data) {
      let xVal = row[widget.xAxisColumn];
      // Basic formatting for dates
      if (xVal && typeof xVal === 'string' && xVal.match(/^\d{4}-\d{2}-\d{2}/)) {
        xVal = xVal.split('T')[0];
      }
      if (xVal === null || xVal === undefined) xVal = 'Unknown';
      if (!groups.has(xVal)) groups.set(xVal, []);
      groups.get(xVal)!.push(row);
    }
    
    const result = [];
    for (const [key, groupRows] of groups.entries()) {
      result.push({
        [widget.xAxisColumn]: key,
        [widget.yAxisColumn]: aggregate(groupRows, widget.yAxisColumn, widget.aggregation || 'count')
      });
    }
    
    // Sort by xAxis (attempt natural sort)
    result.sort((a, b) => {
      const vA = a[widget.xAxisColumn!];
      const vB = b[widget.xAxisColumn!];
      if (typeof vA === 'number' && typeof vB === 'number') return vA - vB;
      return String(vA).localeCompare(String(vB));
    });
    
    return result;
  }
}

function aggregate(rows: any[], column: string, fn: string): number {
  if (rows.length === 0) return 0;
  
  switch (fn) {
    case 'count':
      return rows.length;
    case 'sum':
      return rows.reduce((sum, row) => sum + (Number(row[column]) || 0), 0);
    case 'avg':
      const sum = rows.reduce((s, row) => s + (Number(row[column]) || 0), 0);
      return sum / rows.length;
    case 'min':
      return Math.min(...rows.map(row => Number(row[column]) || Infinity));
    case 'max':
      return Math.max(...rows.map(row => Number(row[column]) || -Infinity));
    default:
      return rows.length;
  }
}
