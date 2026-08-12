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

interface WidgetRendererProps {
  widget: WidgetConfig;
  datasets: Dataset[];
  relationships?: RelationshipSuggestion[];
  filters: DashboardFilter[];
  savedKpis?: KpiDefinition[];
  onDataPointClick?: (column: string, value: string) => void;
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
  onDataPointClick
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

      return (
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider truncate">
                {referencedKpi.metricType === 'calculated' ? 'Calculated KPI' : 'Standard Metric'}
              </span>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                result.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" :
                result.status === 'needs_attention' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" :
                "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
              )}>
                {result.status === 'active' ? 'Active' : result.status === 'needs_attention' ? 'Needs Attention' : 'Invalid'}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              {result.formattedResult}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
            <span className="truncate">{result.formulaSummary}</span>
            <span className="shrink-0 text-[11px] font-mono text-zinc-400">{result.rowCountEvaluated.toLocaleString()} rows</span>
          </div>

          {isNeedsAttention && result.warnings.length > 0 && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">{result.warnings[0]}</span>
            </div>
          )}
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

    return (
      <div className="h-full flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {widget.yAxisColumn ? `${(widget.aggregation || 'sum').toUpperCase()}(${widget.yAxisColumn})` : 'Metric'}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            {formatted}
          </div>
        </div>
        <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-between">
          <span>Filtered Result</span>
          <span className="font-mono">{filteredRows.length.toLocaleString()} rows</span>
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
      <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-400">
        <Info className="w-6 h-6 text-zinc-400 mb-1" />
        <span className="text-xs font-medium">Dimension or Metric Column Missing</span>
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

  if (aggregatedChartData.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-400">
        <BarChart2 className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">No matching records found</span>
        <span className="text-xs text-zinc-400 mt-0.5">Try clearing dashboard filters to view chart data.</span>
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
              className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 truncate">
                  <span className={cn(
                    "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                    idx === 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" :
                    idx === 1 ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300" :
                    idx === 2 ? "bg-amber-200/60 text-amber-900 dark:bg-amber-950 dark:text-amber-400" :
                    "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                  )}>
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {catName}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                  {item.formattedMetric}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
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
        <div className="overflow-x-auto flex-1 custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3 cursor-pointer hover:text-blue-600" onClick={() => toggleSort(xAxisColumn)}>
                  <div className="flex items-center gap-1">
                    <span>{xAxisColumn}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-blue-600" onClick={() => toggleSort(yAxisColumn)}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{yAxisColumn} ({(aggregation || 'sum').toUpperCase()})</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Row Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {paginatedData.map((row, i) => (
                <tr 
                  key={i} 
                  onClick={() => handlePointClick(row)}
                  className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
                >
                  <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                    {String(row[xAxisColumn])}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {row.formattedMetric}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-zinc-500">
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
          <div className="mb-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-md border border-amber-200 dark:border-amber-900 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>High category count ({aggregatedChartData.length}). Consider Top N filter.</span>
          </div>
        )}
        <div className="flex-1 min-h-0">
          <ChartWrapper>
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={aggregatedChartData}
                cx="50%"
                cy="50%"
                innerRadius={widget.type === 'donut' ? 55 : 0}
                outerRadius={80}
                paddingAngle={widget.type === 'donut' ? 3 : 0}
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
                formatter={(val: any) => [
                  formatKpiValue(Number(val), widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false }),
                  yAxisColumn
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', backgroundColor: '#ffffff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
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
          <AreaChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip 
              formatter={(val: any) => [
                formatKpiValue(Number(val), widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false }),
                yAxisColumn
              ]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', backgroundColor: '#ffffff', fontSize: '12px' }}
            />
            <Area 
              type="monotone" 
              dataKey={yAxisColumn} 
              stroke="#2563eb" 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#grad-${widget.id})`}
              onClick={handlePointClick}
            />
          </AreaChart>
        ) : (
          <LineChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip 
              formatter={(val: any) => [
                formatKpiValue(Number(val), widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false }),
                yAxisColumn
              ]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', backgroundColor: '#ffffff', fontSize: '12px' }}
            />
            <Line 
              type="monotone" 
              dataKey={yAxisColumn} 
              stroke="#2563eb" 
              strokeWidth={2.5} 
              dot={{ r: 3, fill: '#2563eb' }} 
              activeDot={{ r: 6 }}
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
      <BarChart data={aggregatedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
        <XAxis dataKey={xAxisColumn} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip 
          cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
          formatter={(val: any) => [
            formatKpiValue(Number(val), widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false }),
            yAxisColumn
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', backgroundColor: '#ffffff', fontSize: '12px' }}
        />
        <Bar 
          dataKey={yAxisColumn} 
          fill="#2563eb" 
          radius={[4, 4, 0, 0]}
          onClick={handlePointClick}
          cursor="pointer"
        />
      </BarChart>
    </ChartWrapper>
  );
}
