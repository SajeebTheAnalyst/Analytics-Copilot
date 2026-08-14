import React, { useState, useMemo } from 'react';
import { 
  Wrench, AlertTriangle, AlertCircle, CheckCircle2, ArrowRight, X, 
  Layers, RefreshCw, Type, Filter, HelpCircle, Sparkles, Trash2, Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { 
  CleaningActionType, 
  CleaningPreviewResult,
  previewTrimWhitespace,
  previewCapitalization,
  previewFindReplace,
  previewMergeCategorical,
  previewRemoveDuplicates,
  previewRemoveEmptyRows,
  previewFillMissing,
  previewClearCells,
  previewDeleteColumns
} from '@/lib/manualCleaningEngine';

interface CleaningPreviewModalProps {
  initialAction: CleaningActionType;
  initialColumn?: string;
  initialVariations?: string[];
  data: Record<string, any>[];
  headers: string[];
  formulas?: Record<string, string>;
  onClose: () => void;
  onApply: (result: CleaningPreviewResult) => void;
}

export function CleaningPreviewModal({
  initialAction,
  initialColumn,
  initialVariations = [],
  data,
  headers,
  formulas = {},
  onClose,
  onApply,
}: CleaningPreviewModalProps) {
  // Config state
  const [actionType, setActionType] = useState<CleaningActionType>(initialAction);
  const [selectedColumn, setSelectedColumn] = useState<string>(
    initialColumn || (headers.length > 0 ? headers[0] : '')
  );

  // Capitalization state
  const [casingStyle, setCasingStyle] = useState<'upper' | 'lower' | 'title' | 'sentence'>('title');

  // Find & Replace state
  const [searchVal, setSearchVal] = useState<string>('');
  const [replaceVal, setReplaceVal] = useState<string>('');
  const [matchExact, setMatchExact] = useState<boolean>(true);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);

  // Merge Categorical state
  const [variations, setVariations] = useState<string[]>(initialVariations);
  const [selectedVariations, setSelectedVariations] = useState<string[]>(initialVariations);
  const [targetCategoricalVal, setTargetCategoricalVal] = useState<string>(
    initialVariations.length > 0 ? initialVariations[0] : ''
  );

  // Fill Missing state
  const [fillStrategy, setFillStrategy] = useState<'custom' | 'ffill' | 'bfill' | 'mean' | 'median' | 'mode'>('custom');
  const [customFillVal, setCustomFillVal] = useState<string>('N/A');

  // Delete Column state
  const [colsToDelete, setColsToDelete] = useState<string[]>(
    initialColumn ? [initialColumn] : []
  );

  // Calculate live Preview Result
  const previewResult: CleaningPreviewResult = useMemo(() => {
    switch (actionType) {
      case 'trim_whitespace':
        return previewTrimWhitespace(data, headers, formulas, selectedColumn);

      case 'text_capitalization':
        return previewCapitalization(data, headers, formulas, selectedColumn, casingStyle);

      case 'find_replace':
        return previewFindReplace(
          data, 
          headers, 
          formulas, 
          selectedColumn, 
          searchVal, 
          replaceVal, 
          matchExact, 
          caseSensitive
        );

      case 'merge_categorical':
        return previewMergeCategorical(
          data, 
          headers, 
          formulas, 
          selectedColumn, 
          selectedVariations, 
          targetCategoricalVal
        );

      case 'remove_duplicates':
        return previewRemoveDuplicates(data, headers, formulas);

      case 'remove_empty_rows':
        return previewRemoveEmptyRows(data, headers);

      case 'fill_missing':
        return previewFillMissing(data, headers, formulas, selectedColumn, fillStrategy, customFillVal);

      case 'clear_cells':
        return previewClearCells(data, headers, formulas, selectedColumn);

      case 'delete_columns':
        return previewDeleteColumns(data, headers, formulas, colsToDelete);

      default:
        return previewTrimWhitespace(data, headers, formulas, selectedColumn);
    }
  }, [
    actionType, selectedColumn, casingStyle, searchVal, replaceVal, 
    matchExact, caseSensitive, selectedVariations, targetCategoricalVal, 
    fillStrategy, customFillVal, colsToDelete, data, headers, formulas
  ]);

  const handleApply = () => {
    onApply(previewResult);
    onClose();
  };

  const toggleVariationSelection = (varItem: string) => {
    if (selectedVariations.includes(varItem)) {
      setSelectedVariations(selectedVariations.filter(v => v !== varItem));
    } else {
      setSelectedVariations([...selectedVariations, varItem]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs text-zinc-900 dark:text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50">
                {previewResult.actionTitle} — Review Before Apply
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Deterministic working copy mutation. Preview exact before & after changes below.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Action Parameter Controls */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider text-[10px]">
                Operation Parameters
              </span>

              {/* Column Selector for column-level actions */}
              {['trim_whitespace', 'text_capitalization', 'find_replace', 'merge_categorical', 'fill_missing', 'clear_cells'].includes(actionType) && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Target Column:</label>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="h-8 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {actionType === 'trim_whitespace' && <option value="All">All Columns</option>}
                    {headers.map(h => (
                      <option key={h} value={h}>
                        {h} {formulas[h] ? '(Formula)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Custom parameters by Action Type */}

            {/* 1. Capitalization Controls */}
            {actionType === 'text_capitalization' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Format Case:</span>
                <div className="flex items-center gap-1.5">
                  {(['title', 'upper', 'lower', 'sentence'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setCasingStyle(style)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer",
                        casingStyle === style
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Find & Replace Controls */}
            {actionType === 'find_replace' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Find Value:
                  </label>
                  <input
                    type="text"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder="e.g. Dhaka"
                    className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Replace With:
                  </label>
                  <input
                    type="text"
                    value={replaceVal}
                    onChange={(e) => setReplaceVal(e.target.value)}
                    placeholder="e.g. DHAKA"
                    className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matchExact}
                      onChange={(e) => setMatchExact(e.target.checked)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Exact Cell Match</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Case Sensitive</span>
                  </label>
                </div>
              </div>
            )}

            {/* 3. Categorical Variations Merge Controls */}
            {actionType === 'merge_categorical' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Target Standard Value (Replace selected variations with):
                  </label>
                  <input
                    type="text"
                    value={targetCategoricalVal}
                    onChange={(e) => setTargetCategoricalVal(e.target.value)}
                    placeholder="e.g. Rangpur"
                    className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                {variations.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Select Variations to Replace:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {variations.map((v) => {
                        const isSelected = selectedVariations.includes(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => toggleVariationSelection(v)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                              isSelected 
                                ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border-blue-400 dark:border-blue-700" 
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                            )}
                          >
                            <Check className={cn("w-3 h-3", isSelected ? "opacity-100 text-blue-600" : "opacity-0")} />
                            <span>"{v}"</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Fill Missing Value Controls */}
            {actionType === 'fill_missing' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Fill Strategy:
                  </label>
                  <select
                    value={fillStrategy}
                    onChange={(e) => setFillStrategy(e.target.value as any)}
                    className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="custom">Custom Fixed Value</option>
                    <option value="ffill">Forward Fill (Last Valid)</option>
                    <option value="bfill">Backward Fill (Next Valid)</option>
                    <option value="mean">Mean (Average for numbers)</option>
                    <option value="median">Median (Middle value)</option>
                    <option value="mode">Mode (Most Frequent)</option>
                  </select>
                </div>

                {fillStrategy === 'custom' && (
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      Custom Fill Value:
                    </label>
                    <input
                      type="text"
                      value={customFillVal}
                      onChange={(e) => setCustomFillVal(e.target.value)}
                      placeholder="e.g. N/A or 0"
                      className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5. Delete Columns Controls */}
            {actionType === 'delete_columns' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                  Select Columns to Delete:
                </label>
                <div className="flex flex-wrap gap-2">
                  {headers.map((h) => {
                    const isSelected = colsToDelete.includes(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          if (isSelected) setColsToDelete(colsToDelete.filter(c => c !== h));
                          else setColsToDelete([...colsToDelete, h]);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-800"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                        )}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                        <span>{h}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Formula Protection Warning Banner */}
          {previewResult.warningFormulaColumns.length > 0 && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Formula Column Protection Active:</strong>
                <span>
                  The following calculated formula columns cannot be modified and were excluded: 
                  <span className="font-mono font-bold ml-1">[{previewResult.warningFormulaColumns.join(', ')}]</span>.
                </span>
              </div>
            </div>
          )}

          {/* Impact Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Rows Affected</span>
              <span className="text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono mt-0.5 block">
                {previewResult.rowsAffectedCount.toLocaleString()} rows
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Cells Affected</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
                {previewResult.cellsAffectedCount.toLocaleString()} cells
              </span>
            </div>

            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Target Scope</span>
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 block truncate">
                {previewResult.targetDescription}
              </span>
            </div>
          </div>

          {/* Before → After Diff Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Before → After Diff Preview (Sample Changes)
              </h4>
              <span className="text-[11px] font-mono text-zinc-500">
                Showing top {Math.min(20, previewResult.diffCells.length)} of {previewResult.diffCells.length} changes
              </span>
            </div>

            {previewResult.diffCells.length === 0 ? (
              <div className="p-6 text-center border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 text-zinc-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200">No Changes Required</p>
                <p className="text-[11px] mt-0.5">{previewResult.summaryText}</p>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950 max-h-56 overflow-y-auto custom-scrollbar font-mono">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">
                      <th className="py-2 px-3">Row #</th>
                      <th className="py-2 px-3">Column</th>
                      <th className="py-2 px-3 text-red-700 dark:text-red-400">Original Value (Before)</th>
                      <th className="py-2 px-3 text-emerald-700 dark:text-emerald-400">New Value (After)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-[11px]">
                    {previewResult.diffCells.slice(0, 20).map((diff, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2 px-3 text-zinc-500 font-sans">
                          Row {diff.rowIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-sans font-bold text-zinc-800 dark:text-zinc-200">
                          {diff.header}
                        </td>
                        <td className="py-2 px-3 text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-950/20">
                          <span className="line-through">{String(diff.originalValue)}</span>
                        </td>
                        <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 font-bold">
                          {String(diff.newValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
          <span className="text-[11px] text-zinc-500">
            Modifies <strong>Working Copy</strong> only. Original dataset is unchanged until you click Save Changes.
          </span>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-bold border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={previewResult.cellsAffectedCount === 0 && previewResult.rowsAffectedCount === 0 && actionType !== 'delete_columns'}
              onClick={handleApply}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
