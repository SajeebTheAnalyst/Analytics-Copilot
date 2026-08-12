import React, { useState } from 'react';
import { Dataset } from '@/types';
import { TrendingUp, Plus, Calculator, Database, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';

interface KpiBuilderViewProps {
  datasets: Dataset[];
}

export function KpiBuilderView({ datasets }: KpiBuilderViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(datasets[0]?.id || '');

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
  const numericColumns = selectedDataset 
    ? selectedDataset.headers.filter(h => selectedDataset.columnProfiles[h]?.type === 'numeric')
    : [];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505] p-6 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">KPI Builder</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Define calculated metrics, custom formulas, and business KPIs across your datasets.
          </p>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/50">
          <Calculator className="w-10 h-10 text-zinc-400 mb-3" />
          <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">No Datasets Available</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Import a dataset in the Data Workspace to begin configuring custom KPIs and formula metrics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dataset Selector & Columns */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4 shadow-xs">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Target Dataset
              </label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-medium"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.rowCount.toLocaleString()} rows)</option>
                ))}
              </select>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Available Numeric Measures
              </h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                {numericColumns.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No numeric columns found in this dataset.</p>
                ) : (
                  numericColumns.map(col => (
                    <div key={col} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 text-xs font-mono">
                      <span className="text-zinc-800 dark:text-zinc-200">{col}</span>
                      <span className="text-[10px] text-zinc-400 uppercase">Numeric</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Formula Builder Canvas */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-500" />
                Define Business Metric
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold">
                Formula Engine
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Metric Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Net Margin Ratio, Average Deal Size..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Primary Column
                  </label>
                  <select className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100">
                    {numericColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Aggregation Method
                  </label>
                  <select className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-mono">
                    <option value="SUM">SUM (Total)</option>
                    <option value="AVG">AVG (Average)</option>
                    <option value="COUNT">COUNT (Total Rows)</option>
                    <option value="MAX">MAX (Peak)</option>
                    <option value="MIN">MIN (Minimum)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p>
                  Defined metrics are saved to your workspace session and can be immediately pinned to Dashboards or referenced in MIS Executive Reports.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Save Metric Formula
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
