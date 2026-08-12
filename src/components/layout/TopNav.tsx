import React, { useState, useEffect } from 'react';
import { 
  Moon, 
  Sun, 
  Upload, 
  Sparkles, 
  ChevronDown, 
  Database, 
  Info, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  BarChart2
} from 'lucide-react';
import { Button } from '../ui/button';
import { ViewState, Dataset } from '@/types';
import { cn } from '@/lib/utils';
import { calculateDatasetHealth } from '@/lib/profiler';

interface TopNavProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onImportFiles: () => void;
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string | null) => void;
  onToggleCopilot: () => void;
  isCopilotOpen?: boolean;
}

export function TopNav({ 
  currentView, 
  onViewChange, 
  onImportFiles,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onToggleCopilot,
  isCopilotOpen
}: TopNavProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [showDatasetDropdown, setShowDatasetDropdown] = useState(false);

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return 'dark';
      if (saved === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <>
      <header className="h-14 shrink-0 border-b border-zinc-200/85 dark:border-zinc-800/80 bg-white/85 dark:bg-[#07080b]/90 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 z-20 relative select-none">
        
        {/* Brand & Active Dataset */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => onViewChange('data-manager')}>
            <div className="w-7.5 h-7.5 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] transition-transform duration-300 group-hover:scale-105">
              <BarChart2 className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs lg:text-sm tracking-tight text-zinc-950 dark:text-zinc-50 leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Analytics Toolkit
              </span>
              <span className="text-[9px] lg:text-[10px] text-zinc-500 dark:text-zinc-500 font-semibold tracking-wide">
                B2B Data Workspace
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-zinc-250 dark:bg-zinc-800 hidden sm:block"></div>

          {/* Dataset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDatasetDropdown(!showDatasetDropdown)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.25",
                selectedDataset
                  ? "bg-zinc-50/55 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-350 dark:hover:border-zinc-700"
                  : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              )}
            >
              <Database className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
              {selectedDataset ? (
                (() => {
                  const health = calculateDatasetHealth(selectedDataset);
                  const cols = selectedDataset.headers.length;
                  return (
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[280px] sm:max-w-[420px]">
                      <span className="truncate font-bold text-xs text-zinc-900 dark:text-zinc-50">{selectedDataset.name}</span>
                      <span className="text-[9px] lg:text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-150/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                        {selectedDataset.rowCount.toLocaleString()} rows
                      </span>
                      <span className="text-[9px] lg:text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-150/70 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                        {cols} cols
                      </span>
                      <span className={cn(
                        "text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                        health.score >= 90 ? "bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/20" :
                        health.score >= 70 ? "bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20" :
                        "bg-red-100/70 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-900/20"
                      )}>
                        {health.score}% Health
                      </span>
                    </div>
                  );
                })()
              ) : (
                <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">No active dataset selected</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1 transition-transform duration-200 group-hover:translate-y-0.25" />
            </button>

            {showDatasetDropdown && (
              <div 
                className="absolute top-full left-0 mt-2 w-80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200/85 dark:border-zinc-800 rounded-xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1),0_0_1px_rgba(0,0,0,0.05)] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-250"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">Select Active Dataset</span>
                  <button 
                    onClick={() => {
                      onImportFiles();
                      setShowDatasetDropdown(false);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    + Import
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                  {datasets.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500 italic">
                      No datasets imported yet.
                    </div>
                  ) : (
                    datasets.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onSelectDataset(d.id);
                          setShowDatasetDropdown(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2.5 rounded-lg text-xs text-left transition-all duration-150 cursor-pointer",
                          d.id === selectedDatasetId 
                            ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-800 dark:text-blue-350 font-bold border border-blue-100/50 dark:border-blue-900/30 shadow-2xs" 
                            : "text-zinc-700 dark:text-zinc-350 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 hover:text-zinc-950 dark:hover:text-zinc-100 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileSpreadsheet className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            d.type === 'csv' ? "text-blue-500" : "text-emerald-500"
                          )} />
                          <span className="truncate font-semibold">{d.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
                          {d.rowCount.toLocaleString()} rows
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Import Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8.5 text-xs gap-1.5 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 font-semibold transition-all duration-200 hover:-translate-y-0.25 shadow-2xs hover:shadow-xs cursor-pointer"
            onClick={onImportFiles}
          >
            <Upload className="w-3.5 h-3.5 transition-transform duration-200 hover:-translate-y-0.5" />
            <span className="hidden sm:inline">Import Data</span>
          </Button>

          {/* AI Copilot Drawer Toggle */}
          <Button
            variant={isCopilotOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleCopilot}
            className={cn(
              "h-8.5 text-xs gap-1.5 transition-all duration-200 hover:-translate-y-0.25 shadow-2xs font-bold cursor-pointer",
              isCopilotOpen 
                ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md" 
                : "text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/40 bg-blue-50/55 dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-900/40"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 transition-transform duration-300 hover:rotate-12" />
            <span>AI Analyst</span>
          </Button>

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block"></div>

          {/* About / Theme */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8.5 w-8.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-150 cursor-pointer"
            onClick={() => setShowAbout(true)}
          >
            <Info className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8.5 w-8.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-150 relative cursor-pointer"
            onClick={toggleTheme}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-zinc-400" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">About Analytics Toolkit</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setShowAbout(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 text-xs text-zinc-600 dark:text-zinc-400 space-y-4 overflow-y-auto">
              <p className="leading-relaxed">
                Analytics Toolkit is a privacy-first, professional B2B data workspace for data cleaning, profiling, analysis, visualization, and MIS executive reporting.
              </p>

              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 uppercase text-[10px] tracking-wider font-mono">Key Architecture Features</h3>
                <ul className="list-disc pl-4 space-y-2">
                  <li><strong>Local In-Memory Engine:</strong> Files parsed via PapaParse worker and SheetJS, stored in browser IndexedDB.</li>
                  <li><strong>Privacy & Security:</strong> Data processing occurs completely in your browser. Only metadata & aggregates are shared with the AI assistant.</li>
                  <li><strong>Resilient AI Copilot:</strong> 3-tier fallback engine prevents network failures and keeps insights flowing.</li>
                </ul>
              </div>
            </div>
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
              <Button size="sm" className="font-bold" onClick={() => setShowAbout(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
