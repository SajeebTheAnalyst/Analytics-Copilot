import React, { useState } from 'react';
import { Dataset } from '@/types';
import { BookOpen, Search, Filter, Database, Hash, Calendar, Tag, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataDictionaryViewProps {
  datasets: Dataset[];
}

export function DataDictionaryView({ datasets }: DataDictionaryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDatasetFilter, setSelectedDatasetFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Flatten column profiles across all datasets
  const allColumns = datasets.flatMap(dataset => {
    return dataset.headers.map(header => {
      const profile = dataset.columnProfiles[header] || {
        name: header,
        type: dataset.columnTypes[header] || 'unknown',
        nullCount: 0,
        uniqueCount: 0,
        exampleValue: null
      };

      const nonNullRatio = dataset.rowCount > 0 
        ? (((dataset.rowCount - profile.nullCount) / dataset.rowCount) * 100).toFixed(1)
        : '100.0';

      return {
        datasetId: dataset.id,
        datasetName: dataset.name,
        columnName: header,
        type: profile.type,
        nullCount: profile.nullCount,
        uniqueCount: profile.uniqueCount,
        nonNullRatio: parseFloat(nonNullRatio),
        exampleValue: String(profile.exampleValue ?? 'N/A'),
        totalRows: dataset.rowCount
      };
    });
  });

  const filteredColumns = allColumns.filter(col => {
    const matchesSearch = col.columnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          col.datasetName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDataset = selectedDatasetFilter === 'all' || col.datasetId === selectedDatasetFilter;
    const matchesType = selectedTypeFilter === 'all' || col.type === selectedTypeFilter;
    return matchesSearch && matchesDataset && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'numeric':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"><Hash className="w-3 h-3" /> Numeric</span>;
      case 'date':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"><Calendar className="w-3 h-3" /> Date</span>;
      case 'categorical':
      case 'text':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"><Tag className="w-3 h-3" /> Categorical</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Text</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505] p-6 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Data Dictionary</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Centralized metadata documentation across {datasets.length} active dataset{datasets.length === 1 ? '' : 's'} ({allColumns.length} total columns).
          </p>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/50">
          <BookOpen className="w-10 h-10 text-zinc-400 mb-3" />
          <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">No Data Assets Uploaded</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Import datasets in the Data Workspace to automatically populate column definitions, data types, and quality metrics here.
          </p>
        </div>
      ) : (
        <>
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900/80 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder="Filter by column or dataset name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedDatasetFilter}
                onChange={(e) => setSelectedDatasetFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300"
              >
                <option value="all">All Datasets ({datasets.length})</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300"
              >
                <option value="all">All Data Types</option>
                <option value="numeric">Numeric</option>
                <option value="categorical">Categorical</option>
                <option value="date">Date</option>
              </select>
            </div>
          </div>

          {/* Dictionary Table */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/60 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Column Name</th>
                    <th className="py-2.5 px-4">Dataset</th>
                    <th className="py-2.5 px-4">Inferred Type</th>
                    <th className="py-2.5 px-4">Completeness</th>
                    <th className="py-2.5 px-4 text-right">Null Count</th>
                    <th className="py-2.5 px-4 text-right">Unique Values</th>
                    <th className="py-2.5 px-4">Sample Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                  {filteredColumns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">
                        No columns match your current filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredColumns.map((col, idx) => (
                      <tr key={`${col.datasetId}-${col.columnName}-${idx}`} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-xs">
                          {col.columnName}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Database className="w-3 h-3 text-zinc-400" />
                            {col.datasetName}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {getTypeBadge(col.type)}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  col.nonNullRatio === 100 ? "bg-emerald-500" : col.nonNullRatio > 80 ? "bg-blue-500" : "bg-amber-500"
                                )}
                                style={{ width: `${col.nonNullRatio}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                              {col.nonNullRatio}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {col.nullCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {col.uniqueCount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-500 truncate max-w-[180px]">
                          {col.exampleValue}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
