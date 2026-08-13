import React, { useMemo, useState } from 'react';
import { WidgetConfig, Dataset, DashboardFilter, RelationshipSuggestion, KpiDefinition, ColumnFilter } from '@/types';
import { evaluateKpi, formatKpiValue, evaluateSimpleAggregation } from '@/lib/kpiEngine';
import { filterDataset } from '@/lib/explorerEngine';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, 
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { AlertTriangle, Info, ChevronLeft, ChevronRight, ArrowUpDown, Award, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CustomTooltip = ({ active, payload, label, formatConfig, yAxisColumn }: any) => {
  if (active && payload && payload.length) {
    const rawVal = payload[0].value;
    const nameKey = payload[0].name;
    const itemLabel = label || nameKey;
    const formatted = formatKpiValue(Number(rawVal), formatConfig || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false });
    return (
      <div className="p-3 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl text-xs space-y-1 text-zinc-100 z-50">
        <p className="font-semibold text-zinc-400">{String(itemLabel)}</p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="font-bold">{formatted}</span>
          <span className="text-[10px] text-zinc-500 font-mono">({yAxisColumn})</span>
        </div>
        <p className="text-[10px] text-zinc-500 font-medium italic pt-1 border-t border-zinc-800/60 flex items-center gap-1">
          <span>💡</span>
          <span>Click to cross-filter dashboard</span>
        </p>
      </div>
    );
  }
  return null;
};

interface WidgetRendererProps {
  widget: WidgetConfig;
  datasets: Dataset[];
  relationships?: RelationshipSuggestion[];
  filters: DashboardFilter[];
  savedKpis?: KpiDefinition[];
  onDataPointClick?: (column: string, value: string) => void;
  onUpdateWidget?: (updatedConfig: Partial<WidgetConfig>) => void;
}

const COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#d97706', '#6366f1'
];

export function WidgetRenderer({
  widget,
  datasets,
  filters,
  savedKpis = [],
  onDataPointClick,
  onUpdateWidget
}: WidgetRendererProps) {
  // Find primary dataset
  const primaryDataset = datasets.find(d => d.id === widget.datasetId || d.name === widget.datasetId) || datasets[0];

  // 1. Process & Filter Data
  const filteredRows = useMemo(() => {
    if (!primaryDataset) return [];
    const sourceRows = primaryDataset.fullData || primaryDataset.data || [];
    if (sourceRows.length === 0) return [];

    // Convert DashboardFilter[] to ColumnFilter[] for explorerEngine
    const applicableColumnFilters: ColumnFilter[] = filters
      .filter(f => (f.datasetId === primaryDataset.id || f.datasetId === primaryDataset.name) && f.value !== null && f.value !== 'all' && f.value !== '')
      .map(f => ({
        id: f.id,
        column: f.column,
        operator: f.operator || 'equals',
        value: String(f.value),
        secondaryValue: f.secondaryValue
      }));

    // Add widget-level filters
    if (widget.filters && widget.filters.length > 0) {
      applicableColumnFilters.push(...widget.filters);
    }
    if (widget.filter && widget.filter.value) {
      applicableColumnFilters.push({
        id: `w-filter-${widget.id}`,
        column: widget.filter.column,
        operator: widget.filter.operator as any || 'equals',
        value: String(widget.filter.value)
      });
    }

    return filterDataset(sourceRows, applicableColumnFilters, '', []);
  }, [primaryDataset, filters, widget]);

  // 2. Pagination & Sorting state for Table Widget
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!primaryDataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-400">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Dataset Unavailable</span>
        <span className="text-xs text-zinc-500 mt-1">The referenced dataset could not be found.</span>
      </div>
    );
  }

  // ==========================================
  // WIDGET TYPE 1: KPI CARD
  // ==========================================
  if (widget.type === 'kpi') {
    // If widget references a saved KPI, evaluate it using kpiEngine!
    const referencedKpi = widget.kpiId ? savedKpis.find(k => k.id === widget.kpiId) : null;

    if (referencedKpi) {
      const result = evaluateKpi(referencedKpi, datasets, savedKpis);
      const isNeedsAttention = result.status === 'needs_attention' || result.status === 'invalid';

      if (isNeedsAttention) {
        return (
          <div className="h-full flex flex-col justify-between p-1">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Needs Attention
                </span>
                <span className="animate-ping w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              </div>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                {referencedKpi.name}
              </h4>
              <p className="text-2xl font-black text-zinc-400 dark:text-zinc-600 mt-2 tracking-tight">
                Unavailable
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-normal bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 mt-2 font-medium">
                {result.statusReason || 'Referenced measure column or dependency is invalid.'}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="truncate max-w-[70%]">{result.formulaSummary}</span>
              <span className="shrink-0">ID: {referencedKpi.id.slice(0, 10)}...</span>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full flex flex-col justify-between p-1">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {referencedKpi.metricType === 'calculated' ? 'Calculated' : 'Standard'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 line-clamp-1">
              {referencedKpi.name}
            </h4>
            <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 mt-2 select-all">
              {result.formattedResult}
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="truncate font-mono font-medium max-w-[70%] text-zinc-400" title={result.formulaSummary}>
              {result.formulaSummary}
            </span>
            <span className="shrink-0 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
              {result.rowCountEvaluated.toLocaleString()} rows
            </span>
          </div>
        </div>
      );
    }

    // Direct metric fallback calculation
    const rawVal = evaluateSimpleAggregation(filteredRows, widget.yAxisColumn, (widget.aggregation || 'sum') as any);
    const formatConfig = widget.format || {
      type: 'number',
      decimals: 2,
      useThousandsSeparator: true,
      compactNotation: false
    };
    const formatted = formatKpiValue(rawVal, formatConfig);
    const isInvalid = rawVal === null || isNaN(rawVal) || !isFinite(rawVal);

    if (isInvalid) {
      return (
        <div className="h-full flex flex-col justify-between p-1">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                Invalid Metric
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            </div>
            <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 line-clamp-1">
              {widget.title || 'Direct Metric'}
            </h4>
            <p className="text-2xl font-black text-zinc-400 dark:text-zinc-600 mt-2">
              Needs Attention
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
              The aggregate column <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-zinc-700 dark:text-zinc-300">{widget.yAxisColumn || '(None)'}</code> could not be computed.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-850 text-[10px] text-zinc-400 flex justify-between">
            <span>Direct calculation</span>
            <span className="font-mono">No data</span>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col justify-between p-1">
        <div>
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">
            {widget.yAxisColumn ? `${(widget.aggregation || 'sum').toUpperCase()}(${widget.yAxisColumn})` : 'Metric'}
          </span>
          <h4 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 line-clamp-1">
            {widget.title || 'Aggregated Sum'}
          </h4>
          <div className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 mt-2 select-all">
            {formatted}
          </div>
        </div>
        <div className="text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-850 flex justify-between">
          <span>Filtered Result</span>
          <span className="bg-zinc-100 dark:bg-zinc-850 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">{filteredRows.length.toLocaleString()} rows</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // CHART / TABLE AGGREGATION ENGINE
  // ==========================================
  const { xAxisColumn, yAxisColumn, aggregation = 'sum' } = widget;

  if (!xAxisColumn || !yAxisColumn) {
    return (
      <div id={`cfg-attention-${widget.id}`} className="h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Chart configuration needs attention</span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">Dimension or Metric column reference is missing. Select columns to populate chart.</span>
        </div>
      </div>
    );
  }

  const availableHeaders = new Set(primaryDataset.headers || []);
  const isXMissing = !availableHeaders.has(xAxisColumn);
  const isYMissing = !availableHeaders.has(yAxisColumn);

  if (isXMissing || isYMissing) {
    return (
      <div id={`cfg-missing-col-${widget.id}`} className="h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
        <div className="w-8 h-8 rounded-lg bg-zinc-150 dark:bg-zinc-850 flex items-center justify-center text-amber-500">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200 block">Missing columns in active dataset</span>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-normal">
            The configured fields {isXMissing && <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px] font-mono text-rose-600 dark:text-rose-400">{xAxisColumn}</code>} {isXMissing && isYMissing && 'and'} {isYMissing && <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px] font-mono text-rose-600 dark:text-rose-400">{yAxisColumn}</code>} do not exist in the current dataset. Please adjust chart settings.
          </p>
        </div>
      </div>
    );
  }

  // Group filteredRows by xAxisColumn
  const groupedDataMap = new Map<string, Record<string, any>[]>();
  for (const row of filteredRows) {
    let key = row[xAxisColumn];
    if (key === null || key === undefined || key === '') key = '(Blank)';
    else key = String(key);

    if (!groupedDataMap.has(key)) groupedDataMap.set(key, []);
    groupedDataMap.get(key)!.push(row);
  }

  // Aggregate yAxisColumn for each group
  let aggregatedChartData = Array.from(groupedDataMap.entries()).map(([key, groupRows]) => {
    const rawMetric = evaluateSimpleAggregation(groupRows, yAxisColumn, aggregation as any) || 0;
    return {
      [xAxisColumn]: key,
      [yAxisColumn]: rawMetric,
      rowCount: groupRows.length,
      formattedMetric: formatKpiValue(rawMetric, widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: true })
    };
  });

  // Top N / Bottom N Sorting & Filtering
  if (widget.topN && widget.topN !== 0) {
    const isBottomN = widget.topN < 0;
    const limit = Math.abs(widget.topN);

    aggregatedChartData.sort((a, b) => {
      const valA = Number(a[yAxisColumn]) || 0;
      const valB = Number(b[yAxisColumn]) || 0;
      return isBottomN ? valA - valB : valB - valA;
    });

    aggregatedChartData = aggregatedChartData.slice(0, limit);
  } else {
    // Default natural sort by dimension name or date
    aggregatedChartData.sort((a, b) => {
      const valA = a[xAxisColumn];
      const valB = b[xAxisColumn];
      if (!isNaN(Number(valA)) && !isNaN(Number(valB))) return Number(valA) - Number(valB);
      return String(valA).localeCompare(String(valB));
    });
  }

  // High Cardinality Intercept Check
  const isPieDonut = widget.type === 'pie' || widget.type === 'donut';
  const isBar = widget.type === 'bar';
  const cardinality = aggregatedChartData.length;

  const isHighCardinalityPie = isPieDonut && cardinality > 12 && !widget.topN;
  const isHighCardinalityBar = isBar && cardinality > 30 && !widget.topN;

  if (isHighCardinalityPie || isHighCardinalityBar) {
    return (
      <div id={`hc-${widget.id}`} className="h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-50/50 dark:bg-zinc-950/40 border border-amber-200/50 dark:border-amber-900/40 rounded-xl space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">High Cardinality</h4>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Dimension <code className="bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded text-[11px] font-mono">{xAxisColumn}</code> contains {cardinality.toLocaleString()} unique values.
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal">
            {isPieDonut 
              ? "Pie and Donut charts are not suitable for displaying this dimension. Rendering too many slices makes the chart unreadable."
              : "Bar charts with too many categories become dense and illegible. Apply a filter or view as a table instead."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 max-w-sm">
          {onUpdateWidget ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onUpdateWidget({ topN: 10 })}
                className="text-[11px] h-7 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                Use Top 10
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onUpdateWidget({ topN: 20 })}
                className="text-[11px] h-7 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                Use Top 20
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onUpdateWidget({ type: 'table' })}
                className="text-[11px] h-7 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                Use Data Table
              </Button>
            </>
          ) : (
            <span className="text-[10px] text-zinc-400 italic">
              Use the edit modal to set Top 10, Top 20, or switch to a Table layout.
            </span>
          )}
        </div>
      </div>
    );
  }

  if (aggregatedChartData.length === 0) {
    return (
      <div id={`no-data-${widget.id}`} className="h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
          <BarChart2 className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">No data available</span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 block">No matching records found. Try modifying or clearing active dashboard filters.</span>
        </div>
      </div>
    );
  }

  // Custom Chart Wrapper
  const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  );

  // Click Handler for Cross-filtering
  const handlePointClick = (entry: any) => {
    if (onDataPointClick && entry && entry[xAxisColumn]) {
      onDataPointClick(xAxisColumn, String(entry[xAxisColumn]));
    }
  };

  // ==========================================
  // WIDGET TYPE 2: RANKING TABLE
  // ==========================================
  if (widget.type === 'ranking_table') {
    const maxVal = Math.max(...aggregatedChartData.map(d => Number(d[yAxisColumn]) || 0), 1);

    return (
      <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-1 space-y-2">
        {aggregatedChartData.map((item, idx) => {
          const val = Number(item[yAxisColumn]) || 0;
          const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
          const catName = String(item[xAxisColumn]);

          return (
            <div 
              key={idx}
              onClick={() => handlePointClick(item)}
              title="Click to cross-filter dashboard"
              className="p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 cursor-pointer hover:border-blue-500/25 dark:hover:border-blue-500/20 shadow-3xs hover:shadow-2xs transition-all duration-200 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 truncate">
                  <span className={cn(
                    "w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 shadow-3xs",
                    idx === 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-350 border border-amber-200/50 dark:border-amber-800/40" :
                    idx === 1 ? "bg-zinc-150 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50" :
                    idx === 2 ? "bg-amber-100/60 text-amber-900 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/40" :
                    "bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-500 border border-zinc-100 dark:border-zinc-900"
                  )}>
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {catName}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0 bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-100 dark:border-zinc-900/80">
                  {item.formattedMetric}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100/80 dark:bg-zinc-950 rounded-full overflow-hidden border border-zinc-150/40 dark:border-zinc-900/20">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 rounded-full transition-all duration-500 group-hover:from-blue-600 group-hover:to-indigo-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Tooltip hint on hover */}
              <div className="absolute right-2 bottom-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-0.5">
                <span>Filter</span>
                <span className="text-[10px]">➔</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ==========================================
  // WIDGET TYPE 3: ANALYTICAL TABLE WIDGET
  // ==========================================
  if (widget.type === 'table') {
    let sortedTableData = [...aggregatedChartData];
    if (sortCol) {
      sortedTableData.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
          return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }

    const totalPages = Math.ceil(sortedTableData.length / pageSize) || 1;
    const paginatedData = sortedTableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const toggleSort = (col: string) => {
      if (sortCol === col) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortCol(col);
        setSortDir('desc');
      }
    };

    return (
      <div className="h-full flex flex-col justify-between overflow-hidden">
        <div className="overflow-x-auto flex-1 custom-scrollbar border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-blue-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all select-none" onClick={() => toggleSort(xAxisColumn)}>
                  <div className="flex items-center gap-1.5">
                    <span>{xAxisColumn}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-blue-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all select-none" onClick={() => toggleSort(yAxisColumn)}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{yAxisColumn} ({(aggregation || 'sum').toUpperCase()})</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right select-none text-zinc-400 font-medium">Rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/40">
              {paginatedData.map((row, i) => (
                <tr 
                  key={i} 
                  onClick={() => handlePointClick(row)}
                  title="Click to cross-filter dashboard"
                  className="hover:bg-blue-500/5 dark:hover:bg-blue-500/10 cursor-pointer transition-colors group"
                >
                  <td className="py-2.5 px-4 font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {String(row[xAxisColumn])}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {row.formattedMetric}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-zinc-400 dark:text-zinc-550">
                    {row.rowCount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span>Page {currentPage} of {totalPages}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-6 h-6" 
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-6 h-6" 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDGET TYPE 4: PIE / DONUT CHARTS
  // ==========================================
  if (widget.type === 'pie' || widget.type === 'donut') {
    const isHighCardinality = aggregatedChartData.length > 10;

    return (
      <div className="h-full flex flex-col">
        {isHighCardinality && (
          <div className="mb-2 text-[11px] text-amber-750 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40 flex items-center gap-1.5 shrink-0">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="font-medium">High category count ({aggregatedChartData.length}). Recommend applying a Top N filter.</span>
          </div>
        )}
        <div className="flex-1 min-h-0 relative">
          <ChartWrapper>
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={aggregatedChartData}
                cx="50%"
                cy="50%"
                innerRadius={widget.type === 'donut' ? 45 : 0}
                outerRadius={70}
                paddingAngle={widget.type === 'donut' ? 2 : 0}
                dataKey={yAxisColumn}
                nameKey={xAxisColumn}
                onClick={handlePointClick}
                cursor="pointer"
              >
                {aggregatedChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
              />
              <Legend 
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', opacity: 0.8 }} 
              />
            </PieChart>
          </ChartWrapper>
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDGET TYPE 5: LINE & AREA CHARTS
  // ==========================================
  if (widget.type === 'line' || widget.type === 'area') {
    return (
      <ChartWrapper>
        {widget.type === 'area' ? (
          <AreaChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: 10, fill: '#888888' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip 
              content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
            />
            <Area 
              type="monotone" 
              dataKey={yAxisColumn} 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#grad-${widget.id})`}
              onClick={handlePointClick}
            />
          </AreaChart>
        ) : (
          <LineChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: 10, fill: '#888888' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip 
              content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
            />
            <Line 
              type="monotone" 
              dataKey={yAxisColumn} 
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={{ r: 2.5, fill: '#3b82f6' }} 
              activeDot={{ r: 5 }}
              onClick={handlePointClick}
            />
          </LineChart>
        )}
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE 6: BAR CHART & SCATTER
  // ==========================================
  return (
    <ChartWrapper>
      <BarChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
        <XAxis dataKey={xAxisColumn} tick={{ fontSize: 10, fill: '#888888' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip 
          cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
          content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
        />
        <Bar 
          dataKey={yAxisColumn} 
          fill="#3b82f6" 
          radius={[4, 4, 0, 0]}
          onClick={handlePointClick}
          cursor="pointer"
        />
      </BarChart>
    </ChartWrapper>
  );
}
