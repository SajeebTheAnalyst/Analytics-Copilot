import React, { useMemo } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, 
  ArrowRight, Wrench, RefreshCw, X, Layers, FileText, Sparkles, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Dataset, ViewState } from '@/types';
import { CleaningActionType } from '@/lib/manualCleaningEngine';
import { 
  evaluateDataReadiness, 
  ReadinessEvaluation, 
  ValidatedDatasetSnapshot 
} from '@/lib/dataReadinessEngine';

interface DataReadinessPanelProps {
  dataset: Dataset;
  workingData?: Record<string, any>[];
  workingHeaders?: string[];
  workingFormulas?: Record<string, string>;
  onOpenFixModal: (actionType: CleaningActionType, column?: string, variations?: string[]) => void;
  onOpenAICopilot?: () => void;
  onProceedToReporting?: (snapshot: ValidatedDatasetSnapshot) => void;
  onNavigateView?: (view: ViewState) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function DataReadinessPanel({
  dataset,
  workingData,
  workingHeaders,
  workingFormulas,
  onOpenFixModal,
  onOpenAICopilot,
  onProceedToReporting,
  onNavigateView,
  onClose,
  embedded = false,
}: DataReadinessPanelProps) {

  // Re-evaluate readiness dynamically whenever working data/formulas change
  const evaluation: ReadinessEvaluation = useMemo(() => {
    return evaluateDataReadiness(dataset, workingData, workingHeaders, workingFormulas);
  }, [dataset, workingData, workingHeaders, workingFormulas]);

  const {
    status,
    qualityScore,
    totalRows,
    totalColumns,
    criticalIssuesCount,
    warningIssuesCount,
    infoIssuesCount,
    blockingReasons,
    summaryMessage,
    snapshot,
  } = evaluation;

  const handleContinue = () => {
    if (status !== 'READY') return;
    
    // Create snapshot if not generated
    const activeSnapshot = snapshot || {
      datasetId: dataset.id,
      datasetName: dataset.name || 'Validated Dataset',
      headers: workingHeaders || dataset.headers,
      data: workingData || dataset.data,
      columnTypes: dataset.columnTypes || {},
      formulaDefinitions: workingFormulas || dataset.formulas || {},
      validationTimestamp: new Date(),
      qualityScore,
      readinessStatus: status,
    };

    if (onProceedToReporting) {
      onProceedToReporting(activeSnapshot);
    } else if (onNavigateView) {
      onNavigateView('mis-report');
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-xs text-zinc-900 dark:text-zinc-100",
      embedded ? "h-full w-full" : "max-w-4xl w-full max-h-[88vh]"
    )}>
      
      {/* 1. Header Bar */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl shadow-md flex items-center justify-center text-white",
            status === 'READY' ? "bg-emerald-600" :
            status === 'NEEDS_CLEANING' ? "bg-amber-600" :
            "bg-red-600"
          )}>
            {status === 'READY' ? <ShieldCheck className="w-5 h-5" /> :
             status === 'NEEDS_CLEANING' ? <AlertTriangle className="w-5 h-5" /> :
             <ShieldAlert className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white">
                Data Readiness Gate & Validation
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/20">
                Phase 8L Deterministic Gate
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Validating quality score, formula constraints, and critical defects for dataset: <strong className="text-white">{dataset.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAICopilot && (
            <Button
              type="button"
              size="sm"
              onClick={onOpenAICopilot}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Copilot</span>
            </Button>
          )}

          {!embedded && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Readiness Status & KPI Banner */}
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-4">
        
        {/* Status Callout Banner */}
        <div className={cn(
          "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs",
          status === 'READY'
            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
            : status === 'NEEDS_CLEANING'
            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100"
            : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
        )}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider font-mono shadow-xs",
                status === 'READY' ? "bg-emerald-600 text-white" :
                status === 'NEEDS_CLEANING' ? "bg-amber-600 text-white" :
                "bg-red-600 text-white"
              )}>
                {status === 'READY' ? 'READY FOR REPORTING' :
                 status === 'NEEDS_CLEANING' ? 'CLEANING RECOMMENDED' :
                 'DATASET BLOCKED'}
              </span>

              <span className="text-xs font-extrabold">
                {status === 'READY' ? 'All Quality Checks Passed' :
                 status === 'NEEDS_CLEANING' ? 'Minor Cleaning Suggested' :
                 'Critical Quality Blockers Detected'}
              </span>
            </div>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium pt-1">
              {summaryMessage}
            </p>
          </div>

          {/* Continue Button */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <Button
              type="button"
              disabled={status !== 'READY'}
              onClick={handleContinue}
              className={cn(
                "h-10 px-5 text-xs font-black rounded-xl shadow-md gap-2 transition-all cursor-pointer",
                status === 'READY'
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-75"
              )}
            >
              <span>Continue to Reporting</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            {status !== 'READY' && (
              <span className="text-[10px] text-zinc-500 font-medium">
                Disabled until blocking issues are resolved
              </span>
            )}
          </div>
        </div>

        {/* 4 Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
              Quality Score
            </div>
            <div className={cn(
              "text-lg font-mono font-black",
              qualityScore >= 85 ? "text-emerald-600 dark:text-emerald-400" :
              qualityScore >= 70 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {qualityScore} / 100
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
              Dataset Dimensions
            </div>
            <div className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {totalRows.toLocaleString()} <span className="text-xs text-zinc-400">rows</span> × {totalColumns} <span className="text-xs text-zinc-400">cols</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
              Critical Issues
            </div>
            <div className={cn(
              "text-lg font-mono font-black",
              criticalIssuesCount > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {criticalIssuesCount}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
              Warnings
            </div>
            <div className={cn(
              "text-lg font-mono font-black",
              warningIssuesCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {warningIssuesCount}
            </div>
          </div>

        </div>

      </div>

      {/* 3. Issue List Section */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
              Validation Issue Breakdown
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
              {blockingReasons.length} Total
            </span>
          </div>

          <p className="text-[11px] text-zinc-500">
            Click "Review Issue" to inspect & apply deterministic Phase 8J cleaning actions
          </p>
        </div>

        {blockingReasons.length === 0 ? (
          <div className="p-8 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              Zero Quality Issues Detected!
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-md mx-auto">
              Your dataset passed all deterministic quality checks. You can proceed directly to MIS Report or Dashboard creation!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockingReasons.map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  "p-4 rounded-xl border transition-all space-y-2.5",
                  issue.severity === 'critical'
                    ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60"
                    : issue.severity === 'warning'
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
                    : "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded shadow-2xs",
                        issue.severity === 'critical' ? "bg-red-600 text-white" :
                        issue.severity === 'warning' ? "bg-amber-600 text-white" :
                        "bg-blue-600 text-white"
                      )}>
                        {issue.severity}
                      </span>

                      <span className="text-[11px] font-bold text-zinc-500 font-mono">
                        {issue.category}
                      </span>

                      {issue.column && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          Column: {issue.column}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      {issue.title}
                    </h4>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {issue.description}
                    </p>
                  </div>

                  {/* Review Issue Button */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (issue.actionType) {
                        onOpenFixModal(issue.actionType, issue.column, issue.sampleValues);
                      } else {
                        onOpenFixModal('trim_whitespace', issue.column, issue.sampleValues);
                      }
                    }}
                    className="h-8 text-xs bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold cursor-pointer shrink-0 gap-1.5 shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Review Issue</span>
                  </Button>
                </div>

                {/* Sample Values or Stats */}
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                  <div>
                    {issue.affectedRowsCount > 0 && (
                      <span><strong>{issue.affectedRowsCount}</strong> rows affected</span>
                    )}
                    {issue.sampleValues && issue.sampleValues.length > 0 && (
                      <span className="ml-3 font-mono">
                        Samples: {issue.sampleValues.slice(0, 4).join(', ')}
                      </span>
                    )}
                  </div>

                  <span className="italic font-medium text-zinc-400">
                    Suggested Fix: {issue.suggestedAction}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Footer Bar */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="text-[11px] text-zinc-500 font-medium">
          Original dataset source remains untouchable and recoverable.
        </div>

        <div className="flex items-center gap-2">
          {!embedded && onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold cursor-pointer"
            >
              Close
            </Button>
          )}

          <Button
            type="button"
            disabled={status !== 'READY'}
            onClick={handleContinue}
            className={cn(
              "h-9 px-5 text-xs font-black rounded-xl shadow-md gap-1.5 cursor-pointer",
              status === 'READY'
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-75"
            )}
          >
            <span>Continue to Reporting</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

    </div>
  );
}
