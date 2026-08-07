import { Database, LayoutDashboard, Share2, Sparkles, FolderOpen, MoreVertical, ChevronDown, ChevronRight, FileSpreadsheet, Trash2, Edit2 } from 'lucide-react';
import { Dataset } from '@/types';
import { cn, formatBytes } from '@/lib/utils';
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

interface SidebarProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string | null) => void;
  onRemoveDataset: (id: string) => void;
}

export function Sidebar({ datasets, selectedDatasetId, onSelectDataset, onRemoveDataset }: SidebarProps) {
  const [datasetsOpen, setDatasetsOpen] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hidden md:flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        
        <div className="space-y-1">
          <p className="px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Workspace</p>
          <button 
            onClick={() => onSelectDataset(null)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
              selectedDatasetId === null 
                ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100 font-medium" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Data Manager</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors">
            <Share2 className="w-4 h-4" />
            <span>Relationships</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboards</span>
          </button>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors">
            <Sparkles className="w-4 h-4" />
            <span>AI Copilot</span>
          </button>
        </div>

        <div className="space-y-2">
          <div 
            className="flex items-center justify-between px-2 cursor-pointer group"
            onClick={() => setDatasetsOpen(!datasetsOpen)}
          >
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Imported Datasets</p>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 opacity-0 group-hover:opacity-100">
              {datasetsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
          
          {datasetsOpen && (
            <div className="mt-1 space-y-2 px-1">
              {datasets.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-zinc-500 italic">No datasets imported</p>
              ) : (
                datasets.map(dataset => {
                  const isExpanded = expandedCards.has(dataset.id);
                  const isSelected = selectedDatasetId === dataset.id;

                  return (
                    <div
                      key={dataset.id}
                      onClick={() => onSelectDataset(dataset.id)}
                      className={cn(
                        "flex flex-col rounded-xl border transition-all cursor-pointer overflow-hidden group",
                        isSelected 
                          ? "bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-900/50 shadow-sm ring-1 ring-blue-500/20" 
                          : "bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="p-3 flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          isSelected ? "bg-blue-50 dark:bg-blue-900/30" : "bg-zinc-100 dark:bg-zinc-900"
                        )}>
                          <FileSpreadsheet className={cn(
                            "w-4 h-4", 
                            dataset.type === 'csv' ? "text-blue-500" : "text-emerald-500"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={cn(
                              "text-sm font-semibold truncate pr-2",
                              isSelected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
                            )}>
                              {dataset.name}
                            </h3>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-zinc-400 opacity-0 group-hover:opacity-100 -mr-1"
                              onClick={(e) => toggleCardExpand(dataset.id, e)}
                            >
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                            <span className="font-medium uppercase">{dataset.type}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                            <span>{formatBytes(dataset.size)}</span>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={cn(
                          "px-3 pb-3 pt-1 border-t text-xs",
                          isSelected ? "border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10" : "border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20"
                        )}>
                          <div className="grid grid-cols-2 gap-2 mb-3 mt-2 text-zinc-600 dark:text-zinc-400">
                            <div>
                              <span className="block text-[10px] uppercase text-zinc-400 dark:text-zinc-500 mb-0.5">Rows</span>
                              <span className="font-mono text-zinc-900 dark:text-zinc-100">{dataset.rowCount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase text-zinc-400 dark:text-zinc-500 mb-0.5">Columns</span>
                              <span className="font-mono text-zinc-900 dark:text-zinc-100">{dataset.colCount.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-3">
                            Imported {formatDistanceToNow(dataset.uploadTime)} ago
                          </div>

                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-7 text-[10px]"
                              onClick={(e) => { e.stopPropagation(); /* TODO rename */ }}
                            >
                              <Edit2 className="w-3 h-3 mr-1.5" />
                              Rename
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30"
                              onClick={(e) => { e.stopPropagation(); onRemoveDataset(dataset.id); }}
                            >
                              <Trash2 className="w-3 h-3 mr-1.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}
