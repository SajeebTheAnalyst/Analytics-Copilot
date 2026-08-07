import { Database, LayoutDashboard, Share2, Sparkles, FolderOpen, MoreVertical, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { Dataset } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '../ui/button';

interface SidebarProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string | null) => void;
}

export function Sidebar({ datasets, selectedDatasetId, onSelectDataset }: SidebarProps) {
  const [datasetsOpen, setDatasetsOpen] = useState(true);

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hidden md:flex flex-col shrink-0 overflow-hidden">
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

        <div className="space-y-1">
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
            <div className="mt-1 space-y-0.5">
              {datasets.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-zinc-500 italic">No datasets imported</p>
              ) : (
                datasets.map(dataset => (
                  <button
                    key={dataset.id}
                    onClick={() => onSelectDataset(dataset.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group",
                      selectedDatasetId === dataset.id
                        ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                    )}
                  >
                    <FileSpreadsheet className={cn(
                      "w-4 h-4 shrink-0", 
                      dataset.type === 'csv' ? "text-blue-500" : "text-emerald-500"
                    )} />
                    <span className="truncate flex-1 text-left">{dataset.name}</span>
                    <MoreVertical className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}
