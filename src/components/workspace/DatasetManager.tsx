import React, { useState, useMemo } from 'react';
import { Dataset, ViewState } from '@/types';
import { DataUploader } from './DataUploader';
import { DataQualityPanel } from './DataQualityPanel';
import { calculateDatasetHealth, profileColumn, ExtendedColumnProfile } from '@/lib/profiler';
import { createDemoDataset } from '@/lib/demoData';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileSpreadsheet, Trash2, Edit3, CheckCircle2, AlertTriangle, XCircle, 
  Hash, Calendar, Tag, CaseSensitive, Activity, Layers, Table, Search, RefreshCw,
  BarChart3, FileText, LayoutGrid, Lock, Play, Sparkles, Database, UploadCloud, ChevronRight, HelpCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface DatasetManagerProps {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  onImport: (datasets: Dataset[], replaceFilenames?: string[]) => void;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [lockedFeatureMessage, setLockedFeatureMessage] = useState<string | null>(null);

  const activeDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0] || null;

  // Active Dataset Health & Profiles (Moved before early return to satisfy Rules of Hooks)
  const health = useMemo(() => {
    if (!activeDataset) {
      return {
        score: 0,
        status: 'Critical' as const,
        totalCells: 0,
        missingCells: 0,
        missingCellsPercentage: 0,
        duplicateRows: 0,
        duplicateRowsPercentage: 0,
        issuesCount: 0,
        issueBreakdown: {
          missingValuesColumns: 0,
          duplicateRowsCount: 0,
          invalidDatesCount: 0,
          emptyColumnsCount: 0
        }
      };
    }
    return calculateDatasetHealth(activeDataset);
  }, [activeDataset]);
  
  const columnProfilesMap = useMemo(() => {
    const map: Record<string, ExtendedColumnProfile> = {};
    if (!activeDataset) return map;
    activeDataset.headers.forEach(header => {
      const colType = activeDataset.columnTypes?.[header] || 'text';
      map[header] = profileColumn(activeDataset.fullData || [], header, colType);
    });
    return map;
  }, [activeDataset]);

  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets;
    const q = searchQuery.toLowerCase();
    return datasets.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.filename.toLowerCase().includes(q) ||
      (d.sheetName && d.sheetName.toLowerCase().includes(q))
    );
  }, [datasets, searchQuery]);

  const groupedDatasets = useMemo(() => {
    return filteredDatasets.reduce((acc, ds) => {
      if (!acc[ds.filename]) acc[ds.filename] = [];
      acc[ds.filename].push(ds);
      return acc;
    }, {} as Record<string, Dataset[]>);
  }, [filteredDatasets]);

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
    const handleLoadDemo = async () => {
      setIsDemoLoading(true);
      try {
        const demoDataset = await createDemoDataset();
        onImport([demoDataset]);
      } catch (error) {
        console.error("Failed to load demo dataset", error);
      } finally {
        setIsDemoLoading(false);
      }
    };

    return (
      <div className="flex-1 flex flex-col min-h-full p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-zinc-50/20 dark:bg-zinc-950/25 relative overflow-hidden">
        <style>{`
          @keyframes data-dash-flow {
            to {
              stroke-dashoffset: -100;
            }
          }
          .animate-data-flow {
            animation: data-dash-flow 10s linear infinite;
          }
        `}</style>

        {/* Subtle Workbook Canvas Grid Motif */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />
        
        {/* Subtle Ambient Glowing Spheres for Deep Immersive Glow */}
        <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-[80px] pointer-events-none z-0 animate-slow-rotate" style={{ transformOrigin: '40% 40%' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/5 dark:bg-indigo-500/8 blur-[100px] pointer-events-none z-0 animate-slow-rotate" style={{ transformOrigin: '60% 60%', animationDirection: 'reverse', animationDuration: '45s' }} />

        {/* Subtle analytics-themed animated background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-20">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M -100,150 Q 200,80 500,200 T 1100,100 T 1700,250" 
              fill="none" 
              stroke="rgba(59, 130, 246, 0.2)" 
              strokeWidth="1.5" 
              strokeDasharray="6, 12"
              className="animate-data-flow"
            />
            <path 
              d="M -100,350 Q 400,450 900,300 T 1900,400" 
              fill="none" 
              stroke="rgba(147, 51, 234, 0.15)" 
              strokeWidth="1.5" 
              strokeDasharray="4, 10"
              className="animate-data-flow"
              style={{ animationDuration: '15s', animationDirection: 'reverse' }}
            />
            <circle cx="20%" cy="15%" r="3" fill="rgba(59, 130, 246, 0.3)" className="animate-pulse" />
            <circle cx="75%" cy="30%" r="4" fill="rgba(147, 51, 234, 0.2)" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
            <circle cx="45%" cy="70%" r="2" fill="rgba(16, 185, 129, 0.2)" className="animate-pulse" style={{ animationDelay: '0.7s' }} />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto w-full space-y-8 relative z-10 py-2">
          {/* Main Welcome Area Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white/45 dark:bg-zinc-900/25 border border-zinc-200/50 dark:border-zinc-800/50 p-6 lg:p-8 rounded-2xl relative overflow-hidden z-10 shadow-sm backdrop-blur-md">
            {/* LEFT COLUMN: Welcome Hero */}
            <div className="lg:col-span-7 space-y-5 flex flex-col justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 dark:bg-blue-950/85 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 w-fit select-none">
                <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400 animate-pulse" />
                <span>Enterprise Suite</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 leading-none">
                  Analytics Toolkit
                </h1>
                <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 leading-snug">
                  Turn raw business data into clean, reliable insights.
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl font-medium">
                  Import your Excel, CSV, or supported dataset to profile, clean, analyze, build KPIs, create dashboards, and generate MIS reports.
                </p>
              </div>

              {/* Core Actions */}
              <div className="flex flex-wrap gap-3 items-center">
                <Button 
                  onClick={() => {
                    const el = document.getElementById('quick-import-file-input');
                    if (el) (el as HTMLInputElement).click();
                  }}
                  className="text-xs font-bold tracking-wide h-9.5 px-5 bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm rounded-lg transition-all duration-200 hover-elevate cursor-pointer border-none flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-4 h-4" /> Import Data
                </Button>
                <Button 
                  onClick={handleLoadDemo}
                  disabled={isDemoLoading}
                  className="text-xs font-bold tracking-wide h-9.5 px-5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 shrink-0 shadow-sm rounded-lg transition-all duration-200 hover-elevate cursor-pointer border border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-center gap-1.5"
                >
                  {isDemoLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                      <span>Loading Demo...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-zinc-500" />
                      <span>Try Demo Dataset</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* RIGHT COLUMN: Premium Drop Zone */}
            <div className="lg:col-span-5 relative">
              <div className="living-glow-card rounded-2xl p-1 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 dark:bg-blue-500 rounded-l-2xl z-20" />
                <div className="pl-3.5 pr-2 px-1 relative z-10">
                  <DataUploader onDatasetsImported={onImport} existingDatasets={datasets} />
                </div>
              </div>
            </div>
          </div>

          <input
            type="file"
            multiple
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/json, text/plain"
            className="hidden"
            id="quick-import-file-input"
            onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
                setIsDemoLoading(true);
                try {
                  const { processDataset } = await import('@/lib/analyzer');
                  const filesList = Array.from(e.target.files);
                  let imported: Dataset[] = [];
                  for (const file of filesList) {
                    const ds = await processDataset(file);
                    imported = imported.concat(ds);
                  }
                  if (imported.length > 0) {
                    onImport(imported);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsDemoLoading(false);
                }
              }
            }}
          />

          {/* Visual Connected Workflow Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase text-center lg:text-left select-none">
              Integrated Analytics Workflow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {/* Horizontal connection line on desktop */}
              <div className="hidden md:block absolute top-[26px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-blue-500/80 via-purple-500/50 to-indigo-500/80 z-0" />
              
              {[
                { step: 'Import', icon: <UploadCloud className="w-5 h-5 text-blue-500 dark:text-blue-400" />, desc: 'Local Excel / CSV upload' },
                { step: 'Profile', icon: <Activity className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />, desc: 'Auto schema assessment' },
                { step: 'Clean', icon: <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />, desc: 'Remediate quality issues' },
                { step: 'Analyze', icon: <BarChart3 className="w-5 h-5 text-purple-500 dark:text-purple-400" />, desc: 'Create custom metrics' },
                { step: 'Report', icon: <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />, desc: 'Generate MIS PDFs' }
              ].map((s, idx) => (
                <div 
                  key={s.step}
                  className="relative flex flex-col items-center p-4 bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl hover:shadow-md hover:-translate-y-0.5 hover:border-blue-500/30 dark:hover:border-blue-500/40 transition-all duration-300 group z-10 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-800/80 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 z-10">
                    {s.icon}
                  </div>
                  <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-3">{s.step}</span>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">{s.desc}</p>
                  {idx < 4 && (
                    <div className="md:hidden mt-3 text-zinc-400 dark:text-zinc-600 font-extrabold text-sm">↓</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Capability Cards Grid */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase select-none">
              Analytical Suite Capabilities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: 'cleaning',
                  title: 'Data Cleaning',
                  desc: 'Clean messy Excel/CSV data, detect problems, split columns, extract values, standardize data, and prepare reliable datasets.',
                  icon: <Activity className="w-5 h-5 text-amber-500" />
                },
                {
                  id: 'kpi-builder',
                  title: 'KPI Builder',
                  desc: 'Build custom business KPIs from any validated dataset.',
                  icon: <BarChart3 className="w-5 h-5 text-blue-500" />
                },
                {
                  id: 'dashboards',
                  title: 'Dashboard',
                  desc: 'Turn KPIs and analytical data into interactive dashboards.',
                  icon: <LayoutGrid className="w-5 h-5 text-emerald-500" />
                },
                {
                  id: 'mis-report',
                  title: 'MIS Reports',
                  desc: 'Generate professional management reports and export them to Excel/PDF.',
                  icon: <FileText className="w-5 h-5 text-indigo-500" />
                }
              ].map((card) => (
                <div 
                  key={card.id}
                  onClick={() => setLockedFeatureMessage(card.title)}
                  className="living-glow-card p-5 cursor-pointer relative overflow-hidden group select-none hover:shadow-lg transition-all duration-300 border-none"
                >
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-zinc-200/30 dark:border-zinc-800/30 group-hover:scale-110 transition-all duration-300">
                      {card.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {card.title}
                        </h4>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Locked</span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic feedback banner when a locked action is clicked */}
          {lockedFeatureMessage && (
            <div className="p-4 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-md">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong className="font-extrabold mr-1">Import a dataset to use this feature.</strong>
                  (Locked: {lockedFeatureMessage})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => {
                    const el = document.getElementById('quick-import-file-input');
                    if (el) (el as HTMLInputElement).click();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 h-8 text-[11px] border-none shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Import Data
                </Button>
                <button 
                  onClick={() => setLockedFeatureMessage(null)} 
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-extrabold p-1 select-none cursor-pointer bg-transparent border-none text-sm"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isCleaned = activeDataset.cleaningStatus === 'cleaned';

  return (
    <div className="flex-1 flex flex-col min-h-full min-w-0 bg-transparent p-6 lg:p-8 space-y-6">
      
      {/* Page Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Data Import & Profile</h1>
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
          <DataUploader onDatasetsImported={(newDs, replaces) => {
            onImport(newDs, replaces);
            setShowImportBox(false);
          }} compact existingDatasets={datasets} />
        </div>
      )}

      {/* 0. Dataset Navigation */}
      <div className="glass-panel glass-card rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            Workspace Datasets
          </h3>
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search datasets, sheets, or files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs font-semibold bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {Object.keys(groupedDatasets).length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-500 font-semibold">
              No datasets found matching your search.
            </div>
          ) : (
            Object.entries(groupedDatasets).map(([filename, groupDatasets]) => (
              <div key={filename} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center border border-zinc-100 dark:border-zinc-800/50 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="flex items-center gap-2 sm:w-48 shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate" title={filename}>
                    {filename}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {groupDatasets.map(ds => {
                    const isActive = ds.id === activeDataset.id;
                    return (
                      <div
                        key={ds.id}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border group/chip",
                          isActive 
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                            : "bg-white dark:bg-zinc-950 text-zinc-650 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        )}
                      >
                        <button
                          onClick={() => onSelectDataset(ds.id)}
                          className="cursor-pointer truncate max-w-[180px] font-bold text-left"
                        >
                          {ds.sheetName || ds.name}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(ds.id);
                          }}
                          title={`Delete ${ds.name}`}
                          className={cn(
                            "p-1 rounded transition-colors cursor-pointer ml-1",
                            isActive 
                              ? "text-blue-200 hover:text-white hover:bg-blue-700" 
                              : "text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
            <div className="pl-2 border-l border-zinc-200/50 dark:border-zinc-800/50 flex items-center gap-2">
               <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30 transition-all font-semibold cursor-pointer"
                  onClick={() => onRemove(activeDataset.id)}
               >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Dataset
               </Button>
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

      {/* 3. Deterministic Data Quality Scanner & Issues Panel */}
      <div className="glass-panel glass-card rounded-2xl p-6 shadow-sm">
        <DataQualityPanel
          dataset={activeDataset}
          onNavigateView={onNavigateView}
          embedded
        />
      </div>

      {/* 4. Column Profiling Table */}
      <div className="glass-panel glass-card rounded-xl flex-1 flex flex-col min-h-[340px] overflow-hidden shadow-sm">
        <div className="p-4.5 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/30 dark:bg-black/20 flex items-center justify-between backdrop-blur-md rounded-t-xl shrink-0">
          <div>
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50">Column Schema & Profiling</h3>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Detailed statistics, data types, missingness, and range distributions for all {activeDataset.headers.length} attributes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
              {activeDataset.headers.length} Columns Profiled
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest select-none backdrop-blur-md">
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

        {/* Card Footer Summary */}
        <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-[11px] text-zinc-500 shrink-0 font-medium select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Schema profiled and validated for active dataset</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">
            {activeDataset.rowCount.toLocaleString()} rows • {activeDataset.headers.length} attributes
          </span>
        </div>
      </div>

    </div>
  );
}
