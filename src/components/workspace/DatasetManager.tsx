import React, { useState } from 'react';
import { Dataset, ViewState } from '@/types';
import { DataUploader } from './DataUploader';
import { DataEditingStudio } from './DataEditingStudio';
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
  onUpdateDataset?: (dataset: Dataset) => void;
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
  onNavigateView,
  onUpdateDataset
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
      <div className="flex-1 flex flex-col min-h-0 p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-transparent">
        <div className="max-w-4xl mx-auto w-full space-y-8 py-8">
          {/* Header */}
          <div className="text-center space-y-2.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 text-blue-850 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
              Workspace Initialization
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              Data Import & Schema Profiling
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto leading-relaxed">
              Upload your Excel or CSV files to automatically audit rows, discover schema types, run health scoring, and prepare data for advanced analytics.
            </p>
          </div>

          {/* Primary Upload Area */}
          <div className="glass-panel rounded-2xl p-6 lg:p-8 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md">
            <DataUploader onDatasetsImported={onImport} />
          </div>

          {/* Guided Workflow Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4">
            {[
              { step: '01', title: 'Import Raw File', desc: 'Secure local upload of CSV, XLS, or XLSX spreadsheets.' },
              { step: '02', title: 'Inferred Profiling', desc: 'Auto-discover column attributes, types, and stats.' },
              { step: '03', title: 'Quality Audit', desc: 'Identify duplicates, missing cells, and outliers instantly.' },
              { step: '04', title: 'Clean & Workspace', desc: 'Standardize schema and proceed to custom dashboards.' },
            ].map((pipeline, idx) => (
              <div 
                key={idx} 
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                  e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                }}
                className="p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/15 text-xs space-y-1.5 backdrop-blur-sm relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-zinc-300/60 dark:hover:border-zinc-700/60 hover:-translate-y-[1px] interactive-glow interactive-glow-bg"
              >
                <span className="font-mono text-[10px] font-extrabold text-blue-600 dark:text-blue-400 block tracking-widest z-10 relative">{pipeline.step}</span>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 z-10 relative">{pipeline.title}</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold z-10 relative">{pipeline.desc}</p>
                <div className="absolute right-2 bottom-1.5 text-[22px] font-mono font-extrabold text-zinc-150/15 dark:text-zinc-850/15 group-hover:scale-110 transition-transform select-none z-0">
                  {idx + 1}
                </div>
              </div>
            ))}
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
    <div className="min-w-0 bg-transparent p-6 lg:p-8 pb-24 lg:pb-32 space-y-6">
      
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
            className="text-xs h-9 border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-850 dark:text-zinc-200 font-semibold cursor-pointer hover-elevate transition-all duration-200"
            onClick={() => setShowImportBox(!showImportBox)}
          >
            {showImportBox ? "Hide Import Uploader" : "Import New Dataset"}
          </Button>

          {/* Primary Workflow Actions */}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-9 text-zinc-850 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 gap-2 font-semibold cursor-pointer transition-all duration-200 hover-elevate shadow-xs"
            onClick={() => onNavigateView('explorer')}
          >
            <Table className="w-4 h-4 text-zinc-500" />
            <span>Explore Raw Data</span>
          </Button>

          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 gap-2 font-bold cursor-pointer transition-all duration-200 hover-elevate shadow-md rounded-md ring-2 ring-blue-500/10 hover:ring-blue-500/20"
            onClick={() => onNavigateView('cleaning')}
          >
            <Activity className="w-4 h-4" />
            <span>Proceed to Data Cleaning →</span>
          </Button>
        </div>
      </div>

      {/* Optional Collapsible Import Form */}
      {showImportBox && (
        <div className="p-5 glass-panel rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <DataUploader onDatasetsImported={(newDs) => {
            onImport(newDs);
            setShowImportBox(false);
          }} compact />
        </div>
      )}

      {/* 1. Dataset Information Card */}
      <div className="glass-panel glass-card rounded-xl p-5">
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
          <div key={idx} className="glass-panel glass-card rounded-xl p-4.5">
            <span className="text-[9px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{kpi.label}</span>
            <p className="text-xl lg:text-2xl font-extrabold font-mono text-zinc-900 dark:text-zinc-50 mt-1.5 leading-none">
              {kpi.value}
            </p>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-450 mt-1.5 block font-semibold">{kpi.desc}</span>
          </div>
        ))}

        <div className="glass-panel glass-card rounded-xl p-4.5 col-span-2 md:col-span-1">
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
      <div className="glass-panel glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50">Data Health & Issues Assessment</h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400">
            {health.issuesCount} pending issue{health.issuesCount === 1 ? '' : 's'} identified
          </span>
        </div>

        {health.score >= 90 && health.issueBreakdown.duplicateRowsCount === 0 && health.issueBreakdown.missingValuesColumns === 0 ? (
          <div className="flex items-center gap-3 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-bold">Exceptional Data Integrity</p>
              <p className="text-[11px] text-zinc-550 dark:text-zinc-400 font-semibold leading-relaxed">
                High quality dataset structure. No critical missing values or duplicate records detected. Ready for immediate exploratory analysis.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Missing values card */}
            <div className={cn(
              "p-4 rounded-xl border transition-all duration-200",
              health.issueBreakdown.missingValuesColumns > 0 
                ? "bg-red-50/40 dark:bg-red-950/10 border-red-200/60 dark:border-red-900/40" 
                : "bg-zinc-50/40 dark:bg-zinc-900/20 border-zinc-200/60 dark:border-zinc-800/60"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Attribute Completeness</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider",
                  health.issueBreakdown.missingValuesColumns > 0 ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-emerald-100 text-emerald-800"
                )}>
                  {health.issueBreakdown.missingValuesColumns > 0 ? "Critical" : "Passed"}
                </span>
              </div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {health.issueBreakdown.missingValuesColumns} Column{health.issueBreakdown.missingValuesColumns === 1 ? '' : 's'} Affected
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 font-semibold">
                {health.missingCells > 0 ? `${health.missingCells} total blank or empty records found across headers.` : "No null or blank cells detected."}
              </p>
              {health.issueBreakdown.missingValuesColumns > 0 && (
                <button onClick={() => onNavigateView('cleaning')} className="text-[10px] text-blue-600 dark:text-blue-450 font-bold hover:underline mt-2.5 block">
                  Resolve empty cells in Cleaning →
                </button>
              )}
            </div>

            {/* Duplicates card */}
            <div className={cn(
              "p-4 rounded-xl border transition-all duration-200",
              health.issueBreakdown.duplicateRowsCount > 0 
                ? "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/40" 
                : "bg-zinc-50/40 dark:bg-zinc-900/20 border-zinc-200/60 dark:border-zinc-800/60"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Row Redundancy</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider",
                  health.issueBreakdown.duplicateRowsCount > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-100 text-emerald-800"
                )}>
                  {health.issueBreakdown.duplicateRowsCount > 0 ? "Warning" : "Passed"}
                </span>
              </div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {health.issueBreakdown.duplicateRowsCount} Duplicate Row{health.issueBreakdown.duplicateRowsCount === 1 ? '' : 's'}
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 font-semibold">
                {health.issueBreakdown.duplicateRowsCount > 0 ? `${health.duplicateRowsPercentage}% exact duplicates found which skew statistics.` : "No redundant duplicate records found."}
              </p>
              {health.issueBreakdown.duplicateRowsCount > 0 && (
                <button onClick={() => onNavigateView('cleaning')} className="text-[10px] text-blue-600 dark:text-blue-450 font-bold hover:underline mt-2.5 block">
                  De-duplicate records in Cleaning →
                </button>
              )}
            </div>

            {/* Date anomalies card */}
            <div className={cn(
              "p-4 rounded-xl border transition-all duration-200",
              health.issueBreakdown.invalidDatesCount > 0 
                ? "bg-blue-50/40 dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/40" 
                : "bg-zinc-50/40 dark:bg-zinc-900/20 border-zinc-200/60 dark:border-zinc-800/60"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-400">Standardization</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider",
                  health.issueBreakdown.invalidDatesCount > 0 ? "bg-blue-100 text-blue-850 dark:bg-blue-950 dark:text-blue-300" : "bg-emerald-100 text-emerald-800"
                )}>
                  {health.issueBreakdown.invalidDatesCount > 0 ? "Info" : "Passed"}
                </span>
              </div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {health.issueBreakdown.invalidDatesCount} Non-Standard Dates
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1 font-semibold">
                {health.issueBreakdown.invalidDatesCount > 0 ? `Unstructured string-formatted date records detected in timeline fields.` : "All timeline dimensions conform to standard ISO formats."}
              </p>
              {health.issueBreakdown.invalidDatesCount > 0 && (
                <button onClick={() => onNavigateView('cleaning')} className="text-[10px] text-blue-600 dark:text-blue-450 font-bold hover:underline mt-2.5 block">
                  Standardize dates in Cleaning →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Column Profiling Table */}
      <div className="glass-panel glass-card rounded-xl mb-6">
        <div className="p-4.5 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/30 dark:bg-black/20 flex items-center justify-between backdrop-blur-md rounded-t-xl">
          <div>
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50">Column Schema & Profiling</h3>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Detailed statistics, data types, missingness, and range distributions for all {activeDataset.headers.length} attributes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/40 dark:bg-white/5 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest select-none backdrop-blur-md">
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

      {/* 5. Data Preview Table */}
      <DataEditingStudio 
        dataset={activeDataset} 
        onSave={(updatedDataset) => {
          if (onUpdateDataset) {
            onUpdateDataset(updatedDataset);
          }
        }} 
      />

      {/* 6. Recent Workspace Datasets */}
      {datasets.length > 1 && (
        <div className="glass-panel glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              All Workspace Datasets ({datasets.length})
            </h3>
            <span className="text-[11px] font-bold text-zinc-450 dark:text-zinc-500">Click to switch Active Dataset</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(
              datasets.reduce((acc, ds) => {
                if (!acc[ds.filename]) acc[ds.filename] = [];
                acc[ds.filename].push(ds);
                return acc;
              }, {} as Record<string, Dataset[]>)
            ).map(([filename, groupDatasets]) => (
              <div key={filename} className="glass-panel glass-card rounded-xl border border-zinc-200/50 dark:border-zinc-800 p-3 space-y-2">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{filename}</span>
                </div>
                <div className="space-y-1.5">
                  {groupDatasets.map(dataset => {
                    const isActive = dataset.id === activeDataset.id;
                    const dsHealth = calculateDatasetHealth(dataset);

                    return (
                      <div
                        key={dataset.id}
                        onClick={() => onSelectDataset(dataset.id)}
                        className={cn(
                          "p-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between group",
                          isActive 
                            ? "bg-blue-50/70 dark:bg-blue-950/30 border border-blue-500/80 shadow-2xs" 
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <Table className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="font-bold text-zinc-900 dark:text-zinc-50 truncate text-[11px]">
                              {dataset.sheetName || dataset.name}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-extrabold px-1 py-0.5 rounded bg-blue-600 text-white uppercase tracking-widest shrink-0 ml-1">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono font-bold mt-1 ml-5">
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
