import React, { useState, useMemo } from 'react';
import { Dataset, CleaningIssue, CleaningLog, ViewState } from '@/types';
import { 
  Sparkles, Check, X, Undo2, FileText, AlertTriangle, ShieldCheck, 
  Database, History, Wrench, Download, Filter, Type, RefreshCw, 
  Search, ChevronLeft, ChevronRight, Eye, ArrowLeft, RotateCcw, 
  HelpCircle, Calendar, Hash, Tag, Layers, Sliders, CheckCircle2,
  Trash2, ArrowRight, ShieldAlert
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { DataQualityPanel } from '../workspace/DataQualityPanel';
import { AICleaningCopilotPanel } from '../workspace/AICleaningCopilotPanel';
import { CleaningPreviewModal } from '../workspace/CleaningPreviewModal';
import { scanDatasetQuality } from '@/lib/qualityScanner';
import { CleaningActionType } from '@/lib/manualCleaningEngine';
import { 
  removeNullsCustom, 
  cleanHeadersCustom, 
  castColumnTypeCustom, 
  filterOutliersCustom, 
  transformTextCustom,
  standardizeDatesCustom,
  calculateIQRStats,
  restoreOriginal
} from '@/lib/dataCleaner';
import { calculateDatasetHealth } from '@/lib/profiler';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface CleaningViewProps {
  datasets: Dataset[];
  onApplyIssue: (datasetId: string, issueId: string) => void;
  onRejectIssue: (datasetId: string, issueId: string) => void;
  onUndoLog: (datasetId: string, logId: string) => void;
  onApproveAllSafe: (datasetId: string) => void;
  onUpdateDataset?: (updatedDataset: Dataset) => void;
  onNavigateView?: (view: ViewState) => void;
}

export function CleaningView({ 
  datasets, 
  onApplyIssue, 
  onRejectIssue, 
  onUndoLog, 
  onApproveAllSafe, 
  onUpdateDataset,
  onNavigateView
}: CleaningViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(datasets[0]?.id || null);
  const [leftTab, setLeftTab] = useState<'issues' | 'tools'>('issues');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQualityAudit, setShowQualityAudit] = useState(false);
  const [showAICopilotModal, setShowAICopilotModal] = useState(false);
  const [activeCleaningModal, setActiveCleaningModal] = useState<{
    actionType: CleaningActionType;
    column?: string;
    variations?: string[];
  } | null>(null);

  // Selected issue for live highlight in preview
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Preview state for manual/custom tool actions
  const [previewConfig, setPreviewConfig] = useState<{
    title: string;
    actionType: 'nulls' | 'headers' | 'cast' | 'outliers' | 'text' | 'date' | 'issue';
    column?: string;
    params?: any;
    issueId?: string;
  } | null>(null);

  // Table controls
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Custom tool configurations
  const [nullCol, setNullCol] = useState<string>('');
  const [nullStrategy, setNullStrategy] = useState<'drop' | 'zero' | 'mean' | 'median' | 'mode' | 'text'>('mean');
  const [nullCustomText, setNullCustomText] = useState('Unknown');

  const [headerStyle, setHeaderStyle] = useState<'snake_case' | 'lowercase' | 'trim'>('snake_case');

  const [castCol, setCastCol] = useState<string>('');
  const [targetType, setTargetType] = useState<'numeric' | 'text' | 'date' | 'boolean'>('numeric');

  const [textCol, setTextCol] = useState<string>('');
  const [textAction, setTextAction] = useState<'trim' | 'lowercase' | 'uppercase' | 'titlecase'>('trim');

  const [dateCol, setDateCol] = useState<string>('');
  const [dateFormat, setDateFormat] = useState<'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'>('YYYY-MM-DD');

  const [outlierCol, setOutlierCol] = useState<string>('');
  const [zThreshold, setZThreshold] = useState<number>(1.5);

  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <div className="text-center max-w-sm p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <Sparkles className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No Datasets Available</h2>
          <p className="text-xs text-zinc-500 mt-1 mb-4">Please import a CSV or Excel dataset to begin data cleaning.</p>
          {onNavigateView && (
            <Button size="sm" onClick={() => onNavigateView('data-manager')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              Import Dataset
            </Button>
          )}
        </div>
      </div>
    );
  }

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  const issues = selectedDataset.issues || [];
  const logs = selectedDataset.cleaningLogs || [];

  const healthMetrics = calculateDatasetHealth(selectedDataset);
  
  const pendingIssues = issues.filter(i => i.status === 'pending');
  const safeIssues = pendingIssues.filter(i => i.riskLevel === 'low');

  const filteredIssues = pendingIssues.filter(issue => {
    if (severityFilter === 'high') return issue.riskLevel === 'high';
    if (severityFilter === 'medium') return issue.riskLevel === 'medium';
    if (severityFilter === 'low') return issue.riskLevel === 'low';
    return true;
  });

  const activeIssue = issues.find(i => i.id === selectedIssueId) || null;

  // Compute live dataset preview & diffs if preview is active
  const previewResult = useMemo(() => {
    if (!previewConfig || !selectedDataset) return null;

    if (previewConfig.actionType === 'nulls') {
      const updated = removeNullsCustom(
        selectedDataset, 
        previewConfig.column!, 
        previewConfig.params.strategy, 
        previewConfig.params.customText
      );
      return {
        updatedDataset: updated,
        affectedCol: previewConfig.column,
        description: `Fill/Remove nulls in "${previewConfig.column}" using ${previewConfig.params.strategy}`
      };
    }

    if (previewConfig.actionType === 'text') {
      const updated = transformTextCustom(selectedDataset, previewConfig.column!, previewConfig.params.action);
      return {
        updatedDataset: updated,
        affectedCol: previewConfig.column,
        description: `Text ${previewConfig.params.action} on "${previewConfig.column}"`
      };
    }

    if (previewConfig.actionType === 'cast') {
      const updated = castColumnTypeCustom(selectedDataset, previewConfig.column!, previewConfig.params.targetType);
      return {
        updatedDataset: updated,
        affectedCol: previewConfig.column,
        description: `Cast "${previewConfig.column}" to ${previewConfig.params.targetType}`
      };
    }

    if (previewConfig.actionType === 'date') {
      const updated = standardizeDatesCustom(selectedDataset, previewConfig.column!, previewConfig.params.dateFormat);
      return {
        updatedDataset: updated,
        affectedCol: previewConfig.column,
        description: `Standardize dates in "${previewConfig.column}" to ${previewConfig.params.dateFormat}`
      };
    }

    if (previewConfig.actionType === 'outliers') {
      const updated = filterOutliersCustom(selectedDataset, previewConfig.column!, previewConfig.params.threshold);
      return {
        updatedDataset: updated,
        affectedCol: previewConfig.column,
        description: `Exclude outliers in "${previewConfig.column}" (IQR x ${previewConfig.params.threshold})`
      };
    }

    if (previewConfig.actionType === 'headers') {
      const updated = cleanHeadersCustom(selectedDataset, previewConfig.params.style);
      return {
        updatedDataset: updated,
        description: `Clean all headers to ${previewConfig.params.style}`
      };
    }

    return null;
  }, [previewConfig, selectedDataset]);

  // Active dataset for table view (either live transformed preview or current dataset)
  const displayDataset = previewResult ? previewResult.updatedDataset : selectedDataset;
  const displayRows = displayDataset.fullData || [];

  // Filter rows by search term
  const searchedRows = useMemo(() => {
    if (!searchTerm.trim()) return displayRows;
    const term = searchTerm.toLowerCase();
    return displayRows.filter(row => 
      Object.values(row).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(term))
    );
  }, [displayRows, searchTerm]);

  // Paginated rows
  const totalPages = Math.ceil(searchedRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return searchedRows.slice(start, start + rowsPerPage);
  }, [searchedRows, currentPage, rowsPerPage]);

  const exportCSV = () => {
    const csv = Papa.unparse(selectedDataset.fullData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDataset.name.replace(/\.[^/.]+$/, "")}_cleaned.csv`;
    a.click();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(selectedDataset.fullData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cleaned Data");
    XLSX.writeFile(wb, `${selectedDataset.name.replace(/\.[^/.]+$/, "")}_cleaned.xlsx`);
  };

  const handleApplyPreview = () => {
    if (!previewResult || !onUpdateDataset) return;
    onUpdateDataset(previewResult.updatedDataset);
    setPreviewConfig(null);
  };

  const handleResetConfirm = () => {
    if (onUpdateDataset) {
      const resetDs = restoreOriginal(selectedDataset);
      onUpdateDataset(resetDs);
    }
    setShowResetModal(false);
  };

  // IQR stats for outlier tool if selected
  const outlierStats = useMemo(() => {
    if (!outlierCol) return null;
    return calculateIQRStats(selectedDataset.fullData, outlierCol);
  }, [selectedDataset, outlierCol]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-50 dark:bg-[#08080a] text-zinc-900 dark:text-zinc-100 pb-20">
      
      {/* ================================================== */}
      {/* 1. TOP HEADER & HEALTH SUMMARY                     */}
      {/* ================================================== */}
      <div className="glass-panel border-b-0 border-t-0 border-r-0 border-l-0 px-5 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          {onNavigateView && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateView('data-manager')}
              className="text-xs h-8 px-2.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 border-zinc-200 dark:border-zinc-800"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Profile
            </Button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Data Cleaning Suite</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <select
                value={selectedDatasetId || ''}
                onChange={(e) => {
                  setSelectedDatasetId(e.target.value);
                  setSelectedIssueId(null);
                  setPreviewConfig(null);
                }}
                className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.rowCount.toLocaleString()} rows)</option>
                ))}
              </select>
            </div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-0.5">
              {selectedDataset.name}
            </h1>
          </div>
        </div>

        {/* Health KPI Summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 px-3 py-1.5 rounded-lg">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Health Score</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "text-sm font-extrabold",
                  healthMetrics.score >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                  healthMetrics.score >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                )}>
                  {healthMetrics.score}/100
                </span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[10px] font-bold uppercase",
                  healthMetrics.status === 'Healthy' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                  healthMetrics.status === 'Needs Attention' ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" :
                  "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                )}>
                  {healthMetrics.status}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedDataset.rowCount.toLocaleString()}</span>
                <span className="text-[10px] text-zinc-400 ml-1">rows</span>
              </div>
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedDataset.headers.length}</span>
                <span className="text-[10px] text-zinc-400 ml-1">cols</span>
              </div>
              <div>
                <span className={cn(
                  "font-bold",
                  pendingIssues.length > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {pendingIssues.length}
                </span>
                <span className="text-[10px] text-zinc-400 ml-1">issues</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60"
              onClick={() => setShowQualityAudit(true)}
              title="Open Data Quality Scanner & Audit Panel"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
              Quality Audit
            </Button>

            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-8 text-zinc-600 dark:text-zinc-300 hover:text-red-600 border-zinc-200 dark:border-zinc-800"
              onClick={() => setShowResetModal(true)}
              title="Reset dataset back to original snapshot"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              Reset to Original
            </Button>

            <Button size="sm" variant="outline" className="text-xs h-8" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={exportExcel}>
              <Download className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MAIN WORKSPACE BODY (3-Area Layout)                */}
      {/* ================================================== */}
      <div className="flex-1 flex min-h-0">
        
        {/* -------------------------------------------------- */}
        {/* LEFT PANEL: Quality Issues & Cleaning Tools       */}
        {/* -------------------------------------------------- */}
        <div className="w-80 glass-panel border-l-0 border-t-0 border-b-0 flex flex-col shrink-0">
          
          {/* Left Panel Tabs */}
          <div className="p-2 border-b border-zinc-200/50 dark:border-zinc-800/50 flex gap-1.5 bg-zinc-50/20 dark:bg-[#0c0d12]/20">
            <button
              onClick={() => setLeftTab('issues')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-3xs",
                leftTab === 'issues'
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80"
                  : "text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200"
              )}
            >
              <AlertTriangle className={cn("w-3.5 h-3.5", pendingIssues.length > 0 ? "text-orange-500" : "text-emerald-500")} />
              Quality Audit ({pendingIssues.length})
            </button>
            <button
              onClick={() => setLeftTab('tools')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-3xs",
                leftTab === 'tools'
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80"
                  : "text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200"
              )}
            >
              <Wrench className="w-3.5 h-3.5 text-blue-500" />
              Cleaning Tools
            </button>
          </div>

          {/* Workflow Steps Indicator */}
          <div className="px-4 py-3 bg-zinc-50/55 dark:bg-zinc-950/40 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-2">
              <span>Interactive Workflow</span>
              <span className="text-blue-600 dark:text-blue-400">Step {previewResult ? '3 of 4' : selectedIssueId ? '2 of 4' : '1 of 4'}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '1. Audit', active: true },
                { label: '2. Review', active: !!selectedIssueId || !!previewResult },
                { label: '3. Preview', active: !!previewResult },
                { label: '4. Confirm', active: false }
              ].map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    step.active ? "bg-blue-600 dark:bg-blue-500" : "bg-zinc-200 dark:bg-zinc-800"
                  )} />
                  <span className={cn(
                    "block text-[9px] text-center font-bold tracking-tight select-none",
                    step.active ? "text-zinc-850 dark:text-zinc-250 font-extrabold" : "text-zinc-400"
                  )}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Left Panel Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {leftTab === 'issues' ? (
              <div className="space-y-3">
                
                {/* Severity Filter Pills */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-1">
                  <span>Filter Severity:</span>
                  <div className="flex gap-1">
                    {(['all', 'high', 'medium', 'low'] as const).map(sev => (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={cn(
                          "px-1.5 py-0.5 rounded capitalize text-[10px] font-semibold transition-colors",
                          severityFilter === sev 
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" 
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                        )}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Batch Safe Action */}
                {safeIssues.length > 0 && (
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-2.5 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">{safeIssues.length} Low-Risk Fixes</p>
                      <p className="text-[10px] text-blue-700 dark:text-blue-400">Safe whitespace & case fixes</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => onApproveAllSafe(selectedDataset.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-7 px-2"
                    >
                      Approve All
                    </Button>
                  </div>
                )}

                {/* Issues List */}
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">No Pending Issues</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {pendingIssues.length === 0 
                        ? "Your dataset is clean or all issues have been addressed." 
                        : "No issues match the selected severity filter."}
                    </p>
                    {pendingIssues.length === 0 && (
                      <div className="mt-4 flex flex-col gap-1.5">
                        {onNavigateView && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => onNavigateView('explorer')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                            >
                              Explore Dataset →
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onNavigateView('dashboards')}
                              className="text-xs h-7"
                            >
                              Build Dashboard →
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredIssues.map(issue => {
                      const isFocused = selectedIssueId === issue.id;
                      const severityBorderClass = issue.riskLevel === 'high' 
                        ? 'border-l-4 border-l-red-500 dark:border-l-red-650' 
                        : issue.riskLevel === 'medium' 
                        ? 'border-l-4 border-l-amber-500 dark:border-l-amber-650' 
                        : 'border-l-4 border-l-blue-500 dark:border-l-blue-650';

                      return (
                        <div 
                          key={issue.id}
                          onClick={() => setSelectedIssueId(isFocused ? null : issue.id)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 relative overflow-hidden shadow-3xs hover:-translate-y-0.25 hover:shadow-2xs",
                            severityBorderClass,
                            isFocused
                              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500 shadow-xs"
                              : "bg-white/95 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300/85 dark:hover:border-zinc-700"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                issue.riskLevel === 'high' ? "bg-red-500" :
                                issue.riskLevel === 'medium' ? "bg-amber-500" : "bg-blue-500"
                              )} />
                              <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 leading-tight">
                                {issue.title}
                              </h4>
                            </div>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0",
                              issue.riskLevel === 'high' ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
                              issue.riskLevel === 'medium' ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                              "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            )}>
                              {issue.riskLevel === 'high' ? 'Critical' : issue.riskLevel === 'medium' ? 'Warning' : 'Info'}
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {issue.description}
                          </p>

                          {issue.column && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded w-fit">
                              <span>Col:</span>
                              <span className="font-bold">{issue.column}</span>
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRejectIssue(selectedDataset.id, issue.id);
                              }}
                              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                              Dismiss
                            </button>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIssueId(issue.id);
                                }}
                                className="h-6 px-2 text-[10px] border-zinc-200 dark:border-zinc-800"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Inspect
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApplyIssue(selectedDataset.id, issue.id);
                                }}
                                className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* CLEANING TOOLS TAB */
              <div className="space-y-4">
                
                {/* 1. Missing Values Tool */}
                <div className="glass-card p-3 space-y-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <Filter className="w-3.5 h-3.5 text-blue-500" />
                    <span>1. Missing Values Handler</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Target Column</label>
                      <select 
                        value={nullCol}
                        onChange={(e) => setNullCol(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Select Column...</option>
                        {selectedDataset.headers.map(h => (
                          <option key={h} value={h}>
                            {h} ({selectedDataset.columnProfiles[h]?.nullCount || 0} nulls)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Strategy</label>
                      <select 
                        value={nullStrategy}
                        onChange={(e) => setNullStrategy(e.target.value as any)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="drop">Drop Rows with Nulls</option>
                        <option value="mean">Fill with Mean (Numeric)</option>
                        <option value="median">Fill with Median (Numeric)</option>
                        <option value="mode">Fill with Mode (Categorical)</option>
                        <option value="zero">Fill with 0</option>
                        <option value="text">Fill with Custom Text</option>
                      </select>
                    </div>

                    {nullStrategy === 'text' && (
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Custom Text Value</label>
                        <input 
                          type="text" 
                          value={nullCustomText} 
                          onChange={(e) => setNullCustomText(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100" 
                        />
                      </div>
                    )}

                    <Button 
                      size="sm" 
                      disabled={!nullCol}
                      onClick={() => setPreviewConfig({
                        title: `Fill missing values in "${nullCol}" (${nullStrategy})`,
                        actionType: 'nulls',
                        column: nullCol,
                        params: { strategy: nullStrategy, customText: nullCustomText }
                      })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 mt-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview Null Fix
                    </Button>
                  </div>
                </div>

                {/* 2. Text Format Tool */}
                <div className="glass-card p-3 space-y-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <Type className="w-3.5 h-3.5 text-amber-500" />
                    <span>2. Text Cleaner & Casing</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Text Column</label>
                      <select 
                        value={textCol}
                        onChange={(e) => setTextCol(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Select Column...</option>
                        {selectedDataset.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Action</label>
                      <select 
                        value={textAction}
                        onChange={(e) => setTextAction(e.target.value as any)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="trim">Trim Leading / Trailing Whitespace</option>
                        <option value="titlecase">Title Case (e.g. "John Smith")</option>
                        <option value="lowercase">Lowercase (e.g. "john smith")</option>
                        <option value="uppercase">Uppercase (e.g. "JOHN SMITH")</option>
                      </select>
                    </div>

                    <Button 
                      size="sm" 
                      disabled={!textCol}
                      onClick={() => setPreviewConfig({
                        title: `Text ${textAction} on "${textCol}"`,
                        actionType: 'text',
                        column: textCol,
                        params: { action: textAction }
                      })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 mt-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview Text Action
                    </Button>
                  </div>
                </div>

                {/* 3. Cast Data Type Tool */}
                <div className="glass-card p-3 space-y-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                    <span>3. Data Type Converter</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Target Column</label>
                      <select 
                        value={castCol}
                        onChange={(e) => setCastCol(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Select Column...</option>
                        {selectedDataset.headers.map(h => (
                          <option key={h} value={h}>{h} ({selectedDataset.columnTypes[h] || 'text'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Target Data Type</label>
                      <select 
                        value={targetType}
                        onChange={(e) => setTargetType(e.target.value as any)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="numeric">Numeric (Integer/Float)</option>
                        <option value="text">Text (String)</option>
                        <option value="date">Date (ISO Format)</option>
                        <option value="boolean">Boolean (True/False)</option>
                      </select>
                    </div>

                    <Button 
                      size="sm" 
                      disabled={!castCol}
                      onClick={() => setPreviewConfig({
                        title: `Cast "${castCol}" to ${targetType}`,
                        actionType: 'cast',
                        column: castCol,
                        params: { targetType }
                      })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 mt-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview Type Cast
                    </Button>
                  </div>
                </div>

                {/* 4. Date Standardizer */}
                <div className="glass-card p-3 space-y-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <Calendar className="w-3.5 h-3.5 text-purple-500" />
                    <span>4. Date Standardizer</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Date Column</label>
                      <select 
                        value={dateCol}
                        onChange={(e) => setDateCol(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Select Column...</option>
                        {selectedDataset.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Target Format</label>
                      <select 
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value as any)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (EU Format)</option>
                      </select>
                    </div>

                    <Button 
                      size="sm" 
                      disabled={!dateCol}
                      onClick={() => setPreviewConfig({
                        title: `Standardize dates in "${dateCol}" to ${dateFormat}`,
                        actionType: 'date',
                        column: dateCol,
                        params: { dateFormat }
                      })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 mt-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview Date Formatting
                    </Button>
                  </div>
                </div>

                {/* 5. Outliers Tool */}
                <div className="glass-card p-3 space-y-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span>5. Statistical Outliers (IQR)</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Numeric Column</label>
                      <select 
                        value={outlierCol}
                        onChange={(e) => setOutlierCol(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Select Numeric Column...</option>
                        {selectedDataset.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    {outlierStats && (
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-2 rounded text-[10px] space-y-1 font-mono text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex justify-between">
                          <span>Q1: {outlierStats.q1}</span>
                          <span>Q3: {outlierStats.q3}</span>
                          <span>IQR: {outlierStats.iqr}</span>
                        </div>
                        <div className="flex justify-between text-zinc-800 dark:text-zinc-200 font-bold border-t border-zinc-200/60 dark:border-zinc-800 pt-1">
                          <span>Bounds: [{outlierStats.lowerBound}, {outlierStats.upperBound}]</span>
                          <span className="text-red-500">{outlierStats.outlierCount} outliers</span>
                        </div>
                      </div>
                    )}

                    <Button 
                      size="sm" 
                      disabled={!outlierCol}
                      onClick={() => setPreviewConfig({
                        title: `Trim outliers in "${outlierCol}" (IQR x ${zThreshold})`,
                        actionType: 'outliers',
                        column: outlierCol,
                        params: { threshold: zThreshold }
                      })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 mt-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview Outlier Trim
                    </Button>
                  </div>
                </div>

                {/* 6. Clean Headers Tool */}
                <div className="glass-card p-3 space-y-2.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <Sliders className="w-3.5 h-3.5 text-teal-500" />
                    <span>6. Standardize Headers</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Style</label>
                      <select 
                        value={headerStyle}
                        onChange={(e) => setHeaderStyle(e.target.value as any)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="snake_case">snake_case (e.g. order_date)</option>
                        <option value="lowercase">lowercase (e.g. orderdate)</option>
                        <option value="trim">Trim Whitespace Only</option>
                      </select>
                    </div>

                    <Button 
                      size="sm" 
                      onClick={() => setPreviewConfig({
                        title: `Clean column headers (${headerStyle})`,
                        actionType: 'headers',
                        params: { style: headerStyle }
                      })}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 mt-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview Clean Headers
                    </Button>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* MAIN AREA: Live Data Preview & Cell Highlighting   */}
        {/* -------------------------------------------------- */}
        <div className="flex-1 flex flex-col bg-transparent">
          
          {/* Active Preview Action Banner */}
          {previewResult && (
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-md shrink-0 animate-in fade-in slide-in-from-top-2 duration-200 border-b border-blue-600/50">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </div>
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-extrabold leading-tight tracking-wide uppercase text-amber-300">Live Stage Preview Active</p>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-mono font-bold">Diff Mode</span>
                  </div>
                  <p className="text-sm font-bold mt-0.5 leading-snug">{previewResult.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setPreviewConfig(null)} 
                  className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/25 font-semibold cursor-pointer transition-all duration-150 active:scale-95 hover-elevate shadow-xs"
                >
                  Discard Changes
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleApplyPreview} 
                  className="h-8 px-4 text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-none font-bold cursor-pointer transition-all duration-150 active:scale-95 hover-elevate shadow-md rounded-md ring-2 ring-emerald-500/20"
                >
                  <Check className="w-4 h-4 mr-1.5 shrink-0" />
                  Accept & Apply
                </Button>
              </div>
            </div>
          )}

          {/* Active Issue Selection Banner */}
          {activeIssue && !previewResult && (
            <div className="bg-amber-500/10 dark:bg-amber-950/20 border-b border-amber-250/60 dark:border-amber-900/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-widest">Focused Quality Issue</span>
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded text-amber-700 dark:text-amber-300 font-mono capitalize">{activeIssue.riskLevel} severity</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{activeIssue.title}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">— {activeIssue.description}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedIssueId(null)} 
                  className="h-7.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Dismiss Focus
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => onApplyIssue(selectedDataset.id, activeIssue.id)} 
                  className="h-7.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-all hover-elevate shadow-3xs"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Approve Fix
                </Button>
              </div>
            </div>
          )}

          {/* Table Search & Pagination Toolbar */}
          <div className="px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search live preview records..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span>Rows/page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-800 dark:text-zinc-200"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <span>
                Showing {searchedRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} - {Math.min(currentPage * rowsPerPage, searchedRows.length)} of {searchedRows.length.toLocaleString()}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0 border-zinc-200 dark:border-zinc-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs px-1 font-mono">{currentPage} / {totalPages}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 w-7 p-0 border-zinc-200 dark:border-zinc-800"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Interactive Live Table */}
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-100/80 dark:bg-zinc-900/90 sticky top-0 z-10 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-3 py-2 w-12 font-mono text-[10px] text-zinc-400 border-r border-zinc-200/60 dark:border-zinc-800/60 text-center">#</th>
                  {displayDataset.headers.map(header => {
                    const colType = displayDataset.columnTypes[header] || 'text';
                    const isAffectedCol = previewResult?.affectedCol === header || activeIssue?.column === header;

                    return (
                      <th 
                        key={header}
                        className={cn(
                          "px-3 py-2 font-semibold border-r border-zinc-200/60 dark:border-zinc-800/60 whitespace-nowrap transition-colors",
                          isAffectedCol 
                            ? "bg-blue-100/60 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200" 
                            : "text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{header}</span>
                          <span className="flex items-center gap-1 text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 uppercase shrink-0">
                            {colType === 'numeric' && <Hash className="w-2.5 h-2.5 text-blue-500" />}
                            {colType === 'date' && <Calendar className="w-2.5 h-2.5 text-purple-500" />}
                            {colType === 'categorical' && <Tag className="w-2.5 h-2.5 text-amber-500" />}
                            {colType === 'text' && <Type className="w-2.5 h-2.5 text-emerald-500" />}
                            {colType}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/50 bg-white dark:bg-zinc-950 font-mono text-[11px]">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={displayDataset.headers.length + 1} className="py-12 text-center text-zinc-400 font-sans">
                      No records match your search filter.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;

                    return (
                      <tr 
                        key={idx}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="px-3 py-1.5 text-center text-zinc-400 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[10px]">
                          {globalIdx}
                        </td>
                        {displayDataset.headers.map(header => {
                          const val = row[header];
                          const isNull = val === null || val === undefined || String(val).trim() === '';
                          const isAffectedCol = previewResult?.affectedCol === header || activeIssue?.column === header;

                          return (
                            <td 
                              key={header}
                              className={cn(
                                "px-3 py-1.5 border-r border-zinc-200/60 dark:border-zinc-800/60 max-w-xs truncate",
                                isAffectedCol && "bg-blue-50/30 dark:bg-blue-950/20",
                                isNull && "bg-amber-50/40 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 font-sans italic"
                              )}
                            >
                              {isNull ? (
                                <span className="text-[10px] text-zinc-400 italic">[null]</span>
                              ) : typeof val === 'boolean' ? (
                                <span className={cn("px-1 rounded text-[10px] font-bold", val ? "text-emerald-600" : "text-red-500")}>
                                  {String(val)}
                                </span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Trail Drawer Toggle Footer */}
          <div className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 px-5 py-2 flex items-center justify-between shrink-0 text-xs">
            <button
              onClick={() => setIsAuditDrawerOpen(!isAuditDrawerOpen)}
              className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-semibold"
            >
              <History className="w-4 h-4 text-blue-500" />
              <span>Audit Trail ({logs.length} applied)</span>
              <span className="text-[10px] text-zinc-400 font-normal">
                {isAuditDrawerOpen ? '▲ Hide History' : '▼ Expand History'}
              </span>
            </button>

            {logs.length > 0 && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onUndoLog(selectedDataset.id, logs[logs.length - 1].id)}
                className="h-6 text-[11px] text-zinc-600 hover:text-zinc-900"
              >
                <Undo2 className="w-3 h-3 mr-1" />
                Undo Latest Step
              </Button>
            )}
          </div>

          {/* Audit Trail Expandable Drawer */}
          {isAuditDrawerOpen && (
            <div className="bg-zinc-950 text-zinc-100 border-t border-zinc-800 p-5 max-h-72 overflow-y-auto custom-scrollbar shrink-0 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-zinc-50">Dataset Operations Registry</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Chronological record of applied quality modifications</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => setShowResetModal(true)}
                  className="h-7 text-[10px] bg-red-650 hover:bg-red-600 font-bold tracking-tight shadow-3xs cursor-pointer border-none"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset to Original State
                </Button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-zinc-500 italic">No cleaning operations have been applied to this dataset yet.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l border-zinc-800 space-y-4 py-1.5">
                  {[...logs].reverse().map((log, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={log.id} className="relative group">
                        {/* Connected dot indicator */}
                        <div className={cn(
                          "absolute -left-[30px] top-1.5 w-3 h-3 rounded-full border-2 bg-zinc-950 flex items-center justify-center transition-all duration-200",
                          isLatest 
                            ? "border-blue-500 ring-4 ring-blue-500/15" 
                            : "border-zinc-700"
                        )}>
                          {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </div>

                        <div className="bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 p-3 rounded-xl flex items-center justify-between gap-4 transition-all duration-150">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-zinc-200">{log.operation}</span>
                              {log.column && (
                                <span className="text-[9px] bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.2 rounded text-zinc-400 font-mono">
                                  column: {log.column}
                                </span>
                              )}
                              {isLatest && (
                                <span className="text-[9px] bg-blue-900/45 text-blue-300 px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider">
                                  Latest Action
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-semibold flex-wrap">
                              <span>Modified: {log.rowsAffected.toLocaleString()} cells</span>
                              <span className="text-zinc-700">•</span>
                              <span>Timestamp: {new Date(log.timestamp).toLocaleTimeString()}</span>
                              {log.previousHealthScore !== undefined && log.newHealthScore !== undefined && (
                                <>
                                  <span className="text-zinc-700">•</span>
                                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    Quality Score: {log.previousHealthScore} → {log.newHealthScore}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onUndoLog(selectedDataset.id, log.id)}
                            className="h-6 px-2 text-[10px] bg-zinc-900 border-zinc-700/80 text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0 font-semibold cursor-pointer"
                          >
                            <Undo2 className="w-3 h-3 mr-1" />
                            Undo
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ================================================== */}
      {/* RESET CONFIRMATION MODAL                           */}
      {/* ================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Reset Dataset to Original?</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to revert <strong className="text-zinc-900 dark:text-zinc-100">{selectedDataset.name}</strong> back to its original raw snapshot?
              All applied cleaning operations and audit logs for this dataset will be cleared.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button size="sm" variant="outline" onClick={() => setShowResetModal(false)} className="text-xs h-8">
                Cancel
              </Button>
              <Button size="sm" onClick={handleResetConfirm} className="bg-red-600 hover:bg-red-700 text-white text-xs h-8">
                Yes, Reset Dataset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* DATA QUALITY AUDIT MODAL OVERLAY */}
      {showQualityAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
            <DataQualityPanel
              dataset={selectedDataset}
              onOpenFixModal={(actionType, col, vars) => {
                setShowQualityAudit(false);
                setActiveCleaningModal({ actionType, column: col, variations: vars });
              }}
              onOpenAICopilot={() => {
                setShowQualityAudit(false);
                setShowAICopilotModal(true);
              }}
              onNavigateView={(view) => {
                setShowQualityAudit(false);
                if (onNavigateView) onNavigateView(view);
              }}
              onClose={() => setShowQualityAudit(false)}
            />
          </div>
        </div>
      )}

      {/* AI DATA CLEANING COPILOT MODAL OVERLAY */}
      {showAICopilotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <AICleaningCopilotPanel
            dataset={selectedDataset}
            workingData={selectedDataset.data}
            workingHeaders={selectedDataset.headers}
            qualityReport={scanDatasetQuality(selectedDataset, selectedDataset.data)}
            onOpenFixModal={(actionType, col, vars) => {
              setShowAICopilotModal(false);
              setActiveCleaningModal({ actionType, column: col, variations: vars });
            }}
            onClose={() => setShowAICopilotModal(false)}
          />
        </div>
      )}

      {/* CLEANING PREVIEW MODAL */}
      {activeCleaningModal && (
        <CleaningPreviewModal
          initialAction={activeCleaningModal.actionType}
          initialColumn={activeCleaningModal.column}
          initialVariations={activeCleaningModal.variations}
          data={selectedDataset.data}
          headers={selectedDataset.headers}
          onClose={() => setActiveCleaningModal(null)}
          onApply={(result) => {
            if (onUpdateDataset && selectedDataset) {
              const updated = {
                ...selectedDataset,
                data: result.updatedData,
                headers: result.updatedHeaders,
                rowCount: result.updatedData.length,
              };
              onUpdateDataset(updated);
            }
            setActiveCleaningModal(null);
          }}
        />
      )}

    </div>
  );
}
