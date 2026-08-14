import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, Search, Filter, 
  Layers, ArrowRight, Eye, RefreshCw, X, ChevronRight, HelpCircle, FileText, Sparkles, Wrench
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Dataset, ViewState } from '@/types';
import { 
  scanDatasetQuality, 
  DatasetQualityReport, 
  QualityIssue, 
  IssueCategory 
} from '@/lib/qualityScanner';
import { CleaningActionType } from '@/lib/manualCleaningEngine';

interface DataQualityPanelProps {
  dataset: Dataset;
  workingData?: Record<string, any>[];
  onNavigateView?: (view: ViewState) => void;
  onSelectColumnForInspection?: (header: string) => void;
  onOpenFixModal?: (actionType: CleaningActionType, column?: string, variations?: string[]) => void;
  onClose?: () => void;
  embedded?: boolean;
}

const CATEGORIES: IssueCategory[] = [
  'Missing Data',
  'Duplicates',
  'Formatting',
  'Type Problems',
  'Date Problems',
  'Inconsistent Values',
  'Suspicious Values',
];

export function DataQualityPanel({
  dataset,
  workingData,
  onNavigateView,
  onSelectColumnForInspection,
  onOpenFixModal,
  onClose,
  embedded = false,
}: DataQualityPanelProps) {
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<IssueCategory | 'All'>('All');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'critical' | 'warning' | 'info'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Memoized Quality Scan Result
  const report: DatasetQualityReport = useMemo(() => {
    return scanDatasetQuality(dataset, workingData);
  }, [dataset, workingData]);

  // 2. Filtered Issues List
  const filteredIssues = useMemo(() => {
    return report.allIssues.filter(issue => {
      // Column Filter
      if (selectedColumnFilter && issue.column !== selectedColumnFilter) {
        return false;
      }
      // Category Filter
      if (selectedCategoryFilter !== 'All' && issue.category !== selectedCategoryFilter) {
        return false;
      }
      // Severity Filter
      if (severityFilter !== 'All' && issue.severity !== severityFilter) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchWrong = issue.whatIsWrong.toLowerCase().includes(q);
        const matchCol = issue.column?.toLowerCase().includes(q);
        const matchValues = issue.affectedValues.some(v => v.toLowerCase().includes(q));
        if (!matchTitle && !matchWrong && !matchCol && !matchValues) {
          return false;
        }
      }
      return true;
    });
  }, [report, selectedColumnFilter, selectedCategoryFilter, severityFilter, searchQuery]);

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400 border-amber-200 bg-amber-50 dark:bg-amber-950/40';
    return 'text-red-600 dark:text-red-400 border-red-200 bg-red-50 dark:bg-red-950/40';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          Healthy ({score}/100)
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          Needs Attention ({score}/100)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
        Critical Issues ({score}/100)
      </span>
    );
  };

  return (
    <div className={cn(
      "flex flex-col space-y-6 text-xs text-zinc-900 dark:text-zinc-100",
      embedded ? "" : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl"
    )}>
      
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl border font-bold", getScoreColor(report.overallScore))}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50">
                Data Quality Scanner
              </h2>
              {getScoreBadge(report.overallScore)}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Automatic deterministic data audit. Read-only health analysis for <span className="font-bold text-zinc-800 dark:text-zinc-200">{dataset.name}</span>.
            </p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Dataset-Level Quality Summary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-center">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Quality Score</span>
          <span className={cn("text-xl font-black mt-1 block font-mono", report.overallScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : report.overallScore >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
            {report.overallScore}/100
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-center">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Rows</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block font-mono">
            {report.totalRows.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-center">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Columns</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block font-mono">
            {report.totalColumns}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-center">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Issues</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block font-mono">
            {report.totalIssues}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-red-200/80 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 text-center">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">Critical Issues</span>
          <span className="text-xl font-extrabold text-red-700 dark:text-red-300 mt-1 block font-mono">
            {report.criticalIssuesCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-center">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Warning Issues</span>
          <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-1 block font-mono">
            {report.warningIssuesCount}
          </span>
        </div>
      </div>

      {/* 3. Column-Level Quality Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            Column-Level Quality Profile
          </h3>
          {selectedColumnFilter && (
            <button
              onClick={() => setSelectedColumnFilter(null)}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Show All Columns
            </button>
          )}
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden overflow-x-auto bg-white dark:bg-zinc-950">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100/70 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Column Header</th>
                <th className="py-2.5 px-3">Quality Score</th>
                <th className="py-2.5 px-3">Missing %</th>
                <th className="py-2.5 px-3 text-right">Unique Count</th>
                <th className="py-2.5 px-3">Detected Type</th>
                <th className="py-2.5 px-3 text-right">Issues</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono">
              {Object.values(report.columnProfiles).map((col) => {
                const isSelected = selectedColumnFilter === col.header;
                return (
                  <tr
                    key={col.header}
                    onClick={() => {
                      setSelectedColumnFilter(isSelected ? null : col.header);
                      if (onSelectColumnForInspection) onSelectColumnForInspection(col.header);
                    }}
                    className={cn(
                      "hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer",
                      isSelected ? "bg-blue-50/70 dark:bg-blue-950/40" : ""
                    )}
                  >
                    <td className="py-2 px-3 font-sans font-bold text-zinc-900 dark:text-zinc-100">
                      {col.header}
                    </td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded font-extrabold text-[11px]",
                        col.qualityScore >= 85 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : col.qualityScore >= 60 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      )}>
                        {col.qualityScore}/100
                      </span>
                    </td>
                    <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">
                      {col.missingPercentage}%
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-zinc-800 dark:text-zinc-200">
                      {col.uniqueCount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-sans text-zinc-600 dark:text-zinc-400 capitalize">
                      {col.detectedType}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {col.issueCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 text-amber-300 font-bold">
                          {col.issueCount}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[11px]">Clean</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedColumnFilter(isSelected ? null : col.header);
                          if (onSelectColumnForInspection) onSelectColumnForInspection(col.header);
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isSelected ? 'Selected' : 'Inspect Issues'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Categorized Issues Panel */}
      <div className="space-y-4 pt-2">
        
        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
            <button
              onClick={() => setSelectedCategoryFilter('All')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategoryFilter === 'All'
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              All Categories ({report.totalIssues})
            </button>
            {CATEGORIES.map(cat => {
              const count = report.issuesByCategory[cat].length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                    selectedCategoryFilter === cat
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <span>{cat}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search detected issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Issues List Cards */}
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">No Issues Found</h4>
            <p className="text-xs text-zinc-500">
              {selectedColumnFilter
                ? `No quality issues detected for column "${selectedColumnFilter}".`
                : 'Selected category filters returned 0 matching quality warnings.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  "p-4 rounded-xl border transition-all space-y-3 bg-white dark:bg-zinc-950 shadow-xs",
                  issue.severity === 'critical'
                    ? "border-red-200 dark:border-red-900/50 hover:border-red-300 dark:hover:border-red-800"
                    : issue.severity === 'warning'
                    ? "border-amber-200 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {/* Issue Headline */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0 mt-0.5",
                      issue.severity === 'critical'
                        ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                        : issue.severity === 'warning'
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                        : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                    )}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {issue.title}
                        </h4>
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {issue.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                        <strong className="text-zinc-800 dark:text-zinc-200">What is wrong?</strong> {issue.whatIsWrong}
                      </p>
                    </div>
                  </div>

                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0",
                    issue.severity === 'critical' ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : issue.severity === 'warning' ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  )}>
                    {issue.severity}
                  </span>
                </div>

                {/* Issue Details: Where is it & Affected Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                  <div>
                    <span className="font-bold text-zinc-500 text-[10px] uppercase block">Where is it?</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{issue.whereIsIt}</span>
                  </div>
                  <div>
                    <span className="font-bold text-zinc-500 text-[10px] uppercase block">Affected Records</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{issue.affectedRowsCount} value{issue.affectedRowsCount === 1 ? '' : 's'} affected</span>
                  </div>
                </div>

                {/* Sample Affected Values */}
                {issue.affectedValues && issue.affectedValues.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Sample Affected Values:
                    </span>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                      {issue.affectedValues.map((val, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60">
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Action & Non-Executing Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span><strong>Suggested action:</strong> {issue.suggestedAction}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Direct Fix Action Button if fixable */}
                    {onOpenFixModal && (
                      (() => {
                        let fixAction: CleaningActionType | null = null;
                        let btnLabel = "Fix Issue";

                        if (issue.title.toLowerCase().includes('whitespace')) {
                          fixAction = 'trim_whitespace';
                          btnLabel = 'Trim Spaces';
                        } else if (issue.category === 'Duplicates' || issue.title.toLowerCase().includes('duplicate')) {
                          fixAction = 'remove_duplicates';
                          btnLabel = 'Remove Duplicates';
                        } else if (issue.category === 'Missing Data') {
                          fixAction = 'fill_missing';
                          btnLabel = 'Fill Missing';
                        } else if (issue.title.toLowerCase().includes('similar') || issue.title.toLowerCase().includes('casing') || issue.category === 'Inconsistent Values') {
                          fixAction = 'merge_categorical';
                          btnLabel = 'Review & Merge';
                        } else if (issue.title.toLowerCase().includes('empty rows')) {
                          fixAction = 'remove_empty_rows';
                          btnLabel = 'Remove Empty Rows';
                        } else if (issue.category === 'Formatting') {
                          fixAction = 'text_capitalization';
                          btnLabel = 'Standardize Case';
                        } else if (issue.title.toLowerCase().includes('constant')) {
                          fixAction = 'delete_columns';
                          btnLabel = 'Delete Column';
                        }

                        if (!fixAction) return null;

                        return (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onOpenFixModal(fixAction!, issue.column, issue.affectedValues)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs gap-1"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>{btnLabel}</span>
                          </Button>
                        );
                      })()
                    )}

                    {onNavigateView && !onOpenFixModal && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateView('cleaning')}
                        className="text-xs font-bold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                      >
                        Fix in next step →
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (issue.column) {
                          setSelectedColumnFilter(issue.column);
                          if (onSelectColumnForInspection) onSelectColumnForInspection(issue.column);
                        }
                      }}
                      className="text-xs font-bold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                    >
                      Review
                    </Button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
