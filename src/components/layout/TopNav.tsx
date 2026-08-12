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
      <header className="h-13 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-between px-4 lg:px-5 z-20 relative select-none">
        
        {/* Brand & Active Dataset */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">
                Analytics Toolkit
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
                B2B Data Workspace
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

          {/* Dataset Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDatasetDropdown(!showDatasetDropdown)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs transition-all",
                selectedDataset
                  ? "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300"
              )}
            >
              <Database className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              {selectedDataset ? (
                (() => {
                  const health = calculateDatasetHealth(selectedDataset);
                  const cols = selectedDataset.headers.length;
                  return (
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[280px] sm:max-w-[420px]">
                      <span className="truncate font-bold text-xs text-zinc-900 dark:text-zinc-100">{selectedDataset.name}</span>
                      <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                        {selectedDataset.rowCount.toLocaleString()} rows
                      </span>
                      <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                        {cols} cols
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                        health.score >= 90 ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" :
                        health.score >= 70 ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" :
                        "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                      )}>
                        {health.score}% Health
                      </span>
                    </div>
                  );
                })()
              ) : (
                <span className="font-medium text-xs">No active dataset selected</span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
            </button>

            {showDatasetDropdown && (
              <div 
                className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Active Dataset</span>
                  <button 
                    onClick={() => {
                      onImportFiles();
                      setShowDatasetDropdown(false);
                    }}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    + Import
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                  {datasets.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">
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
                          "w-full flex items-center justify-between p-2 rounded text-xs text-left transition-colors",
                          d.id === selectedDatasetId 
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-semibold" 
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileSpreadsheet className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            d.type === 'csv' ? "text-blue-500" : "text-emerald-500"
                          )} />
                          <span className="truncate">{d.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 shrink-0">
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
        <div className="flex items-center gap-2">
          {/* Import Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs gap-1.5 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
            onClick={onImportFiles}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import Data</span>
          </Button>

          {/* AI Copilot Drawer Toggle */}
          <Button
            variant={isCopilotOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleCopilot}
            className={cn(
              "h-8 text-xs gap-1.5 transition-all",
              isCopilotOpen 
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" 
                : "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Analyst</span>
          </Button>

          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block"></div>

          {/* About / Theme */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            onClick={() => setShowAbout(true)}
          >
            <Info className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            onClick={toggleTheme}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">About Analytics Toolkit</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAbout(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 text-xs text-zinc-600 dark:text-zinc-400 space-y-4 overflow-y-auto">
              <p className="leading-relaxed">
                Analytics Toolkit is a privacy-first, professional B2B data workspace for data cleaning, profiling, analysis, visualization, and MIS executive reporting.
              </p>

              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 uppercase text-[10px] tracking-wider">Key Architecture Features</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li><strong>Local In-Memory Engine:</strong> Files parsed via PapaParse worker and SheetJS, stored in browser IndexedDB.</li>
                  <li><strong>Privacy & Security:</strong> Data processing occurs completely in your browser. Only metadata & aggregates are shared with the AI assistant.</li>
                  <li><strong>Resilient AI Copilot:</strong> 3-tier fallback engine prevents network failures and keeps insights flowing.</li>
                </ul>
              </div>
            </div>
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
              <Button size="sm" onClick={() => setShowAbout(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
