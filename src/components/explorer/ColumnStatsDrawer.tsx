import React from 'react';
import { ColumnProfile } from '@/types';
import { calculateColumnStats } from '@/lib/explorerEngine';
import { BarChart3, Hash, Calendar, CaseSensitive, HelpCircle, X, Percent, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnStatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filteredData: Record<string, any>[];
  totalDatasetRowCount: number;
  selectedColumn: string;
  columnTypes: Record<string, ColumnProfile['type']>;
  allHeaders: string[];
  onSelectColumn: (column: string) => void;
  isFilteredActive: boolean;
}

export function ColumnStatsDrawer({
  isOpen,
  onClose,
  filteredData,
  totalDatasetRowCount,
  selectedColumn,
  columnTypes,
  allHeaders,
  onSelectColumn,
  isFilteredActive,
}: ColumnStatsDrawerProps) {
  if (!isOpen || !selectedColumn) return null;

  const colType = columnTypes[selectedColumn] || 'text';
  const stats = calculateColumnStats(filteredData, selectedColumn, colType);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-4 h-4 text-blue-500" />;
      case 'date':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'categorical':
        return <CaseSensitive className="w-4 h-4 text-orange-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-[#0c0c0e] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col transition-all">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Column Statistics
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filtered Data Context Label */}
      <div className="px-4 py-2 bg-blue-50/60 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium">
        <span>Statistics for filtered data</span>
        <span className="font-mono text-[11px] bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
          {filteredData.length.toLocaleString()} rows
        </span>
      </div>

      {/* Column Selector Dropdown */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <label className="block text-xs font-semibold text-zinc-500 mb-1">
          Inspecting Column
        </label>
        <select
          value={selectedColumn}
          onChange={(e) => onSelectColumn(e.target.value)}
          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {allHeaders.map((h) => (
            <option key={h} value={h}>
              {h} ({columnTypes[h] || 'text'})
            </option>
          ))}
        </select>
      </div>

      {/* Main Stats Scrollable Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 text-xs">
        {/* Column Identity Badge */}
        <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">
            {getTypeIcon(stats.type)}
            <span className="truncate">{stats.column}</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
            {stats.type}
          </span>
        </div>

        {/* General Summary Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-semibold block mb-1">Total Count</span>
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {stats.totalCount.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-semibold block mb-1">Unique Values</span>
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {stats.uniqueCount.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-semibold block mb-1">Missing (Nulls)</span>
            <span className={cn("text-base font-bold font-mono", stats.nullCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
              {stats.nullCount.toLocaleString()} <span className="text-xs font-normal">({stats.missingPercentage}%)</span>
            </span>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-semibold block mb-1">Non-Null Count</span>
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {stats.nonNullCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Numeric Specific Metrics */}
        {stats.type === 'numeric' && (
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs uppercase tracking-wider">
              Statistical Measures
            </h4>
            <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 divide-y divide-zinc-200 dark:divide-zinc-800 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-500 font-sans">Minimum</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats.min !== null && stats.min !== undefined ? stats.min.toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-zinc-500 font-sans">Maximum</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats.max !== null && stats.max !== undefined ? stats.max.toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-zinc-500 font-sans">Mean (Average)</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{stats.mean !== null && stats.mean !== undefined ? stats.mean.toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-zinc-500 font-sans">Median</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.median !== null && stats.median !== undefined ? stats.median.toLocaleString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-zinc-500 font-sans">Std Deviation</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{stats.stdDev !== null && stats.stdDev !== undefined ? stats.stdDev.toLocaleString() : 'N/A'}</span>
              </div>
              {stats.sum !== null && stats.sum !== undefined && (
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-zinc-500 font-sans">Total Sum</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats.sum.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categorical / Text Top Values Frequency */}
        {stats.topValues && stats.topValues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs uppercase tracking-wider">
              Top Frequent Values
            </h4>
            <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-3">
              {stats.topValues.map((tv, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2" title={tv.value}>
                      {tv.value}
                    </span>
                    <span className="font-mono text-zinc-500 shrink-0">
                      {tv.count.toLocaleString()} ({tv.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(2, tv.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date Metrics */}
        {stats.type === 'date' && (
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs uppercase tracking-wider">
              Date Range
            </h4>
            <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-sans">Minimum Date:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.minDate || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-sans">Maximum Date:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.maxDate || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
