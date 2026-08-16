import React, { useState, useRef } from 'react';
import { Dataset, ViewState } from '@/types';
import { 
  Sparkles, Download, ArrowLeft, RotateCcw, 
  ShieldAlert, Bot, Table as TableIcon, ShieldCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { DataQualityPanel } from '../workspace/DataQualityPanel';
import { DataGrid, DataGridHandle } from '../workspace/DataGrid';
import { AICleaningCopilotPanel } from '../workspace/AICleaningCopilotPanel';
import { CleaningPreviewModal } from '../workspace/CleaningPreviewModal';
import { CleaningRibbon, RibbonTabId } from './CleaningRibbon';
import { scanDatasetQuality } from '@/lib/qualityScanner';
import { CleaningActionType } from '@/lib/manualCleaningEngine';
import { restoreOriginal } from '@/lib/dataCleaner';
import { calculateDatasetHealth } from '@/lib/profiler';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface CleaningViewProps {
  datasets: Dataset[];
  onApplyIssue?: (datasetId: string, issueId: string) => void;
  onRejectIssue?: (datasetId: string, issueId: string) => void;
  onUndoLog?: (datasetId: string, logId: string) => void;
  onApproveAllSafe?: (datasetId: string) => void;
  onUpdateDataset?: (updatedDataset: Dataset) => void;
  onNavigateView?: (view: ViewState) => void;
}

export function CleaningView({ 
  datasets, 
  onUpdateDataset,
  onNavigateView
}: CleaningViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(datasets[0]?.id || null);
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTabId>('home');
  const [showResetModal, setShowResetModal] = useState(false);
  const [showQualityAudit, setShowQualityAudit] = useState(false);
  const [showAICopilotModal, setShowAICopilotModal] = useState(false);
  const [showGridlines, setShowGridlines] = useState<boolean>(true);
  const [rowDensity, setRowDensity] = useState<'compact' | 'normal' | 'comfortable'>('normal');
  const [isHeaderFrozen, setIsHeaderFrozen] = useState<boolean>(true);
  const [activeCleaningModal, setActiveCleaningModal] = useState<{
    actionType: CleaningActionType;
    column?: string;
    variations?: string[];
  } | null>(null);

  const gridRef = useRef<DataGridHandle>(null);

  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-[#050505] h-full">
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
  const healthMetrics = calculateDatasetHealth(selectedDataset);
  const pendingIssues = issues.filter(i => i.status === 'pending');

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

  const handleResetConfirm = () => {
    if (onUpdateDataset) {
      const resetDs = restoreOriginal(selectedDataset);
      onUpdateDataset(resetDs);
    }
    setShowResetModal(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full w-full bg-zinc-50 dark:bg-[#08080a] text-zinc-900 dark:text-zinc-100 overflow-hidden">
      
      {/* ================================================== */}
      {/* 1. TOP HEADER & WORKSPACE BAR                      */}
      {/* ================================================== */}
      <div className="glass-panel border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-2xs bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onNavigateView && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onNavigateView('data-manager')}
              className="text-xs h-7 px-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 border-zinc-200 dark:border-zinc-800"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hidden sm:inline">Cleaning Workspace</span>
            <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[220px] truncate"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.rowCount.toLocaleString()} rows)</option>
              ))}
            </select>
          </div>
        </div>

        {/* Health KPI Summary & Top Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 px-2.5 py-1 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Health:</span>
              <span className={cn(
                "text-xs font-extrabold",
                healthMetrics.score >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                healthMetrics.score >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
              )}>
                {healthMetrics.score}%
              </span>
            </div>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="text-[11px] font-mono font-medium">{selectedDataset.rowCount.toLocaleString()} rows</span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-[11px] font-mono font-medium">{selectedDataset.headers.length} cols</span>
              {pendingIssues.length > 0 && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 font-mono">
                    {pendingIssues.length} issues
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60"
              onClick={() => setShowQualityAudit(true)}
              title="Open Data Quality Scanner & Audit Panel"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
              Quality Audit
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2.5 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60"
              onClick={() => setShowAICopilotModal(true)}
              title="Open AI Cleaning Copilot"
            >
              <Bot className="w-3.5 h-3.5 mr-1 text-purple-600 dark:text-purple-400" />
              AI Copilot
            </Button>

            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-7 px-2 text-zinc-600 dark:text-zinc-300 hover:text-red-600 border-zinc-200 dark:border-zinc-800"
              onClick={() => setShowResetModal(true)}
              title="Reset dataset back to original snapshot"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              Reset
            </Button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

            <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={exportCSV} title="Export Cleaned CSV">
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={exportExcel} title="Export Cleaned Excel">
              <Download className="w-3 h-3 mr-1 text-emerald-500" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. SHEET / DATASET HEADER                          */}
      {/* ================================================== */}
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <TableIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {selectedDataset.name}
          </h2>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            {selectedDataset.rowCount.toLocaleString()} rows | {selectedDataset.headers.length} columns
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div 
            onClick={() => setShowQualityAudit(true)}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300"
          >
            {healthMetrics.score >= 90 ? (
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-3 h-3 text-amber-500" />
            )}
            <span>Readiness: {healthMetrics.score}%</span>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 3. EXCEL-STYLE RIBBON FOUNDATION                   */}
      {/* ================================================== */}
      <CleaningRibbon 
        activeTab={activeRibbonTab}
        onTabChange={setActiveRibbonTab}
        onToggleBold={() => gridRef.current?.toggleBold()}
        onToggleItalic={() => gridRef.current?.toggleItalic()}
        onToggleUnderline={() => gridRef.current?.toggleUnderline()}
        onSetFontSize={(sz) => gridRef.current?.setFontSize(sz)}
        onSetTextColor={(c) => gridRef.current?.setTextColor(c)}
        onSetBgColor={(c) => gridRef.current?.setBgColor(c)}
        onSetAlignment={(a) => gridRef.current?.setAlignment(a)}
        onToggleWrapText={() => gridRef.current?.toggleWrapText()}
        onSetNumberFormat={(fmt) => gridRef.current?.setNumberFormat(fmt)}
        onApplyStyle={(st) => gridRef.current?.applyStyle(st)}
        onApplyConditionalFormatting={(rule) => gridRef.current?.applyConditionalFormatting(rule)}
        onAutoFitColumns={() => gridRef.current?.autoFitColumns()}
        onAutoFitRows={() => gridRef.current?.autoFitRows()}
        onFormatAsReport={() => gridRef.current?.formatAsReport()}
        onPrintPreview={() => gridRef.current?.printPreview()}
        onExportExcel={exportExcel}
        onExportPdf={() => {
          alert('Export PDF triggered for professional MIS Report.');
        }}
        onCopy={() => gridRef.current?.copySelection()}
        onCut={() => gridRef.current?.cutSelection()}
        onPaste={() => gridRef.current?.pasteClipboard()}
        onSave={() => gridRef.current?.save()}
        onDiscard={() => gridRef.current?.discard()}
        onUndo={() => gridRef.current?.undo()}
        onRedo={() => gridRef.current?.redo()}
        canUndo={gridRef.current?.canUndo}
        canRedo={gridRef.current?.canRedo}
        isDirty={gridRef.current?.isDirty}
        onAddRow={() => gridRef.current?.addRow()}
        onAddColumn={() => gridRef.current?.addColumn()}
        onDeleteRow={() => gridRef.current?.deleteRow()}
        canDeleteRow={gridRef.current?.canDeleteRow}
        onQualityAudit={() => setShowQualityAudit(true)}
        onAICopilot={() => setShowAICopilotModal(true)}
        onTrimWhitespace={() => setActiveCleaningModal({ actionType: 'trim_whitespace' })}
        onCleanCharacters={() => setActiveCleaningModal({ actionType: 'clean_characters' })}
        onCapitalizeCase={() => setActiveCleaningModal({ actionType: 'text_capitalization' })}
        onStandardizeCapitalization={() => setActiveCleaningModal({ actionType: 'text_capitalization' })}
        onFindReplace={() => {
          setActiveCleaningModal({ actionType: 'find_replace' });
        }}
        onMergeVariations={() => setActiveCleaningModal({ actionType: 'merge_categorical' })}
        onFillMissing={() => setActiveCleaningModal({ actionType: 'fill_missing' })}
        onClearCells={() => setActiveCleaningModal({ actionType: 'clear_cells' })}
        onRemoveDuplicates={() => setActiveCleaningModal({ actionType: 'remove_duplicates' })}
        onRemoveEmptyRows={() => setActiveCleaningModal({ actionType: 'remove_empty_rows' })}
        onRemoveBlankColumns={() => setActiveCleaningModal({ actionType: 'remove_empty_columns' })}
        onDeleteColumns={() => setActiveCleaningModal({ actionType: 'delete_columns' })}
        onRenameColumn={() => gridRef.current?.renameColumn()}
        onSplitColumn={() => {
          setActiveCleaningModal({ actionType: 'split_column' });
        }}
        onExtractBeforeDelimiter={() => {
          setActiveCleaningModal({ actionType: 'extract_before_delimiter' });
        }}
        onExtractAfterDelimiter={() => {
          setActiveCleaningModal({ actionType: 'extract_after_delimiter' });
        }}
        onExtractBetweenDelimiters={() => {
          setActiveCleaningModal({ actionType: 'extract_between_delimiters' });
        }}
        onExtractDate={() => {
          setActiveCleaningModal({ actionType: 'extract_date' });
        }}
        onExtractTime={() => {
          setActiveCleaningModal({ actionType: 'extract_time' });
        }}
        onFlashFill={() => {
          setActiveCleaningModal({ actionType: 'flash_fill' });
        }}
        onFillUp={() => {
          setActiveCleaningModal({ actionType: 'fill_up' });
        }}
        onFillSeries={() => {
          setActiveCleaningModal({ actionType: 'fill_series' });
        }}
        onChangeDataType={() => {
          gridRef.current?.changeDataType();
        }}
        // Phase 8P-2Y Transform & Formula Ribbon Actions
        onReplaceValues={() => {
          setActiveCleaningModal({ actionType: 'find_replace' });
        }}
        onMergeCategories={() => {
          setActiveCleaningModal({ actionType: 'merge_categorical' });
        }}
        onStandardizeValuesMode={() => {
          setActiveCleaningModal({ actionType: 'standardize_values' });
        }}
        onChangeDataTypeOption={() => {
          gridRef.current?.changeDataType();
        }}
        onFormulaColumnPreset={() => {
          gridRef.current?.openFormulaBuilder();
        }}
        onCustomFormula={() => {
          gridRef.current?.openFormulaBuilder();
        }}
        onCalculateColumn={() => {
          setActiveCleaningModal({ actionType: 'calculate_column' });
        }}
        onConditionalTransform={() => {
          setActiveCleaningModal({ actionType: 'conditional_transform' });
        }}
        // Phase 8P-2W Data Ribbon Actions
        onSortAsc={() => gridRef.current?.sortAscending()}
        onSortDesc={() => gridRef.current?.sortDescending()}
        onToggleFilter={() => gridRef.current?.toggleFilter()}
        isFilterActive={gridRef.current?.isFilterActive}
        onClearFilter={() => gridRef.current?.clearFilter()}
        onTextToColumns={() => setActiveCleaningModal({ actionType: 'split_column' })}
        onFillDown={() => setActiveCleaningModal({ actionType: 'fill_down' })}
        onFillRight={() => gridRef.current?.fillRight()}
        onFindErrors={() => gridRef.current?.findErrors()}
        onStandardizeValues={() => gridRef.current?.standardizeValues()}
        onValidateData={() => gridRef.current?.validateData()}
        onDetectInvalidValues={() => gridRef.current?.detectInvalidValues()}
        onDetectMixedTypes={() => gridRef.current?.detectMixedDataTypes()}
        onGroupRows={() => gridRef.current?.groupRows()}
        onUngroupRows={() => gridRef.current?.ungroupRows()}
        onToggleOutlineDetails={() => gridRef.current?.toggleOutlineDetails()}
        isOutlineExpanded={gridRef.current?.isOutlineExpanded}
        showGridlines={showGridlines}
        onToggleGridlines={() => setShowGridlines(!showGridlines)}
        rowDensity={rowDensity}
        onChangeRowDensity={setRowDensity}
        isHeaderFrozen={isHeaderFrozen}
        onToggleFreezeHeader={() => setIsHeaderFrozen(!isHeaderFrozen)}
      />

      {/* ================================================== */}
      {/* 3. FULL-WIDTH EXCEL DATAGRID WORKSPACE             */}
      {/* ================================================== */}
      <div className="flex-1 min-h-0 flex flex-col px-2 pb-2 pt-0 sm:px-3 sm:pb-3 bg-transparent overflow-hidden">
        <DataGrid 
          ref={gridRef}
          dataset={selectedDataset} 
          onNavigateView={onNavigateView} 
          onUpdateDataset={onUpdateDataset}
          showGridlines={showGridlines}
          rowDensity={rowDensity}
          isHeaderFrozen={isHeaderFrozen}
        />
      </div>

      {/* ================================================== */}
      {/* RESET CONFIRMATION MODAL                           */}
      {/* ================================================== */}
      {showResetModal && (
        <div className="fixed inset-0 bg-transparent pointer-events-none flex items-center justify-center z-50 p-4">
          <div className="pointer-events-auto bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <RotateCcw className="w-5 h-5 shrink-0" />
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
      {/* DATA QUALITY AUDIT MODAL OVERLAY                   */}
      {/* ================================================== */}
      {showQualityAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-transparent pointer-events-none animate-in fade-in duration-200 overflow-y-auto">
          <div className="pointer-events-auto max-w-5xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar my-auto shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
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

      {/* ================================================== */}
      {/* AI DATA CLEANING COPILOT MODAL OVERLAY             */}
      {/* ================================================== */}
      {showAICopilotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-none animate-in fade-in duration-200">
          <div className="pointer-events-auto shadow-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800">
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
        </div>
      )}

      {/* ================================================== */}
      {/* CLEANING PREVIEW MODAL                             */}
      {/* ================================================== */}
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
                fullData: result.updatedData,
                headers: result.updatedHeaders,
                rowCount: result.updatedData.length,
                updatedAt: Date.now()
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
