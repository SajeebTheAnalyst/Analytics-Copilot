import { Dataset, DashboardFilter, WidgetConfig, RelationshipSuggestion } from '../types';
import { getRowValue, sortTemporalGroups } from './dateIntelligence';

export function executeQuery(
  datasets: Dataset[],
  relationships: RelationshipSuggestion[],
  widget: WidgetConfig,
  filters: DashboardFilter[]
) {
  const primaryDataset = datasets.find(d => d.name === widget.datasetId || d.id === widget.datasetId);
  if (!primaryDataset || !primaryDataset.fullData) return [];

  let data = primaryDataset.fullData;

  // For filters, we apply them to the data if the filter's dataset matches
  const applicableFilters = filters.filter(f => f.datasetId === primaryDataset.name || f.datasetId === primaryDataset.id);
  
  if (applicableFilters.length > 0 || widget.filter) {
    data = data.filter(row => {
      // Check global filters
      for (const filter of applicableFilters) {
        const rowVal = getRowValue(row, filter.column, primaryDataset.headers, primaryDataset.columnSemanticTypes);
        if (filter.value !== null && filter.value !== "" && filter.value !== "all" && String(rowVal) !== String(filter.value)) return false;
      }
      // Check widget specific filter
      if (widget.filter) {
        const val = getRowValue(row, widget.filter.column, primaryDataset.headers, primaryDataset.columnSemanticTypes);
        switch (widget.filter.operator) {
          case 'equals': if (val !== widget.filter.value) return false; break;
          case 'greater': if (Number(val) <= Number(widget.filter.value)) return false; break;
          case 'less': if (Number(val) >= Number(widget.filter.value)) return false; break;
          case 'contains': if (!String(val).toLowerCase().includes(String(widget.filter.value).toLowerCase())) return false; break;
        }
      }
      return true;
    });
  }

  // Handle Aggregations
  if (widget.type === 'kpi') {
    return [{ value: aggregate(data, widget.yAxisColumn!, widget.aggregation || 'count', primaryDataset) }];
  } else {
    // For charts, group by xAxis and aggregate yAxis
    if (!widget.xAxisColumn || !widget.yAxisColumn) return [];
    
    const groups = new Map<any, any[]>();
    for (const row of data) {
      let xVal = getRowValue(row, widget.xAxisColumn, primaryDataset.headers, primaryDataset.columnSemanticTypes);
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
        [widget.yAxisColumn]: aggregate(groupRows, widget.yAxisColumn, widget.aggregation || 'count', primaryDataset)
      });
    }
    
    // Sort by xAxis (attempt natural sort or chronological sort for temporal)
    const match = widget.xAxisColumn.match(/^.+ \((Year|Quarter|Month Name|Month Number|Day|Day of Week|Week Number|Date|Hour|Minute|Time)\)$/);
    if (match) {
      const field = match[1];
      const mappedForSort = result.map(r => ({ ...r, groupValue: r[widget.xAxisColumn!] }));
      const sorted = sortTemporalGroups(mappedForSort, field);
      return sorted.map(s => {
        const { groupValue, ...rest } = s;
        return rest;
      });
    }

    result.sort((a, b) => {
      const vA = a[widget.xAxisColumn!];
      const vB = b[widget.xAxisColumn!];
      if (typeof vA === 'number' && typeof vB === 'number') return vA - vB;
      return String(vA).localeCompare(String(vB));
    });
    
    return result;
  }
}

function aggregate(rows: any[], column: string, fn: string, dataset?: Dataset): number {
  if (rows.length === 0) return 0;
  const headers = dataset?.headers || [];
  const semanticTypes = dataset?.columnSemanticTypes || {};
  
  switch (fn) {
    case 'count':
      return rows.length;
    case 'sum':
      return rows.reduce((sum, row) => sum + (Number(getRowValue(row, column, headers, semanticTypes)) || 0), 0);
    case 'avg':
      const sum = rows.reduce((s, row) => s + (Number(getRowValue(row, column, headers, semanticTypes)) || 0), 0);
      return sum / rows.length;
    case 'min':
      return Math.min(...rows.map(row => Number(getRowValue(row, column, headers, semanticTypes)) || Infinity));
    case 'max':
      return Math.max(...rows.map(row => Number(getRowValue(row, column, headers, semanticTypes)) || -Infinity));
    default:
      return rows.length;
  }
}
