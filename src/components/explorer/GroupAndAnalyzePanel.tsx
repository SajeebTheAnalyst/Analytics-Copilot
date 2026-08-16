import React, { useState, useMemo } from 'react';
import { 
  calculateGroupAndAnalyze, 
  GroupAnalysisResult, 
  formatCompactNumber, 
  detectCurrencySymbol 
} from '@/lib/explorerEngine';
import { getExtendedHeadersForDataset, getExtendedColumnTypesForDataset } from '@/lib/dateIntelligence';
import { Layers, BarChart2, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { Dataset, GroupingConfig, ColumnProfile } from '@/types';

interface GroupAndAnalyzePanelProps {
  data: Record<string, any>[];
  dataset: Dataset;
  groupingConfig: GroupingConfig | null;
  onChangeGrouping: (config: GroupingConfig | null) => void;
  columnFormats?: Record<string, any>;
}

const BAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
  '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#a855f7'
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  groupByColumn: string;
  metricColumn: string;
  aggregation: string;
  currencySymbol: string | null;
}

function CustomTooltip({
  active,
  payload,
  label,
  groupByColumn,
  metricColumn,
  aggregation,
  currencySymbol,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  const categoryName = dataPoint.fullName || label || dataPoint.name || 'Group';
  const rawValue = Number(dataPoint.val);
  const formattedCompact = formatCompactNumber(rawValue, currencySymbol);

  const exactFormatted = !isNaN(rawValue)
    ? `${currencySymbol || ''}${rawValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : String(dataPoint.val);

  const aggregationLabel = aggregation.toUpperCase();
  const metricLabel = `${metricColumn} (${aggregationLabel})`;

  return (
    <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-250 dark:border-zinc-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[210px] pointer-events-none z-50">
      {/* Category Name */}
      <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 border-b border-zinc-150 dark:border-zinc-800 pb-1.5 flex items-center justify-between gap-3">
        <span className="truncate max-w-[140px]" title={categoryName}>{categoryName}</span>
        {dataPoint.percentage !== undefined && (
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40 shrink-0">
            {dataPoint.percentage}%
          </span>
        )}
      </div>

      {/* Metric Name */}
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {metricLabel}
      </div>

      {/* Value Block */}
      <div className="pt-0.5 flex items-baseline justify-between gap-3">
        <span className="text-base font-extrabold font-mono text-blue-600 dark:text-blue-400 tracking-tight">
          {formattedCompact}
        </span>
        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 font-bold">
          ({exactFormatted})
        </span>
      </div>

      {/* Record Count */}
      {dataPoint.rows !== undefined && (
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60 flex justify-between">
          <span>Rows in group:</span>
          <span className="font-bold text-zinc-700 dark:text-zinc-300">{dataPoint.rows.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

export function GroupAndAnalyzePanel({
  data,
  dataset,
  groupingConfig,
  onChangeGrouping,
  columnFormats,
}: GroupAndAnalyzePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');

  // Find categorical/text columns for Group By, and numeric columns for Metric
  const categoricalHeaders = useMemo(() => {
    const extendedHeaders = getExtendedHeadersForDataset(dataset);
    const extendedTypes = getExtendedColumnTypesForDataset(dataset);
    return extendedHeaders.filter(h => 
      extendedTypes[h] === 'categorical' || 
      extendedTypes[h] === 'text' || 
      extendedTypes[h] === 'date' || 
      extendedTypes[h] === 'boolean'
    );
  }, [dataset]);

  const numericHeaders = useMemo(() => {
    const extendedHeaders = getExtendedHeadersForDataset(dataset);
    const extendedTypes = getExtendedColumnTypesForDataset(dataset);
    const numCols = extendedHeaders.filter(h => extendedTypes[h] === 'numeric');
    return numCols.length > 0 ? numCols : extendedHeaders;
  }, [dataset]);

  const extendedHeaders = useMemo(() => getExtendedHeadersForDataset(dataset), [dataset]);

  // Initial fallback config if null
  const currentConfig: GroupingConfig = useMemo(() => {
    if (groupingConfig) return groupingConfig;
    return {
      groupByColumn: categoricalHeaders[0] || extendedHeaders[0] || '',
      metricColumn: numericHeaders[0] || extendedHeaders[0] || '',
      aggregation: 'sum',
    };
  }, [groupingConfig, categoricalHeaders, numericHeaders, extendedHeaders]);

  // Detect currency symbol ($ / ৳ / € / ₹) if applicable
  const currencySymbol = useMemo(() => {
    if (currentConfig.aggregation === 'count' || currentConfig.aggregation === 'distinct_count') {
      return null;
    }
    return detectCurrencySymbol(currentConfig.metricColumn, columnFormats, data);
  }, [currentConfig.metricColumn, currentConfig.aggregation, columnFormats, data]);

  const analysisResult: GroupAnalysisResult = useMemo(() => {
    return calculateGroupAndAnalyze(
      data,
      currentConfig.groupByColumn,
      currentConfig.metricColumn,
      currentConfig.aggregation,
      dataset
    );
  }, [data, currentConfig, dataset]);

  const chartData = useMemo(() => {
    return analysisResult.groups.slice(0, 10).map(g => ({
      name: g.groupValue.length > 18 ? `${g.groupValue.substring(0, 15)}...` : g.groupValue,
      fullName: g.groupValue,
      val: g.metricValue,
      percentage: g.percentageOfTotal,
      rows: g.rowCount,
    }));
  }, [analysisResult]);

  return (
    <div className="glass-panel border-l-0 border-r-0 border-t-0 shrink-0 transition-all z-10">
      {/* Panel Header */}
      <div className="px-6 py-2.5 bg-zinc-50/20 dark:bg-zinc-900/20 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Group & Analyze
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            ({analysisResult.groups.length} groups calculated from filtered data)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <div className="flex items-center bg-zinc-200/60 dark:bg-zinc-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('table')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer",
                  activeTab === 'table' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-bold" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <TableIcon className="w-3 h-3" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chart')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer",
                  activeTab === 'chart' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-bold" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <BarChart2 className="w-3 h-3" />
                Chart
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls & View */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white dark:bg-[#0c0c0e]">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-3xs">
            {/* Group By Select */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Group By:</label>
              <select
                value={currentConfig.groupByColumn}
                onChange={(e) => onChangeGrouping({ ...currentConfig, groupByColumn: e.target.value })}
                className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer text-xs"
              >
                {categoricalHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Metric Column Select */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Metric:</label>
              <select
                value={currentConfig.metricColumn}
                onChange={(e) => onChangeGrouping({ ...currentConfig, metricColumn: e.target.value })}
                className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer text-xs"
              >
                {numericHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Aggregation Function Select */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Aggregation:</label>
              <select
                value={currentConfig.aggregation}
                onChange={(e) => onChangeGrouping({ ...currentConfig, aggregation: e.target.value as any })}
                className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer text-xs"
              >
                <option value="sum">SUM</option>
                <option value="avg">AVERAGE</option>
                <option value="count">COUNT</option>
                <option value="distinct_count">DISTINCT COUNT</option>
                <option value="min">MINIMUM</option>
                <option value="max">MAXIMUM</option>
              </select>
            </div>

            <div className="ml-auto text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Total Metric Value: <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/30 ml-1.5 font-bold" title={analysisResult.totalMetricValue.toLocaleString()}>
                {formatCompactNumber(analysisResult.totalMetricValue, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Results Display */}
          {activeTab === 'table' ? (
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-60 overflow-y-auto custom-scrollbar shadow-3xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-950 sticky top-0 font-extrabold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-850">
                  <tr>
                    <th className="px-4 py-2.5 border-r border-zinc-200 dark:border-zinc-800/80 font-mono tracking-tight text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{currentConfig.groupByColumn}</th>
                    <th className="px-4 py-2.5 text-right border-r border-zinc-200 dark:border-zinc-800/80 font-mono tracking-tight text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                      {currentConfig.metricColumn} ({currentConfig.aggregation.toUpperCase()})
                    </th>
                    <th className="px-4 py-2.5 text-right border-r border-zinc-200 dark:border-zinc-800/80 font-mono tracking-tight text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Record Count</th>
                    <th className="px-4 py-2.5 text-right border-r border-zinc-200 dark:border-zinc-800/80 font-mono tracking-tight text-[11px] font-bold text-zinc-700 dark:text-zinc-300">% of Total</th>
                    <th className="px-4 py-2.5 w-36 font-mono tracking-tight text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Visual Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/55 dark:divide-zinc-800/40">
                  {analysisResult.groups.map((g, idx) => {
                    const formattedExact = !isNaN(g.metricValue)
                      ? `${currencySymbol || ''}${g.metricValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                      : String(g.metricValue);

                    return (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-2 font-mono text-[11px] font-bold text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800/40">
                          {g.groupValue}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-blue-600 dark:text-blue-450 border-r border-zinc-200 dark:border-zinc-800/40">
                          {formattedExact}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-zinc-600 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800/40">
                          {g.rowCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200 border-r border-zinc-200 dark:border-zinc-800/40">
                          {g.percentageOfTotal}%
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(2, g.percentageOfTotal))}%`,
                                  backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold font-mono w-6 text-right" style={{ color: BAR_COLORS[idx % BAR_COLORS.length] }}>
                              ●
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {analysisResult.groups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-zinc-400 font-medium">
                        No groups calculated
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full pt-2 pb-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 28, right: 30, left: 15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-zinc-200/60 dark:stroke-zinc-800/60" />
                  <XAxis
                    dataKey="name"
                    stroke="currentColor"
                    className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium"
                    fontSize={11}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-zinc-400 dark:text-zinc-500 text-[10px]"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: number) => formatCompactNumber(val, currencySymbol)}
                    domain={[0, (dataMax: number) => (dataMax > 0 ? dataMax * 1.2 : 10)]}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(128, 128, 128, 0.08)' }}
                    wrapperStyle={{ outline: 'none', zIndex: 100 }}
                    content={(props: any) => (
                      <CustomTooltip
                        {...props}
                        groupByColumn={currentConfig.groupByColumn}
                        metricColumn={currentConfig.metricColumn}
                        aggregation={currentConfig.aggregation}
                        currencySymbol={currencySymbol}
                      />
                    )}
                  />
                  <Bar dataKey="val" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="val"
                      position="top"
                      content={(props: any) => {
                        const { x, y, width, height, value } = props;
                        if (value === undefined || value === null || x === undefined || y === undefined) return null;
                        const numVal = Number(value);
                        const formatted = formatCompactNumber(numVal, currencySymbol);
                        const yPos = numVal < 0 ? y + (height || 0) + 14 : y - 7;

                        return (
                          <text
                            x={x + width / 2}
                            y={yPos}
                            textAnchor="middle"
                            className="fill-zinc-800 dark:fill-zinc-100 text-[11px] font-extrabold font-mono tracking-tight select-none"
                          >
                            {formatted}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
