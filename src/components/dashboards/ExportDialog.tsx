import React, { useState } from 'react';
import { 
  FileDown, 
  Image as ImageIcon, 
  FileText, 
  Printer, 
  Check, 
  X, 
  Loader2, 
  Sparkles, 
  Sliders, 
  Layers, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dashboard, DashboardExportOptions, DashboardExportFormat, DashboardSavedView, Dataset } from '@/types';
import { 
  exportDashboardAsPng, 
  exportDashboardAsPdf, 
  printDashboard, 
  generateExportFilename,
  DashboardExportMetadata 
} from '@/lib/dashboardExport';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dashboard: Dashboard;
  activeSavedView: DashboardSavedView | null;
  targetElement: HTMLElement | null;
  filterSummary: string[];
  drillSummary: string[];
  kpiSummary?: Array<{ title: string; value: string | number; change?: string; trend?: 'up' | 'down' | 'neutral' }>;
}

export function ExportDialog({
  isOpen,
  onClose,
  dashboard,
  activeSavedView,
  targetElement,
  filterSummary,
  drillSummary,
  kpiSummary
}: ExportDialogProps) {
  const [format, setFormat] = useState<DashboardExportFormat>('pdf');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'a3'>('a4');
  const [scale, setScale] = useState<number>(2);
  const [theme, setTheme] = useState<'current' | 'light' | 'dark'>('current');
  const [includeFilterContext, setIncludeFilterContext] = useState<boolean>(true);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [includeKpiSummary, setIncludeKpiSummary] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>(dashboard.title);
  const [customSubtitle, setCustomSubtitle] = useState<string>(dashboard.subtitle || '');
  
  // Generation state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentThemeActual = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const effectiveTheme = theme === 'current' ? currentThemeActual : theme;

  const metadata: DashboardExportMetadata = {
    title: customTitle || dashboard.title,
    subtitle: customSubtitle || dashboard.subtitle,
    savedViewName: activeSavedView?.name,
    filterSummary,
    drillSummary,
    kpiSummary,
    generatedAt: Date.now()
  };

  const handleExport = async () => {
    if (!targetElement) {
      setExportError('Dashboard canvas not found for export.');
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setIsSuccess(false);

    const options: DashboardExportOptions = {
      format,
      orientation,
      pageSize,
      scale,
      theme: effectiveTheme,
      includeFilterContext,
      includeMetadata,
      includeKpiSummary,
      customTitle,
      customSubtitle
    };

    try {
      if (format === 'png') {
        await exportDashboardAsPng(targetElement, options, metadata, (status) => {
          setProgressStatus(status);
        });
      } else if (format === 'pdf') {
        await exportDashboardAsPdf(targetElement, options, metadata, (status) => {
          setProgressStatus(status);
        });
      } else if (format === 'print') {
        printDashboard();
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Export failed:', err);
      setExportError(err?.message || 'Failed to export dashboard. Please check console.');
    } finally {
      setIsExporting(false);
      setProgressStatus('');
    }
  };

  const previewFilename = generateExportFilename(
    customTitle || dashboard.title,
    activeSavedView?.name,
    format === 'pdf' ? 'pdf' : 'png'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Export & Print Dashboard</h2>
              <p className="text-xs text-zinc-500">Generate high-fidelity reports from current analytical state</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 text-xs">
          {/* Format Selector Tabs */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 block">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                  format === 'pdf'
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold shadow-xs ring-1 ring-blue-500/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                )}
              >
                <FileText className="w-5 h-5 mb-1 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">PDF Document</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Executive Report</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('png')}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                  format === 'png'
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold shadow-xs ring-1 ring-blue-500/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                )}
              >
                <ImageIcon className="w-5 h-5 mb-1 text-emerald-600 dark:text-emerald-400" />
                <span className="font-medium">PNG Image</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Crisp High-Res (2x)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('print')}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all",
                  format === 'print'
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold shadow-xs ring-1 ring-blue-500/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                )}
              >
                <Printer className="w-5 h-5 mb-1 text-purple-600 dark:text-purple-400" />
                <span className="font-medium">Direct Print</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Paper or PDF Printer</span>
              </button>
            </div>
          </div>

          {/* Title and Subtitle Customization */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Report Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Dashboard Title"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Report Subtitle / Note (Optional)
              </label>
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder="e.g. Executive Performance Review — Q4 2026"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* PDF-Specific Controls */}
          {format === 'pdf' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Page Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="landscape">Landscape (Recommended for Dashboards)</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Page Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="a4">A4 (Standard)</option>
                  <option value="letter">US Letter</option>
                  <option value="a3">A3 (Wide Dashboard)</option>
                </select>
              </div>
            </div>
          )}

          {/* PNG Resolution Controls */}
          {format === 'png' && (
            <div className="pt-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Image Resolution / Density
              </label>
              <div className="flex gap-2">
                {[
                  { label: 'Standard (1x)', val: 1 },
                  { label: 'High-Res 2x (Recommended)', val: 2 },
                  { label: 'Ultra 3x (Print Quality)', val: 3 }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setScale(opt.val)}
                    className={cn(
                      "flex-1 py-1.5 px-2 rounded-lg border text-center transition-all text-xs",
                      scale === opt.val
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Theme Option */}
          {format !== 'print' && (
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Visual Theme
              </label>
              <div className="flex gap-2">
                {[
                  { label: 'Current App Theme', val: 'current' },
                  { label: 'Clean Light', val: 'light' },
                  { label: 'Executive Dark', val: 'dark' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setTheme(opt.val as any)}
                    className={cn(
                      "flex-1 py-1.5 px-2 rounded-lg border text-center transition-all text-xs",
                      theme === opt.val
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Export Inclusions Checkboxes */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Metadata & Content Options
            </span>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFilterContext}
                onChange={(e) => setIncludeFilterContext(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                Include active filter & drill context banner
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                Include saved view badge and generation timestamp
              </span>
            </label>

            {kpiSummary && kpiSummary.length > 0 && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeKpiSummary}
                  onChange={(e) => setIncludeKpiSummary(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  Include executive summary metrics header
                </span>
              </label>
            )}
          </div>

          {/* Filename Preview */}
          {format !== 'print' && (
            <div className="text-[11px] text-zinc-500 flex items-center justify-between px-1">
              <span>Target File:</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{previewFilename}</span>
            </div>
          )}

          {/* Error Message */}
          {exportError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Progress / Status indicator */}
          {isExporting && progressStatus && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 flex items-center gap-2 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{progressStatus}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
            className="text-xs text-zinc-600 dark:text-zinc-400"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "text-xs flex items-center gap-1.5 px-4 font-semibold text-white",
              isSuccess 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Export Complete!</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>{format === 'print' ? 'Launch Print Dialog' : `Export ${format.toUpperCase()}`}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
