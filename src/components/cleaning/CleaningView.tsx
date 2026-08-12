import React, { useState } from 'react';
import { Dataset, CleaningIssue, CleaningLog } from '@/types';
import { Sparkles, Check, X, Undo2, FileText, AlertTriangle, ShieldCheck, Database, History, Wrench, Download, Filter, Type, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { removeNullsCustom, cleanHeadersCustom, castColumnTypeCustom, filterOutliersCustom } from '@/lib/dataCleaner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface CleaningViewProps {
  datasets: Dataset[];
  onApplyIssue: (datasetId: string, issueId: string) => void;
  onRejectIssue: (datasetId: string, issueId: string) => void;
  onUndoLog: (datasetId: string, logId: string) => void;
  onApproveAllSafe: (datasetId: string) => void;
  onUpdateDataset?: (updatedDataset: Dataset) => void;
}

export function CleaningView({ datasets, onApplyIssue, onRejectIssue, onUndoLog, onApproveAllSafe, onUpdateDataset }: CleaningViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(datasets[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'issues' | 'tools' | 'history'>('issues');
  
  // Custom tool states
  const [nullCol, setNullCol] = useState<string>('');
  const [nullStrategy, setNullStrategy] = useState<'drop' | 'zero' | 'mean' | 'text'>('drop');
  const [nullCustomText, setNullCustomText] = useState('Unknown');

  const [headerStyle, setHeaderStyle] = useState<'snake_case' | 'lowercase' | 'trim'>('snake_case');

  const [castCol, setCastCol] = useState<string>('');
  const [targetType, setTargetType] = useState<'numeric' | 'text' | 'date' | 'boolean'>('numeric');

  const [outlierCol, setOutlierCol] = useState<string>('');
  const [zThreshold, setZThreshold] = useState<number>(2.5);

  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No datasets found</h2>
          <p className="text-sm text-zinc-500">Import datasets to start cleaning.</p>
        </div>
      </div>
    );
  }

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  const issues = selectedDataset.issues || [];
  const logs = selectedDataset.cleaningLogs || [];
  
  const pendingIssues = issues.filter(i => i.status === 'pending');
  const safeIssues = pendingIssues.filter(i => i.riskLevel === 'low');

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

  const handleNullApply = () => {
    if (!nullCol || !onUpdateDataset) return;
    const updated = removeNullsCustom(selectedDataset, nullCol, nullStrategy, nullCustomText);
    onUpdateDataset(updated);
  };

  const handleHeadersApply = () => {
    if (!onUpdateDataset) return;
    const updated = cleanHeadersCustom(selectedDataset, headerStyle);
    onUpdateDataset(updated);
  };

  const handleCastApply = () => {
    if (!castCol || !onUpdateDataset) return;
    const updated = castColumnTypeCustom(selectedDataset, castCol, targetType);
    onUpdateDataset(updated);
  };

  const handleOutlierApply = () => {
    if (!outlierCol || !onUpdateDataset) return;
    const updated = filterOutliersCustom(selectedDataset, outlierCol, zThreshold);
    onUpdateDataset(updated);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar for Datasets */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-y-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-xs text-zinc-500 uppercase tracking-wider">Data Sources</h3>
        </div>
        <div className="p-2 space-y-1">
          {datasets.map(dataset => {
            const datasetIssues = dataset.issues || [];
            const pending = datasetIssues.filter(i => i.status === 'pending').length;
            const isSelected = dataset.id === selectedDatasetId;
            
            return (
              <button
                key={dataset.id}
                onClick={() => { setSelectedDatasetId(dataset.id); setActiveTab('issues'); }}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-all text-left",
                  isSelected 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <Database className="w-4 h-4 shrink-0 text-blue-500" />
                  <span className="truncate">{dataset.name}</span>
                </div>
                {pending > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0",
                    isSelected ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                  )}>
                    {pending}
                  </span>
                )}
                {pending === 0 && dataset.cleaningStatus === 'cleaned' && (
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-zinc-50/50 dark:bg-[#08080a] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Data Cleaning Engine: {selectedDataset.name}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Interactive quality audit, header formatting, data type casting, and outlier filtering.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab('issues')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                  activeTab === 'issues' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                Audit Issues ({pendingIssues.length})
              </button>
              <button
                onClick={() => setActiveTab('tools')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                  activeTab === 'tools' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                Interactive Tools
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                  activeTab === 'history' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <History className="w-3.5 h-3.5" />
                Audit Trail ({logs.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs" onClick={exportCSV}>
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CSV
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={exportExcel}>
                <Download className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {activeTab === 'issues' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Batch Actions */}
              {pendingIssues.length > 0 && (
                <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Safe Operations</h3>
                    <p className="text-xs text-zinc-500">There are {safeIssues.length} low-risk operations available.</p>
                  </div>
                  <Button 
                    onClick={() => onApproveAllSafe(selectedDataset.id)}
                    disabled={safeIssues.length === 0}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    Approve All Safe Changes
                  </Button>
                </div>
              )}
              
              {pendingIssues.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Dataset looks clean</h3>
                  <p className="text-zinc-500 text-sm mt-1">No pending issues detected for {selectedDataset.name}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingIssues.map(issue => (
                    <div key={issue.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {issue.riskLevel === 'high' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {issue.riskLevel === 'medium' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                            {issue.riskLevel === 'low' && <Sparkles className="w-4 h-4 text-blue-500" />}
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{issue.title}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              issue.riskLevel === 'high' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                              issue.riskLevel === 'medium' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                              {issue.riskLevel} risk
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">{issue.description}</p>
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-2">
                            Recommendation: {issue.suggestedAction}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{issue.affectedRowCount.toLocaleString()}</span>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Rows affected</p>
                        </div>
                      </div>
                      
                      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-xs text-zinc-600 hover:text-zinc-900" onClick={() => onRejectIssue(selectedDataset.id, issue.id)}>
                          <X className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => onApplyIssue(selectedDataset.id, issue.id)}>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'tools' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Tool 1: Remove Null Values */}
              <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <Filter className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">1. Remove / Fill Null Values</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Target Column</label>
                    <select 
                      value={nullCol} 
                      onChange={(e) => setNullCol(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select Column...</option>
                      {selectedDataset.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Handling Strategy</label>
                    <select 
                      value={nullStrategy} 
                      onChange={(e) => setNullStrategy(e.target.value as any)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="drop">Drop Rows with Nulls</option>
                      <option value="zero">Fill with 0</option>
                      <option value="mean">Fill with Column Mean</option>
                      <option value="text">Fill with Custom Text</option>
                    </select>
                  </div>
                  {nullStrategy === 'text' && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-500 block mb-1">Custom Fill Text</label>
                      <input 
                        type="text" 
                        value={nullCustomText} 
                        onChange={(e) => setNullCustomText(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100" 
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={handleNullApply} disabled={!nullCol}>
                    Apply Null Cleaning
                  </Button>
                </div>
              </div>

              {/* Tool 2: Clean Headers */}
              <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <Type className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">2. Format Column Headers</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Naming Style</label>
                    <select 
                      value={headerStyle} 
                      onChange={(e) => setHeaderStyle(e.target.value as any)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="snake_case">snake_case (e.g. total_sales_amount)</option>
                      <option value="lowercase">lowercase (e.g. totalsalesamount)</option>
                      <option value="trim">Trim Whitespace Only</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={handleHeadersApply}>
                      Standardize All Headers
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tool 3: Change Column Data Types */}
              <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <RefreshCw className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">3. Change Column Data Types</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Column</label>
                    <select 
                      value={castCol} 
                      onChange={(e) => setCastCol(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select Column...</option>
                      {selectedDataset.headers.map(h => <option key={h} value={h}>{h} ({selectedDataset.columnTypes[h] || 'text'})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Target Type</label>
                    <select 
                      value={targetType} 
                      onChange={(e) => setTargetType(e.target.value as any)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="numeric">Numeric (Integer/Float)</option>
                      <option value="text">Text (String)</option>
                      <option value="date">Date (ISO standard)</option>
                      <option value="boolean">Boolean (True/False)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={handleCastApply} disabled={!castCol}>
                    Cast Column Type
                  </Button>
                </div>
              </div>

              {/* Tool 4: Outlier Filtering */}
              <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <AlertTriangle className="w-4 h-4 text-purple-500" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">4. Filter Statistical Outliers</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Numeric Column</label>
                    <select 
                      value={outlierCol} 
                      onChange={(e) => setOutlierCol(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select Numeric Column...</option>
                      {selectedDataset.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 block mb-1">Z-Score Threshold (Std Dev)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={zThreshold} 
                      onChange={(e) => setZThreshold(Number(e.target.value))}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={handleOutlierApply} disabled={!outlierCol}>
                    Trim Outlier Rows
                  </Button>
                </div>
              </div>

            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No changes applied yet</h3>
                  <p className="text-zinc-500 text-sm mt-1">Applied cleaning operations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-xs text-zinc-500 font-medium">{logs.length} operations applied</p>
                    <Button variant="destructive" size="sm" className="text-xs" onClick={() => onUndoLog(selectedDataset.id, 'RESTORE_ALL')}>
                      Restore Original Dataset
                    </Button>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {[...logs].reverse().map(log => (
                        <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors">
                          <div>
                            <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{log.operation}</h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              Affected {log.rowsAffected.toLocaleString()} rows • {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => onUndoLog(selectedDataset.id, log.id)}>
                            <Undo2 className="w-3.5 h-3.5 mr-1" />
                            Undo
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
