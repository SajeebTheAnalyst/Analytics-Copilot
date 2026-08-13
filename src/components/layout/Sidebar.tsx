import React, { useState } from 'react';
import { 
  FolderOpen, 
  ShieldCheck, 
  Table, 
  Share2, 
  TrendingUp, 
  Sparkles, 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  FileSpreadsheet, 
  Trash2, 
  Edit2,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Dataset, ViewState } from '@/types';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string | null) => void;
  onRemoveDataset: (id: string) => void;
  onRenameDataset: (id: string) => void;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onToggleCopilot: () => void;
  isCopilotOpen?: boolean;
}

export function Sidebar({ 
  datasets, 
  selectedDatasetId, 
  onSelectDataset, 
  onRemoveDataset, 
  onRenameDataset,
  currentView = 'data-manager', 
  onViewChange,
  onToggleCopilot,
  isCopilotOpen
}: SidebarProps) {
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

  const navGroups = [
    {
      title: 'DATA WORKSPACE',
      items: [
        { id: 'data-manager' as ViewState, label: 'Import & Profile', icon: FolderOpen },
        { id: 'cleaning' as ViewState, label: 'Data Cleaning', icon: ShieldCheck },
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { id: 'explorer' as ViewState, label: 'Data Explorer', icon: Table },
        { id: 'relationships' as ViewState, label: 'Model & Relationships', icon: Share2 },
        { id: 'kpi-builder' as ViewState, label: 'KPI Builder', icon: TrendingUp },
        { id: 'ai-copilot' as any, label: 'AI Analyst', icon: Sparkles, isAction: true },
      ]
    },
    {
      title: 'REPORTING',
      items: [
        { id: 'dashboards' as ViewState, label: 'Dashboards', icon: LayoutDashboard },
        { id: 'mis-report' as ViewState, label: 'MIS Executive Report', icon: FileText },
      ]
    },
    {
      title: 'ASSETS',
      items: [
        { id: 'data-dictionary' as ViewState, label: 'Data Dictionary', icon: BookOpen },
      ]
    }
  ];

  return (
    <aside className="w-64 glass-panel border-r-0 border-t-0 border-b-0 hidden md:flex flex-col shrink-0 overflow-hidden select-none z-10 shadow-[2px_0_12px_rgba(0,0,0,0.02)] dark:shadow-[2px_0_20px_rgba(0,0,0,0.2)]">
      <div className="p-3.5 flex-1 overflow-y-auto custom-scrollbar space-y-5">
        
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-2.5 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 font-mono">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = !item.isAction && currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.isAction) {
                      onToggleCopilot();
                    } else {
                      onViewChange(item.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ease-out text-left group relative overflow-hidden",
                    isActive
                      ? "bg-blue-50/70 dark:bg-blue-950/25 text-blue-700 dark:text-blue-300 font-bold shadow-[0_4px_12px_rgba(37,99,235,0.04)] border border-blue-200/60 dark:border-blue-900/40 hover:scale-[1.01]"
                      : item.isAction && isCopilotOpen
                      ? "bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-100/60 dark:border-blue-900/30"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-transparent hover:bg-white/60 dark:hover:bg-white/5 border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/60 hover:pl-3.5 hover:shadow-[0_2px_8px_-4px_rgba(0,0,0,0.03)]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 z-10">
                    <Icon className={cn(
                      "w-4 h-4 shrink-0 transition-all duration-200 group-hover:scale-105",
                      isActive 
                        ? "text-blue-600 dark:text-blue-400" 
                        : item.isAction 
                        ? "text-blue-500 dark:text-blue-400" 
                        : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                    )} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.isAction && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100/60 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold tracking-wider z-10 transition-colors duration-200 group-hover:bg-blue-200/70 dark:group-hover:bg-blue-900/60">
                      AI
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r bg-blue-600 dark:bg-blue-500 shadow-[1px_0_6px_rgba(37,99,235,0.4)]" />
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Datasets Accordion */}
        <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
          <div 
            className="flex items-center justify-between px-2 cursor-pointer group hover:opacity-90 transition-opacity"
            onClick={() => setDatasetsOpen(!datasetsOpen)}
          >
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 transition-transform duration-300 group-hover:rotate-12" />
              <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                Active Datasets ({datasets.length})
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              {datasetsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
          
          {datasetsOpen && (
            <div className="space-y-2 px-0.5">
              {datasets.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-lg bg-white/40 dark:bg-zinc-950/40">
                  <p className="text-xs text-zinc-500">No datasets uploaded</p>
                  <button 
                    onClick={() => {
                      onSelectDataset(null);
                      onViewChange('data-manager');
                    }}
                    className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    + Import dataset
                  </button>
                </div>
              ) : (
                datasets.map(dataset => {
                  const isExpanded = expandedCards.has(dataset.id);
                  const isSelected = selectedDatasetId === dataset.id;

                  return (
                    <div
                      key={dataset.id}
                      onClick={() => {
                        onSelectDataset(dataset.id);
                      }}
                      className={cn(
                        "rounded-lg border text-xs transition-all duration-200 cursor-pointer overflow-hidden group hover:-translate-y-0.5",
                        isSelected 
                          ? "bg-white dark:bg-zinc-900 border-blue-500/50 shadow-[0_4px_12px_rgba(37,99,235,0.06)] ring-1 ring-blue-500/20" 
                          : "bg-white/40 dark:bg-zinc-900/30 border-zinc-200/70 dark:border-zinc-800/75 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-350 dark:hover:border-zinc-700 hover:shadow-xs"
                      )}
                    >
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSpreadsheet className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110", 
                            dataset.type === 'csv' ? "text-blue-500" : "text-emerald-500"
                          )} />
                          <div className="min-w-0">
                            <p className={cn(
                              "font-bold truncate text-[11px] transition-colors",
                              isSelected ? "text-zinc-900 dark:text-zinc-100 font-bold" : "text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-zinc-100"
                            )}>
                              {dataset.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-medium">
                              {dataset.rowCount.toLocaleString()} rows • {dataset.colCount} cols
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {dataset.cleaningStatus === 'cleaned' && (
                            <span title="Cleaned" className="text-emerald-500">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {dataset.cleaningStatus === 'issues-found' && (
                            <span title="Pending issues" className="text-amber-500">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <button
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors duration-150"
                            onClick={(e) => toggleCardExpand(dataset.id, e)}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40 text-[11px] space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-zinc-500 dark:text-zinc-400 pt-1">
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-mono">Size</span>
                              <span className="font-mono text-zinc-700 dark:text-zinc-200 font-semibold">{formatBytes(dataset.size)}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-zinc-400 font-mono">Type</span>
                              <span className="font-mono uppercase text-zinc-700 dark:text-zinc-200 font-semibold">{dataset.type}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                            Uploaded {formatDistanceToNow(dataset.uploadTime)} ago
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-6 text-[10px] px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors duration-150 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onRenameDataset(dataset.id); 
                              }}
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Rename
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-6 text-[10px] px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/40 font-semibold transition-colors duration-150"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onRemoveDataset(dataset.id); 
                              }}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
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
