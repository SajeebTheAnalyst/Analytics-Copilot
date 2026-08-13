import React, { useState } from 'react';
import { QuickMetricConfig, ColumnProfile } from '@/types';
import { calculateQuickMetric } from '@/lib/explorerEngine';
import { Calculator, Plus, X, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface QuickAggregationsBarProps {
  data: Record<string, any>[];
  headers: string[];
  columnTypes: Record<string, ColumnProfile['type']>;
  quickMetrics: QuickMetricConfig[];
  onAddMetric: (metric: QuickMetricConfig) => void;
  onRemoveMetric: (id: string) => void;
  onSelectMainMetric?: (metricConfig: QuickMetricConfig) => void;
}

export function QuickAggregationsBar({
  data,
  headers,
  columnTypes,
  quickMetrics,
  onAddMetric,
  onRemoveMetric,
  onSelectMainMetric,
}: QuickAggregationsBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState(headers.find(h => columnTypes[h] === 'numeric') || headers[0] || '');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max'>('sum');

  const handleAddMetricSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCol) return;

    const newMetric: QuickMetricConfig = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      column: selectedCol,
      aggregation,
    };

    onAddMetric(newMetric);
    setIsOpen(false);
  };

  const formatMetricValue = (val: number | string, agg: string) => {
    if (typeof val === 'string') return val;
    if (agg === 'count' || agg === 'distinct_count') {
      return val.toLocaleString();
    }
    // Currency / Decimal format
    if (Math.abs(val) >= 1000) {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border-b border-zinc-200/80 dark:border-zinc-800/80 px-6 py-2 flex flex-wrap items-center gap-3 shrink-0 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-450 shrink-0 mr-1">
        <Calculator className="w-3.5 h-3.5 text-indigo-500" />
        <span>Calculated Summary:</span>
      </div>

      {/* Metric Cards */}
      {quickMetrics.map((m) => {
        const res = calculateQuickMetric(data, m.column, m.aggregation);
        return (
          <div
            key={m.id}
            className="flex items-center gap-3 px-3 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg shadow-3xs hover:border-blue-500 hover:ring-1 hover:ring-blue-500/10 transition-all duration-150 group"
          >
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-400 dark:text-zinc-500 leading-tight">
                {m.column} • <span className="text-zinc-500 dark:text-zinc-450 font-medium">{res.label}</span>
              </span>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 font-mono mt-0.5">
                {formatMetricValue(res.value, m.aggregation)}
              </span>
            </div>

            {quickMetrics.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveMetric(m.id)}
                className="text-zinc-400 hover:text-red-500 p-0.5 rounded transition-colors ml-1 cursor-pointer opacity-40 group-hover:opacity-100"
                title="Remove metric"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      {/* Add Metric Popover */}
      <div className="relative inline-block">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-1.5 text-xs h-7.5 px-3 bg-white dark:bg-zinc-900 border-dashed border-zinc-350 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-blue-500 cursor-pointer shadow-3xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Metric
        </Button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-72 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 z-50 text-xs shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-bold text-zinc-950 dark:text-zinc-50">Add Quick Metric</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddMetricSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                  Metric Column
                </label>
                <select
                  value={selectedCol}
                  onChange={(e) => setSelectedCol(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h} ({columnTypes[h] || 'text'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                  Aggregation
                </label>
                <select
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value as any)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                  <option value="distinct_count">Distinct Count</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  Add Metric
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
