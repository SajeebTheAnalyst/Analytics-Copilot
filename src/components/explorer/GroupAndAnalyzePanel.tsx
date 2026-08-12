import React, { useState, useMemo } from 'react';
import { GroupingConfig, ColumnProfile } from '@/types';
import { calculateGroupAndAnalyze, GroupAnalysisResult } from '@/lib/explorerEngine';
import { Layers, BarChart2, PieChart as PieChartIcon, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface GroupAndAnalyzePanelProps {
  data: Record<string, any>[];
  headers: string[];
  columnTypes: Record<string, ColumnProfile['type']>;
  groupingConfig: GroupingConfig | null;
  onChangeGrouping: (config: GroupingConfig | null) => void;
}

const BAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
  '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#a855f7'
];

export function GroupAndAnalyzePanel({
  data,
  headers,
  columnTypes,
  groupingConfig,
  onChangeGrouping,
}: GroupAndAnalyzePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');

  // Find categorical/text columns for Group By, and numeric columns for Metric
  const categoricalHeaders = useMemo(() => {
    return headers.filter(h => columnTypes[h] === 'categorical' || columnTypes[h] === 'text' || columnTypes[h] === 'date' || columnTypes[h] === 'boolean');
  }, [headers, columnTypes]);

  const numericHeaders = useMemo(() => {
    const numCols = headers.filter(h => columnTypes[h] === 'numeric');
    return numCols.length > 0 ? numCols : headers;
  }, [headers, columnTypes]);

  // Initial fallback config if null
  const currentConfig: GroupingConfig = useMemo(() => {
    if (groupingConfig) return groupingConfig;
    return {
      groupByColumn: categoricalHeaders[0] || headers[0] || '',
      metricColumn: numericHeaders[0] || headers[0] || '',
      aggregation: 'sum',
    };
  }, [groupingConfig, categoricalHeaders, numericHeaders, headers]);

  const analysisResult: GroupAnalysisResult = useMemo(() => {
    return calculateGroupAndAnalyze(
      data,
      currentConfig.groupByColumn,
      currentConfig.metricColumn,
      currentConfig.aggregation
    );
  }, [data, currentConfig]);

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
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                  activeTab === 'table' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <TableIcon className="w-3 h-3" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chart')}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                  activeTab === 'chart' ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
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
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls & View */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs glass-panel p-3 rounded-xl">
            {/* Group By Select */}
            <div className="flex items-center gap-2">
              <label className="font-semibold text-zinc-600 dark:text-zinc-400">Group By:</label>
              <select
                value={currentConfig.groupByColumn}
                onChange={(e) => onChangeGrouping({ ...currentConfig, groupByColumn: e.target.value })}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label className="font-semibold text-zinc-600 dark:text-zinc-400">Metric:</label>
              <select
                value={currentConfig.metricColumn}
                onChange={(e) => onChangeGrouping({ ...currentConfig, metricColumn: e.target.value })}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label className="font-semibold text-zinc-600 dark:text-zinc-400">Aggregation:</label>
              <select
                value={currentConfig.aggregation}
                onChange={(e) => onChangeGrouping({ ...currentConfig, aggregation: e.target.value as any })}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="sum">SUM</option>
                <option value="avg">AVERAGE</option>
                <option value="count">COUNT</option>
                <option value="distinct_count">DISTINCT COUNT</option>
                <option value="min">MINIMUM</option>
                <option value="max">MAXIMUM</option>
              </select>
            </div>

            <div className="ml-auto text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Total Metric Value: <span className="font-mono text-blue-600 dark:text-blue-400">{analysisResult.totalMetricValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Results Display */}
          {activeTab === 'table' ? (
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-100 dark:bg-zinc-900 sticky top-0 font-bold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-2 border-r border-zinc-200 dark:border-zinc-800">{currentConfig.groupByColumn}</th>
                    <th className="px-4 py-2 text-right border-r border-zinc-200 dark:border-zinc-800 font-mono">
                      {currentConfig.metricColumn} ({currentConfig.aggregation.toUpperCase()})
                    </th>
                    <th className="px-4 py-2 text-right border-r border-zinc-200 dark:border-zinc-800">Record Count</th>
                    <th className="px-4 py-2 text-right">% of Total</th>
                    <th className="px-4 py-2 w-32">Visual Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.groups.map((g, idx) => (
                    <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100 border-r border-zinc-100 dark:border-zinc-800/60">
                        {g.groupValue}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-blue-600 dark:text-blue-400 border-r border-zinc-100 dark:border-zinc-800/60">
                        {g.metricValue.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400 border-r border-zinc-100 dark:border-zinc-800/60">
                        {g.rowCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-zinc-700 dark:text-zinc-300">
                        {g.percentageOfTotal}%
                      </td>
                      <td className="px-4 py-2">
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(2, g.percentageOfTotal))}%`,
                              backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {analysisResult.groups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-zinc-400">
                        No groups calculated
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5', fontSize: '12px' }}
                    formatter={(val: any) => [val?.toLocaleString(), currentConfig.aggregation.toUpperCase()]}
                  />
                  <Bar dataKey="val" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
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
