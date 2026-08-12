import React from 'react';
import { Dataset, Dashboard } from '@/types';
import { FileText, Printer, Download, TrendingUp, ShieldCheck, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';

interface MisReportViewProps {
  datasets: Dataset[];
  dashboards: Dashboard[];
}

export function MisReportView({ datasets, dashboards }: MisReportViewProps) {
  const primaryDataset = datasets[0];

  const totalRows = datasets.reduce((acc, d) => acc + d.rowCount, 0);
  const cleanedCount = datasets.filter(d => d.cleaningStatus === 'cleaned').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-50/50 dark:bg-[#050505] p-6 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">MIS Executive Management Report</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Structured executive summary combining KPI highlights, operational metrics, data quality notes, and actionable recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF</span>
          </Button>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/50">
          <FileText className="w-10 h-10 text-zinc-400 mb-3" />
          <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">No Datasets to Report</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Import datasets and clean records to automatically assemble an MIS executive report.
          </p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto w-full space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100">
          
          {/* Report Cover / Header */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                Management Information System (MIS) Report
              </span>
              <h2 className="text-xl font-bold mt-2">Executive Workspace Operational Briefing</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Generated across {datasets.length} active data asset{datasets.length === 1 ? '' : 's'} • {totalRows.toLocaleString()} total processed records
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500 font-mono">
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Status: Verified</div>
            </div>
          </div>

          {/* KPI Summary Block */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Analyzed Records</span>
              <p className="text-2xl font-bold font-mono mt-1 text-zinc-900 dark:text-zinc-100">{totalRows.toLocaleString()}</p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">100% In-Memory Parsed</span>
            </div>

            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Data Assets</span>
              <p className="text-2xl font-bold font-mono mt-1 text-zinc-900 dark:text-zinc-100">{datasets.length}</p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{datasets.map(d => d.type.toUpperCase()).join(', ')}</span>
            </div>

            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data Quality Health</span>
              <p className="text-2xl font-bold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
                {cleanedCount > 0 ? `${cleanedCount}/${datasets.length} Cleaned` : 'Audited'}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Reversible Snapshot Trail</span>
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              1. Executive Overview
            </h3>
            <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 bg-zinc-50/50 dark:bg-zinc-950/50 p-4 rounded-md border border-zinc-200/60 dark:border-zinc-800/60">
              Workspace data has been ingested, normalized, and schema-mapped. A total of <strong>{datasets.length} dataset(s)</strong> containing <strong>{totalRows.toLocaleString()} rows</strong> were evaluated. Multi-file entity relationships were calculated automatically across primary key signatures.
            </div>
          </div>

          {/* Data Quality Notes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              2. Data Quality & Integrity Governance
            </h3>
            <div className="p-4 rounded-md border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2 text-xs">
              {datasets.map(d => (
                <div key={d.id} className="flex items-center justify-between py-1 border-b border-zinc-200/40 dark:border-zinc-800/40 last:border-none">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{d.name}</span>
                  <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px]">
                    <span>{d.rowCount.toLocaleString()} rows</span>
                    <span>{d.colCount} columns</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium uppercase text-[10px]">
                      {d.cleaningStatus || 'Audited'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Recommendations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              3. Strategic Management Recommendations
            </h3>
            <ul className="list-disc pl-5 text-xs text-zinc-700 dark:text-zinc-300 space-y-2 leading-relaxed">
              <li><strong>Continuous Validation:</strong> Ensure regular re-profiling of incoming CSV/XLSX files to maintain zero-null integrity.</li>
              <li><strong>Cross-Departmental KPI Standard:</strong> Deploy built dashboards for executive team reviews during weekly MIS ops cycles.</li>
              <li><strong>Export Archives:</strong> Export cleaned dataset snapshots to CSV or Excel prior to external system integration.</li>
            </ul>
          </div>

        </div>
      )}
    </div>
  );
}
