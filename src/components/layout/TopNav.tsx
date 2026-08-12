import { Moon, Sun, Upload, Settings, Database, Network, Sparkles, LayoutDashboard, Info, X } from 'lucide-react';
import { Button } from '../ui/button';
import { ViewState } from '@/types';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface TopNavProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  onImportFiles: () => void;
}

export function TopNav({ currentView, onViewChange, onImportFiles }: TopNavProps) {
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  return (
    <>
      <header className="h-14 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-4 lg:px-6 z-10 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-inner">
              <span className="text-white font-bold leading-none text-lg tracking-tighter">Ac</span>
            </div>
            <span className="font-semibold tracking-tight text-lg text-zinc-900 dark:text-zinc-50">
              Analytics Copilot
            </span>
          </div>
          
          <div className="hidden lg:flex items-center bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 backdrop-blur-sm">
            <button 
              onClick={() => onViewChange('data-manager')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all",
                currentView === 'data-manager' 
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Database className="w-3.5 h-3.5" />
              Data Manager
            </button>
            <button 
              onClick={() => onViewChange('cleaning')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all",
                currentView === 'cleaning' 
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Data Cleaning
            </button>
            <button 
              onClick={() => onViewChange('relationships')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all",
                currentView === 'relationships' 
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Network className="w-3.5 h-3.5 text-indigo-500" />
              Relationships (Data Model)
            </button>
            <button 
              onClick={() => onViewChange('dashboards')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-2 transition-all",
                currentView === 'dashboards' 
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold" 
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-500" />
              Dashboards & MIS Reports
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2 text-zinc-700 dark:text-zinc-300" onClick={onImportFiles}>
            <Upload className="w-4 h-4" />
            <span>Import Files</span>
          </Button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50" onClick={() => setShowAbout(true)}>
            <Info className="w-[18px] h-[18px]" />
          </Button>
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50" onClick={toggleTheme}>
            <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>
      
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">About Analytics Copilot</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAbout(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-zinc-600 dark:text-zinc-400 mb-4 text-sm leading-relaxed">
                Analytics Copilot is a privacy-first, AI-powered business intelligence workspace. Import datasets, resolve issues, connect tables, and build real-time dashboards without writing code.
              </p>
              
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 mt-6">How it works</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><strong>Local Engine:</strong> Data is parsed, stored, cleaned, and aggregated locally in your browser using IndexedDB.</li>
                <li><strong>AI Security:</strong> Raw data rows are NEVER sent to the AI. The system only sends metadata (column names) and calculated statistical summaries to the server-side Gemini proxy to generate interpretations.</li>
                <li><strong>Relational DB:</strong> Upload multiple CSV or Excel files. The engine automatically detects and suggests primary and foreign key relationships.</li>
              </ul>
              
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 mt-6">Current Limitations</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>Performance decreases significantly with datasets over 250,000 rows as memory is restricted by the browser tab.</li>
                <li>Data is only persisted locally to this device. Clearing your browser data will delete the workspace.</li>
              </ul>
            </div>
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
              <Button onClick={() => setShowAbout(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
