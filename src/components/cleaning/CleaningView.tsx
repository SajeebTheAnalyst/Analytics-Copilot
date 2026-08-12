import React, { useState } from 'react';
import { Dataset, CleaningIssue, CleaningLog } from '@/types';
import { Sparkles, Check, X, Undo2, FileText, AlertTriangle, ShieldCheck, Database, History } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface CleaningViewProps {
  datasets: Dataset[];
  onApplyIssue: (datasetId: string, issueId: string) => void;
  onRejectIssue: (datasetId: string, issueId: string) => void;
  onUndoLog: (datasetId: string, logId: string) => void;
  onApproveAllSafe: (datasetId: string) => void;
}

export function CleaningView({ datasets, onApplyIssue, onRejectIssue, onUndoLog, onApproveAllSafe }: CleaningViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(datasets[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'issues' | 'history'>('issues');
  
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

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar for Datasets */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-y-auto">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Data Sources</h3>
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
                  "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all text-left",
                  isSelected 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <Database className="w-4 h-4 shrink-0" />
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
      <div className="flex-1 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Data Cleaning: {selectedDataset.name}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Review and apply AI-suggested cleaning operations.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('issues')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                activeTab === 'issues' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              Review Issues ({pendingIssues.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5",
                activeTab === 'history' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <History className="w-4 h-4" />
              Change Log
            </button>
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
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Safe Operations</h3>
                    <p className="text-sm text-zinc-500">There are {safeIssues.length} low-risk operations available.</p>
                  </div>
                  <Button 
                    onClick={() => onApproveAllSafe(selectedDataset.id)}
                    disabled={safeIssues.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Approve All Safe Changes
                  </Button>
                </div>
              )}
              
              {pendingIssues.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Dataset looks clean</h3>
                  <p className="text-zinc-500 mt-1">No pending issues detected for {selectedDataset.name}.</p>
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
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{issue.title}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              issue.riskLevel === 'high' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                              issue.riskLevel === 'medium' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                              {issue.riskLevel} risk
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{issue.description}</p>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-2">
                            Suggestion: {issue.suggestedAction}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{issue.affectedRowCount.toLocaleString()}</span>
                          <p className="text-xs text-zinc-500 uppercase tracking-widest">Rows affected</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/20 grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Before</p>
                          <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
                            {issue.sampleBefore.map((s, i) => (
                              <div key={i} className="text-sm font-mono text-red-800 dark:text-red-300 truncate">{s}</div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">After</p>
                          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-3">
                            {issue.sampleAfter.map((s, i) => (
                              <div key={i} className="text-sm font-mono text-emerald-800 dark:text-emerald-300 truncate">{s}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 flex justify-end gap-2">
                        <Button variant="outline" className="text-zinc-600 hover:text-zinc-900" onClick={() => onRejectIssue(selectedDataset.id, issue.id)}>
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onApplyIssue(selectedDataset.id, issue.id)}>
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No changes applied yet</h3>
                  <p className="text-zinc-500 mt-1">Applied cleaning operations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-sm text-zinc-500 font-medium">{logs.length} operations applied</p>
                    <Button variant="destructive" size="sm" onClick={() => onUndoLog(selectedDataset.id, 'RESTORE_ALL')}>
                      Restore Original Dataset
                    </Button>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {/* Reverse logs to show newest first */}
                      {[...logs].reverse().map(log => (
                        <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/20 transition-colors">
                          <div>
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{log.operation}</h4>
                            <p className="text-sm text-zinc-500 mt-0.5">
                              Affected {log.rowsAffected.toLocaleString()} rows • {new Date(log.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => onUndoLog(selectedDataset.id, log.id)}>
                            <Undo2 className="w-4 h-4 mr-2" />
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
