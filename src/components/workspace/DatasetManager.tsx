import React, { useState } from 'react';
import { Dataset, ViewState } from '@/types';
import { DataUploader } from './DataUploader';
import { calculateDatasetHealth, profileColumn, ExtendedColumnProfile } from '@/lib/profiler';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Hash, 
  Calendar, 
  Tag, 
  CaseSensitive, 
  Activity, 
  Layers, 
  Table
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface DatasetManagerProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onImport: (datasets: Dataset[]) => void;
  onRemove: (id: string) => void;
  onRename: (id: string) => void;
  onNavigateView: (view: ViewState) => void;
}

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DatasetManager({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onImport,
  onRemove,
  onRename,
  onNavigateView
}: DatasetManagerProps) {
  const [showImportBox, setShowImportBox] = useState(false);

  const activeDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0] || null;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'numeric':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"><Hash className="w-3 h-3" /> Numeric</span>;
      case 'date':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"><Calendar className="w-3 h-3" /> Date</span>;
      case 'categorical':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"><Tag className="w-3 h-3" /> Categorical</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"><CaseSensitive className="w-3 h-3" /> Text</span>;
    }
  };

  const getHealthBadge = (status: 'Healthy' | 'Needs Attention' | 'Critical') => {
    switch (status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Healthy
          </span>
        );
      case 'Needs Attention':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" /> Needs Attention
          </span>
        );
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800">
            <XCircle className="w-3 h-3" /> Critical
          </span>
        );
    }
  };

  // If no datasets exist in workspace
  if (!activeDataset || datasets.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar bg-zinc-50/50 dark:bg-[#050505]">
        <div className="max-w-4xl mx-auto w-full space-y-6 my-auto py-8">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Import & Profile
            </h1>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Upload a dataset to inspect its structure, quality, and readiness for analysis.
            </p>
          </div>

          {/* Upload Area */}
          <DataUploader onDatasetsImported={onImport} />
        </div>
      </div>
    );
  }

  // Active Dataset Health & Profiles
  const health = calculateDatasetHealth(activeDataset);
  const columnProfilesMap: Record<string, ExtendedColumnProfile> = {};

  activeDataset.headers.forEach(header => {
    const colType = activeDataset.columnTypes?.[header] || 'text';
    columnProfilesMap[header] = profileColumn(activeDataset.fullData || [], header, colType);
  });

  const isCleaned = activeDataset.cleaningStatus === 'cleaned';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505] p-6 overflow-y-auto custom-scrollbar space-y-6">
      
      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Import & Profile</h1>
            {getHealthBadge(health.status)}
            {isCleaned && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Cleaned
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Inspection, column statistics, data health score, and structural readiness profiling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-8 border-zinc-300 dark:border-zinc-700"
            onClick={() => setShowImportBox(!showImportBox)}
          >
            {showImportBox ? "Hide Upload Form" : "Import New Dataset"}
          </Button>

          {/* Primary Workflow Actions */}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-8 text-zinc-700 dark:text-zinc-200 gap-1.5"
            onClick={() => onNavigateView('explorer')}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Explore Dataset →</span>
          </Button>

          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1.5 font-medium shadow-xs"
            onClick={() => onNavigateView('cleaning')}
          >
            <span>Proceed to Data Cleaning →</span>
          </Button>
        </div>
      </div>

      {/* Optional Collapsible Import Form */}
      {showImportBox && (
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xs animate-in fade-in duration-200">
          <DataUploader onDatasetsImported={(newDs) => {
            onImport(newDs);
            setShowImportBox(false);
          }} compact />
        </div>
      )}

      {/* 1. Dataset Information Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-md bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {activeDataset.name}
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0" 
                  onClick={() => onRename(activeDataset.id)}
                  title="Rename dataset"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {activeDataset.filename} • Uploaded {formatDistanceToNow(activeDataset.uploadTime)} ago
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs border-l border-zinc-200 dark:border-zinc-800 pl-6 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Format</span>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 uppercase">{activeDataset.type}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">File Size</span>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{formatBytes(activeDataset.size)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Status</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{health.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dataset Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Rows</span>
          <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {activeDataset.rowCount.toLocaleString()}
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">Parsed records</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Columns</span>
          <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {activeDataset.colCount.toLocaleString()}
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">Attribute fields</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Missing Cells</span>
          <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {health.missingCells.toLocaleString()}
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">
            {health.missingCellsPercentage}% of total cells
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Duplicate Rows</span>
          <p className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {health.duplicateRows.toLocaleString()}
          </p>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">
            {health.duplicateRowsPercentage}% exact matches
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-3.5 shadow-xs col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Data Health Score</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={cn(
              "text-xl font-bold font-mono",
              health.score >= 90 ? "text-emerald-600 dark:text-emerald-400" :
              health.score >= 70 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {health.score}
            </span>
            <span className="text-xs text-zinc-400 font-mono">/ 100</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">{health.status} Quality</span>
        </div>
      </div>

      {/* 3. Data Health Assessment */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Data Health Assessment</h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            {health.issuesCount} pending issue{health.issuesCount === 1 ? '' : 's'} identified
          </span>
        </div>

        {health.score >= 90 && health.issueBreakdown.duplicateRowsCount === 0 && health.issueBreakdown.missingValuesColumns === 0 ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p>
              High quality dataset structure. No critical missing values or duplicate records detected. Ready for immediate exploratory analysis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Missing Value Columns</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {health.issueBreakdown.missingValuesColumns} column{health.issueBreakdown.missingValuesColumns === 1 ? '' : 's'} affected
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{health.missingCells} total missing cells</p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Duplicate Records</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {health.issueBreakdown.duplicateRowsCount} duplicate row{health.issueBreakdown.duplicateRowsCount === 1 ? '' : 's'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{health.duplicateRowsPercentage}% of total records</p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Invalid Date Formats</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {health.issueBreakdown.invalidDatesCount} non-standard date entries
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Automatic date parsing active</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Column Profiling Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Column Schema & Profiling</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Detailed statistics, data types, missingness, and range distributions for all {activeDataset.headers.length} attributes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">Column Name</th>
                <th className="py-2.5 px-4">Inferred Type</th>
                <th className="py-2.5 px-4">Completeness</th>
                <th className="py-2.5 px-4 text-right">Missing Count</th>
                <th className="py-2.5 px-4 text-right">Unique Values</th>
                <th className="py-2.5 px-4">Min / Early</th>
                <th className="py-2.5 px-4">Max / Late</th>
                <th className="py-2.5 px-4">Mean / Median</th>
                <th className="py-2.5 px-4">Sample Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono text-[11px]">
              {activeDataset.headers.map(header => {
                const profile = columnProfilesMap[header];
                if (!profile) return null;

                const completeness = 100 - profile.missingPercentage;

                return (
                  <tr key={header} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-zinc-900 dark:text-zinc-100 font-sans">
                      {header}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      {getTypeBadge(profile.type)}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              completeness === 100 ? "bg-emerald-500" : completeness > 80 ? "bg-blue-500" : "bg-amber-500"
                            )}
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500">{completeness.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-700 dark:text-zinc-300">
                      {profile.nullCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-700 dark:text-zinc-300">
                      {profile.uniqueCount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {profile.type === 'numeric' && profile.min !== undefined ? profile.min :
                       profile.type === 'date' && profile.minDate ? profile.minDate : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {profile.type === 'numeric' && profile.max !== undefined ? profile.max :
                       profile.type === 'date' && profile.maxDate ? profile.maxDate : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                      {profile.type === 'numeric' && profile.mean !== undefined ? `${profile.mean} / ${profile.median}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500 truncate max-w-[140px] font-sans text-xs">
                      {String(profile.exampleValue ?? 'N/A')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Recent Workspace Datasets */}
      {datasets.length > 1 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              All Workspace Datasets ({datasets.length})
            </h3>
            <span className="text-[11px] text-zinc-400">Click to switch Active Dataset</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {datasets.map(dataset => {
              const isActive = dataset.id === activeDataset.id;
              const dsHealth = calculateDatasetHealth(dataset);

              return (
                <div
                  key={dataset.id}
                  onClick={() => onSelectDataset(dataset.id)}
                  className={cn(
                    "p-3 rounded border text-xs transition-all cursor-pointer flex items-center justify-between group",
                    isActive 
                      ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-500/80 shadow-2xs" 
                      : "bg-zinc-50/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {dataset.name}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white uppercase tracking-widest shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {dataset.rowCount.toLocaleString()} rows • {dataset.colCount} cols
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {getHealthBadge(dsHealth.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(dataset.id);
                      }}
                      title="Remove dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
