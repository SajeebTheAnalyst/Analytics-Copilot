import { Dataset } from '@/types';
import { DataUploader } from './DataUploader';
import { formatDistanceToNow } from 'date-fns';
import { FileSpreadsheet, Trash2, Edit2, Maximize2, MoreHorizontal, ChevronDown, ChevronRight, Hash, ToggleLeft, Calendar, CaseSensitive, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DatasetManagerProps {
  datasets: Dataset[];
  onImport: (datasets: Dataset[]) => void;
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DatasetManager({ datasets, onImport, onRemove, onPreview }: DatasetManagerProps) {
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-3 h-3 text-blue-500"  />;
      case 'boolean': return <ToggleLeft className="w-3 h-3 text-purple-500"  />;
      case 'date': return <Calendar className="w-3 h-3 text-emerald-500"  />;
      case 'categorical': return <CaseSensitive className="w-3 h-3 text-orange-500"  />;
      default: return <HelpCircle className="w-3 h-3 text-zinc-400"  />;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">Data Manager</h1>
          <p className="text-sm text-zinc-500">Import and manage multiple datasets in your workspace.</p>
        </div>

        <DataUploader onDatasetsImported={onImport} />

        {datasets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Imported Datasets ({datasets.length})</h2>
            </div>
            
            <div className="grid gap-3">
              {datasets.map(dataset => {
                const isExpanded = expandedDatasets.has(dataset.id);
                
                return (
                  <div 
                    key={dataset.id}
                    className="flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-all overflow-hidden"
                  >
                    <div className="flex items-center p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 mr-2 shrink-0" onClick={() => toggleExpand(dataset.id)}>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      
                      <div className="w-10 h-10 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 mr-4">
                        <FileSpreadsheet className={dataset.type === 'csv' ? "text-blue-500" : "text-emerald-500"} />
                      </div>
                      
                      <div className="flex-1 min-w-0 mr-4 cursor-pointer" onClick={() => toggleExpand(dataset.id)}>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                          {dataset.name}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            .{dataset.type}
                          </span>
                          {dataset.cleaningStatus === 'issues-found' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                              Issues Found
                            </span>
                          )}
                          {dataset.cleaningStatus === 'cleaned' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              Cleaned
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
                          <span>{dataset.rowCount.toLocaleString()} rows</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span>{dataset.colCount.toLocaleString()} columns</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span>{formatBytes(dataset.size)}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span>Imported {formatDistanceToNow(dataset.uploadTime)} ago</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"  onClick={() => onPreview(dataset.id)}>
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"  onClick={() => onRemove(dataset.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Columns schema</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {dataset.headers.slice(0, 16).map(header => (
                            <div key={header} className="flex items-center gap-2 p-2 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                              {getTypeIcon(dataset.columnTypes[header])}
                              <span className="truncate flex-1" title={header}>{header}</span>
                            </div>
                          ))}
                          {dataset.headers.length > 16 && (
                            <div className="flex items-center justify-center p-2 rounded bg-zinc-100 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                              +{dataset.headers.length - 16} more columns
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
