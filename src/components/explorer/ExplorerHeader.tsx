import React from 'react';
import { Dataset, ViewState } from '@/types';
import { calculateDatasetHealth } from '@/lib/profiler';
import { 
  Table, 
  Sparkles, 
  Wand2, 
  LayoutDashboard, 
  ArrowLeft, 
  Bookmark, 
  BarChart2, 
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ExplorerHeaderProps {
  dataset: Dataset;
  filteredRowCount: number;
  activeFiltersCount: number;
  onNavigateView: (view: ViewState) => void;
  onOpenSavedViews: () => void;
  onOpenAiExplanation: () => void;
  onSelectDataset?: (id: string) => void;
  allDatasets?: Dataset[];
}

export function ExplorerHeader({
  dataset,
  filteredRowCount,
  activeFiltersCount,
  onNavigateView,
  onOpenSavedViews,
  onOpenAiExplanation,
  onSelectDataset,
  allDatasets = [],
}: ExplorerHeaderProps) {
  const healthSummary = calculateDatasetHealth(dataset);

  const getHealthBadge = () => {
    switch (healthSummary.status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Health: {healthSummary.score}% ({healthSummary.status})
          </span>
        );
      case 'Needs Attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Health: {healthSummary.score}% ({healthSummary.status})
          </span>
        );
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Health: {healthSummary.score}% ({healthSummary.status})
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#0c0c0e] border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 shrink-0 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-full">
        {/* Left Title & Dataset Selector */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 mt-0.5">
            <Table className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Data Explorer
              </h1>

              {/* Active Dataset Dropdown Badge */}
              {allDatasets.length > 1 && onSelectDataset ? (
                <select
                  value={dataset.id}
                  onChange={(e) => onSelectDataset(e.target.value)}
                  className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {allDatasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.rowCount.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80">
                  {dataset.name}
                </span>
              )}

              {getHealthBadge()}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Explore, filter, and analyze your active dataset.
            </p>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span>
                Total Rows: <strong className="text-zinc-900 dark:text-zinc-200">{dataset.rowCount.toLocaleString()}</strong>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>
                Columns: <strong className="text-zinc-900 dark:text-zinc-200">{dataset.headers.length}</strong>
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span>
                Filtered Rows: <strong className={cn("text-zinc-900 dark:text-zinc-200", filteredRowCount < dataset.rowCount && "text-blue-600 dark:text-blue-400 font-bold")}>{filteredRowCount.toLocaleString()}</strong>
              </span>
              {activeFiltersCount > 0 && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                    <Filter className="w-3 h-3" />
                    {activeFiltersCount} Filter{activeFiltersCount > 1 ? 's' : ''} Active
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateView('data-manager')}
            className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Profile
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateView('cleaning')}
            className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-500" />
            Clean Data
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSavedViews}
            className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Bookmark className="w-3.5 h-3.5 text-purple-500" />
            Saved Views
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateView('dashboards')}
            className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" />
            Build Dashboard
          </Button>

          <Button
            size="sm"
            onClick={onOpenAiExplanation}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </Button>
        </div>
      </div>
    </div>
  );
}
