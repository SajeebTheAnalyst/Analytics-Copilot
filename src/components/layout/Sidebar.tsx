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
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#08080a] hidden md:flex flex-col shrink-0 overflow-hidden select-none">
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-5">
        
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
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
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left group",
                    isActive
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : item.isAction && isCopilotOpen
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn(
                      "w-4 h-4 shrink-0",
                      isActive 
                        ? "text-white" 
                        : item.isAction 
                        ? "text-blue-500 dark:text-blue-400" 
                        : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                    )} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.isAction && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold tracking-wider">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Datasets Accordion */}
        <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
          <div 
            className="flex items-center justify-between px-2 cursor-pointer group"
            onClick={() => setDatasetsOpen(!datasetsOpen)}
          >
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Active Datasets ({datasets.length})
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 hover:text-zinc-600">
              {datasetsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
          
          {datasetsOpen && (
            <div className="space-y-1.5 px-0.5">
              {datasets.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md bg-white/40 dark:bg-zinc-950/40">
                  <p className="text-xs text-zinc-500">No datasets uploaded</p>
                  <button 
                    onClick={() => {
                      onSelectDataset(null);
                      onViewChange('data-manager');
                    }}
                    className="mt-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
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
                        "rounded-md border text-xs transition-all cursor-pointer overflow-hidden group",
                        isSelected 
                          ? "bg-white dark:bg-zinc-900 border-blue-500/50 shadow-xs ring-1 ring-blue-500/20" 
                          : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileSpreadsheet className={cn(
                            "w-4 h-4 shrink-0", 
                            dataset.type === 'csv' ? "text-blue-500" : "text-emerald-500"
                          )} />
                          <div className="min-w-0">
                            <p className={cn(
                              "font-medium truncate text-xs",
                              isSelected ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-700 dark:text-zinc-300"
                            )}>
                              {dataset.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono">
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
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                            onClick={(e) => toggleCardExpand(dataset.id, e)}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 text-[11px] space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-zinc-500 dark:text-zinc-400 pt-1">
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-zinc-400">Size</span>
                              <span className="font-mono text-zinc-700 dark:text-zinc-200">{formatBytes(dataset.size)}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase tracking-wider text-zinc-400">Type</span>
                              <span className="font-mono uppercase text-zinc-700 dark:text-zinc-200">{dataset.type}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-zinc-400">
                            Uploaded {formatDistanceToNow(dataset.uploadTime)} ago
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 h-6 text-[10px] px-2"
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
                              className="flex-1 h-6 text-[10px] px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/40"
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
