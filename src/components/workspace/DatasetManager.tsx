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
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-blue-50/70 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/20"><Hash className="w-3 h-3 text-blue-500" /> NUMERIC</span>;
      case 'date':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-50/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/20"><Calendar className="w-3 h-3 text-amber-500" /> DATE</span>;
      case 'categorical':
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/20"><Tag className="w-3 h-3 text-emerald-500" /> CATEGORICAL</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/30"><CaseSensitive className="w-3 h-3 text-zinc-500" /> TEXT</span>;
    }
  };

  const getHealthBadge = (status: 'Healthy' | 'Needs Attention' | 'Critical') => {
    switch (status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Healthy
          </span>
        );
      case 'Needs Attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Needs Attention
          </span>
        );
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/30">
            <XCircle className="w-3.5 h-3.5 text-red-500" /> Critical
          </span>
        );
    }
  };

  // If no datasets exist in workspace
  if (!activeDataset || datasets.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-zinc-50/50 dark:bg-[#050505] ambient-bg justify-center">
        <div className="max-w-4xl mx-auto w-full space-y-6 py-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Import & Profile
            </h1>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              Upload a dataset to inspect its structure, quality, and readiness for premium analytics.
            </p>
          </div>

          {/* Upload Area */}
          <div className="glass-panel rounded-2xl p-6 lg:p-8 shadow-sm">
            <DataUploader onDatasetsImported={onImport} />
          </div>
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
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505] p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6">
      
      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Import & Profile</h1>
            {getHealthBadge(health.status)}
            {isCleaned && (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30">
                Cleaned
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Inspection, column statistics, data health score, and structural readiness profiling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-8.5 border-zinc-250 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold cursor-pointer"
            onClick={() => setShowImportBox(!showImportBox)}
          >
            {showImportBox ? "Hide Upload Form" : "Import New Dataset"}
          </Button>

          {/* Primary Workflow Actions */}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-8.5 text-zinc-800 dark:text-zinc-200 border-zinc-250 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 gap-1.5 font-bold cursor-pointer transition-all hover:-translate-y-0.25 shadow-2xs"
            onClick={() => onNavigateView('explorer')}
          >
            <Table className="w-3.5 h-3.5 text-blue-500" />
            <span>Explore Dataset</span>
          </Button>

          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8.5 gap-1.5 font-bold cursor-pointer transition-all hover:-translate-y-0.25 shadow-2xs"
            onClick={() => onNavigateView('cleaning')}
          >
            <span>Proceed to Data Cleaning →</span>
          </Button>
        </div>
      </div>

      {/* Optional Collapsible Import Form */}
      {showImportBox && (
        <div className="p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <DataUploader onDatasetsImported={(newDs) => {
            onImport(newDs);
            setShowImportBox(false);
          }} compact />
        </div>
      )}

      {/* 1. Dataset Information Card */}
      <div className="glass-panel rounded-xl p-5 shadow-2xs transition-all duration-300 hover:shadow-xs hover:-translate-y-0.25">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-3xs">
              <FileSpreadsheet className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm lg:text-base font-bold text-zinc-900 dark:text-zinc-50 truncate leading-none">
                  {activeDataset.name}
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md shrink-0 cursor-pointer" 
                  onClick={() => onRename(activeDataset.id)}
                  title="Rename dataset"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono mt-1 font-semibold">
                {activeDataset.filename} • Uploaded {formatDistanceToNow(activeDataset.uploadTime)} ago
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs sm:border-l border-zinc-200/80 dark:border-zinc-800 sm:pl-6 shrink-0">
            <div>
              <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block font-sans">Format</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 uppercase mt-0.5 block">{activeDataset.type}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block font-sans">File Size</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{formatBytes(activeDataset.size)}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block font-sans">Quality Rating</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 block">{health.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dataset Summary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Rows', value: activeDataset.rowCount.toLocaleString(), desc: 'Parsed records' },
          { label: 'Total Columns', value: activeDataset.colCount.toLocaleString(), desc: 'Attribute fields' },
          { label: 'Missing Cells', value: health.missingCells.toLocaleString(), desc: `${health.missingCellsPercentage}% of total cells` },
          { label: 'Duplicate Rows', value: health.duplicateRows.toLocaleString(), desc: `${health.duplicateRowsPercentage}% exact matches` },
        ].map((kpi, idx) => (
          <div key={idx} className="glass-panel rounded-xl p-4.5 shadow-3xs transition-all duration-300 hover:shadow-xs hover:-translate-y-0.5 hover:border-zinc-300/80 dark:hover:border-zinc-700/80">
            <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{kpi.label}</span>
            <p className="text-xl lg:text-2xl font-extrabold font-mono text-zinc-900 dark:text-zinc-50 mt-1.5 leading-none">
              {kpi.value}
            </p>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-450 mt-1.5 block font-semibold">{kpi.desc}</span>
          </div>
        ))}

        <div className="glass-panel rounded-xl p-4.5 shadow-3xs transition-all duration-300 hover:shadow-xs hover:-translate-y-0.5 hover:border-zinc-300/80 dark:hover:border-zinc-700/80 col-span-2 md:col-span-1">
          <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Health Score</span>
          <div className="flex items-baseline gap-1.5 mt-1.5 leading-none">
            <span className={cn(
              "text-xl lg:text-2xl font-extrabold font-mono",
              health.score >= 90 ? "text-emerald-600 dark:text-emerald-400" :
              health.score >= 70 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {health.score}
            </span>
            <span className="text-xs text-zinc-400 font-mono font-bold">/ 100</span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-450 mt-1.5 block font-semibold">{health.status} Quality</span>
        </div>
      </div>

      {/* 3. Data Health Assessment */}
      <div className="glass-panel rounded-xl p-5 space-y-4 shadow-3xs transition-all duration-300 hover:shadow-xs">
        <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50">Data Health Assessment</h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400">
            {health.issuesCount} pending issue{health.issuesCount === 1 ? '' : 's'} identified
          </span>
        </div>

        {health.score >= 90 && health.issueBreakdown.duplicateRowsCount === 0 && health.issueBreakdown.missingValuesColumns === 0 ? (
          <div className="flex items-center gap-3 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            <p className="font-semibold leading-relaxed">
              High quality dataset structure. No critical missing values or duplicate records detected. Ready for immediate exploratory analysis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-zinc-50/60 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">Missing Value Columns</span>
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                {health.issueBreakdown.missingValuesColumns} column{health.issueBreakdown.missingValuesColumns === 1 ? '' : 's'} affected
              </p>
              <p className="text-[11px] text-zinc-550 dark:text-zinc-450 mt-1 font-semibold">{health.missingCells} total missing cells</p>
            </div>

            <div className="p-4 bg-zinc-50/60 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">Duplicate Records</span>
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                {health.issueBreakdown.duplicateRowsCount} duplicate row{health.issueBreakdown.duplicateRowsCount === 1 ? '' : 's'}
              </p>
              <p className="text-[11px] text-zinc-550 dark:text-zinc-450 mt-1 font-semibold">{health.duplicateRowsPercentage}% of total records</p>
            </div>

            <div className="p-4 bg-zinc-50/60 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-850 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-1">Invalid Date Formats</span>
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                {health.issueBreakdown.invalidDatesCount} non-standard date entries
              </p>
              <p className="text-[11px] text-zinc-550 dark:text-zinc-450 mt-1 font-semibold">Automatic date parsing active</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Column Profiling Table */}
      <div className="glass-panel rounded-xl overflow-hidden shadow-2xs transition-all duration-300 hover:shadow-xs">
        <div className="p-4.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50">Column Schema & Profiling</h3>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Detailed statistics, data types, missingness, and range distributions for all {activeDataset.headers.length} attributes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/50 dark:bg-zinc-950/50 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest select-none">
                <th className="py-3 px-4 font-sans">Column Name</th>
                <th className="py-3 px-4 font-sans">Inferred Type</th>
                <th className="py-3 px-4 font-sans">Completeness</th>
                <th className="py-3 px-4 text-right font-sans">Missing Count</th>
                <th className="py-3 px-4 text-right font-sans">Unique Values</th>
                <th className="py-3 px-4 font-sans">Min / Early</th>
                <th className="py-3 px-4 font-sans">Max / Late</th>
                <th className="py-3 px-4 font-sans">Mean / Median</th>
                <th className="py-3 px-4 font-sans text-right">Sample Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-850 font-mono text-[11px]">
              {activeDataset.headers.map(header => {
                const profile = columnProfilesMap[header];
                if (!profile) return null;

                const completeness = 100 - profile.missingPercentage;

                return (
                  <tr key={header} className="hover:bg-zinc-100/40 dark:hover:bg-zinc-900/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-950 dark:text-zinc-100 font-sans">
                      {header}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {getTypeBadge(profile.type)}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              completeness === 100 ? "bg-emerald-500" : completeness > 80 ? "bg-blue-500" : "bg-amber-500"
                            )}
                            style={{ width: `${completeness}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold font-mono">{completeness.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-800 dark:text-zinc-200 font-bold">
                      {profile.nullCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-800 dark:text-zinc-200 font-bold">
                      {profile.uniqueCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-350 font-bold">
                      {profile.type === 'numeric' && profile.min !== undefined ? profile.min :
                       profile.type === 'date' && profile.minDate ? profile.minDate : '—'}
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-350 font-bold">
                      {profile.type === 'numeric' && profile.max !== undefined ? profile.max :
                       profile.type === 'date' && profile.maxDate ? profile.maxDate : '—'}
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-350 font-bold">
                      {profile.type === 'numeric' && profile.mean !== undefined ? `${profile.mean} / ${profile.median}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 truncate max-w-[150px] font-sans text-right font-medium">
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
        <div className="glass-panel rounded-xl p-5 space-y-4 shadow-3xs transition-all duration-300 hover:shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              All Workspace Datasets ({datasets.length})
            </h3>
            <span className="text-[11px] font-bold text-zinc-450 dark:text-zinc-500">Click to switch Active Dataset</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {datasets.map(dataset => {
              const isActive = dataset.id === activeDataset.id;
              const dsHealth = calculateDatasetHealth(dataset);

              return (
                <div
                  key={dataset.id}
                  onClick={() => onSelectDataset(dataset.id)}
                  className={cn(
                    "p-3.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between group shadow-3xs hover:-translate-y-0.25",
                    isActive 
                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-500/80 hover:border-blue-500 shadow-2xs" 
                      : "bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-50 truncate">
                        {dataset.name}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-600 text-white uppercase tracking-widest shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono font-bold mt-1">
                      {dataset.rowCount.toLocaleString()} rows • {dataset.colCount} cols
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {getHealthBadge(dsHealth.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-400 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
