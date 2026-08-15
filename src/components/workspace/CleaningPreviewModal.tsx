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
  previewCleanCharacters,
  previewCapitalization,
  previewFindReplace,
  previewMergeCategorical,
  previewRemoveDuplicates,
  previewRemoveEmptyRows,
  previewRemoveEmptyColumns,
  previewFillMissing,
  previewClearCells,
  previewDeleteColumns,
  previewSplitColumn,
  previewExtractBeforeDelimiter,
  previewExtractAfterDelimiter,
  previewExtractBetweenDelimiters,
  previewExtractDate,
  previewExtractTime,
  previewChangeDataType,
  previewFlashFill,
  previewFillSeries,
  previewFillUp,
  previewFillDown,
  previewStandardizeValues,
  previewCalculateColumn,
  previewConditionalTransform
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

  // Split Column state
  const [splitDelimiter, setSplitDelimiter] = useState<string>(',');

  // Change Data Type state
  const [targetDataType, setTargetDataType] = useState<string>('Numeric');

  // Clean Characters state
  const [cleanCharMode, setCleanCharMode] = useState<'all_non_printable' | 'control_chars' | 'strip_symbols'>('all_non_printable');

  // Extraction Delimiters
  const [extractDelimiter, setExtractDelimiter] = useState<string>('@');
  const [startDelim, setStartDelim] = useState<string>('(');
  const [endDelim, setEndDelim] = useState<string>(')');

  // Flash Fill state
  const [flashPattern, setFlashPattern] = useState<'extract_first_word' | 'extract_last_word' | 'extract_initials' | 'extract_numbers' | 'uppercase_first'>('extract_first_word');

  // Fill Series state
  const [seriesStart, setSeriesStart] = useState<number>(1);
  const [seriesStep, setSeriesStep] = useState<number>(1);

  // Standardize Values state
  const [standardizeMode, setStandardizeMode] = useState<'all' | 'text' | 'dates' | 'numbers' | 'booleans'>('all');

  // Calculate Column state
  const [calcType, setCalcType] = useState<'percent_of_total' | 'running_total' | 'multiply_factor' | 'add_constant' | 'diff_prev_row' | 'z_score'>('percent_of_total');
  const [calcFactor, setCalcFactor] = useState<number>(1.1);
  const [calcNewCol, setCalcNewCol] = useState<boolean>(true);

  // Conditional Transform state
  const [condType, setCondType] = useState<'greater_than' | 'less_than' | 'equals' | 'contains' | 'is_blank' | 'is_not_blank'>('greater_than');
  const [condVal, setCondVal] = useState<string>('100');
  const [thenVal, setThenVal] = useState<string>('High');
  const [elseVal, setElseVal] = useState<string>('Normal');
  const [condNewColName, setCondNewColName] = useState<string>('');

  // Calculate live Preview Result
  const previewResult: CleaningPreviewResult = useMemo(() => {
    switch (actionType) {
      case 'trim_whitespace':
        return previewTrimWhitespace(data, headers, formulas, selectedColumn);

      case 'clean_characters':
        return previewCleanCharacters(data, headers, formulas, selectedColumn, cleanCharMode);

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

      case 'remove_empty_columns':
        return previewRemoveEmptyColumns(data, headers, formulas);

      case 'fill_missing':
        return previewFillMissing(data, headers, formulas, selectedColumn, fillStrategy, customFillVal);

      case 'clear_cells':
        return previewClearCells(data, headers, formulas, selectedColumn);

      case 'delete_columns':
        return previewDeleteColumns(data, headers, formulas, colsToDelete);

      case 'split_column':
        return previewSplitColumn(data, headers, formulas, selectedColumn, splitDelimiter);

      case 'extract_before_delimiter':
        return previewExtractBeforeDelimiter(data, headers, formulas, selectedColumn, extractDelimiter);

      case 'extract_after_delimiter':
        return previewExtractAfterDelimiter(data, headers, formulas, selectedColumn, extractDelimiter);

      case 'extract_between_delimiters':
        return previewExtractBetweenDelimiters(data, headers, formulas, selectedColumn, startDelim, endDelim);

      case 'extract_date':
        return previewExtractDate(data, headers, formulas, selectedColumn);

      case 'extract_time':
        return previewExtractTime(data, headers, formulas, selectedColumn);

      case 'change_data_type':
        return previewChangeDataType(data, headers, formulas, selectedColumn, targetDataType);

      case 'flash_fill':
        return previewFlashFill(data, headers, formulas, selectedColumn, flashPattern);

      case 'fill_series':
        return previewFillSeries(data, headers, formulas, selectedColumn, seriesStart, seriesStep);

      case 'fill_up':
        return previewFillUp(data, headers, formulas, selectedColumn);

      case 'fill_down':
        return previewFillDown(data, headers, formulas, selectedColumn);

      case 'standardize_values':
        return previewStandardizeValues(data, headers, formulas, selectedColumn, standardizeMode);

      case 'calculate_column':
        return previewCalculateColumn(data, headers, formulas, selectedColumn, calcType, calcFactor, calcNewCol);

      case 'conditional_transform':
        return previewConditionalTransform(data, headers, formulas, selectedColumn, condType, condVal, thenVal, elseVal, condNewColName);

      default:
        return previewTrimWhitespace(data, headers, formulas, selectedColumn);
    }
  }, [
    actionType, selectedColumn, casingStyle, searchVal, replaceVal, 
    matchExact, caseSensitive, selectedVariations, targetCategoricalVal, 
    fillStrategy, customFillVal, colsToDelete, splitDelimiter, targetDataType,
    cleanCharMode, extractDelimiter, startDelim, endDelim, flashPattern,
    seriesStart, seriesStep, standardizeMode, calcType, calcFactor, calcNewCol,
    condType, condVal, thenVal, elseVal, condNewColName, data, headers, formulas
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-transparent pointer-events-none animate-in fade-in duration-200">
      <div className="pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-xs text-zinc-900 dark:text-zinc-100">
        
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
              {['trim_whitespace', 'clean_characters', 'text_capitalization', 'find_replace', 'merge_categorical', 'fill_missing', 'clear_cells', 'split_column', 'extract_before_delimiter', 'extract_after_delimiter', 'extract_between_delimiters', 'extract_date', 'extract_time', 'change_data_type', 'flash_fill', 'fill_series', 'fill_up', 'fill_down'].includes(actionType) && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Target Column:</label>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="h-8 px-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {(actionType === 'trim_whitespace' || actionType === 'clean_characters') && <option value="All">All Columns</option>}
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

            {/* 1. Clean Characters Controls */}
            {actionType === 'clean_characters' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Clean Mode:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'All Non-Printable & Zero-Width', val: 'all_non_printable' },
                    { label: 'Control Chars Only (ASCII 0-31)', val: 'control_chars' },
                    { label: 'Strip Special Symbols', val: 'strip_symbols' },
                  ].map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setCleanCharMode(m.val as any)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        cleanCharMode === m.val
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Removes unprintable ASCII characters, zero-width spaces, and control codes from text cells.
                </p>
              </div>
            )}

            {/* 2. Capitalization Controls */}
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

            {/* 3. Find & Replace Controls */}
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

            {/* 4. Categorical Variations Merge Controls */}
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

            {/* 5. Fill Missing Value Controls */}
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

            {/* 6. Split Column Controls */}
            {actionType === 'split_column' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Split Delimiter:
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'Comma (,)', val: ',' },
                    { label: 'Space ( )', val: ' ' },
                    { label: 'Dash (-)', val: '-' },
                    { label: 'Slash (/)', val: '/' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setSplitDelimiter(d.val)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        splitDelimiter === d.val
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={splitDelimiter}
                    onChange={(e) => setSplitDelimiter(e.target.value)}
                    placeholder="Custom"
                    className="w-20 h-8 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Original column remains unchanged. Creates two new columns: <span className="font-mono font-bold">{selectedColumn}_1</span> and <span className="font-mono font-bold">{selectedColumn}_2</span>.
                </p>
              </div>
            )}

            {/* 7. Extract Before Delimiter */}
            {actionType === 'extract_before_delimiter' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Extract Before Delimiter:
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'At (@)', val: '@' },
                    { label: 'Space ( )', val: ' ' },
                    { label: 'Comma (,)', val: ',' },
                    { label: 'Dash (-)', val: '-' },
                    { label: 'Dot (.)', val: '.' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setExtractDelimiter(d.val)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        extractDelimiter === d.val
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={extractDelimiter}
                    onChange={(e) => setExtractDelimiter(e.target.value)}
                    placeholder="Custom"
                    className="w-20 h-8 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 8. Extract After Delimiter */}
            {actionType === 'extract_after_delimiter' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Extract After Delimiter:
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'At (@)', val: '@' },
                    { label: 'Space ( )', val: ' ' },
                    { label: 'Comma (,)', val: ',' },
                    { label: 'Dash (-)', val: '-' },
                    { label: 'Dot (.)', val: '.' },
                  ].map((d) => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setExtractDelimiter(d.val)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        extractDelimiter === d.val
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={extractDelimiter}
                    onChange={(e) => setExtractDelimiter(e.target.value)}
                    placeholder="Custom"
                    className="w-20 h-8 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 9. Extract Between Delimiters */}
            {actionType === 'extract_between_delimiters' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Start Delimiter:
                  </label>
                  <input
                    type="text"
                    value={startDelim}
                    onChange={(e) => setStartDelim(e.target.value)}
                    placeholder="e.g. ("
                    className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    End Delimiter:
                  </label>
                  <input
                    type="text"
                    value={endDelim}
                    onChange={(e) => setEndDelim(e.target.value)}
                    placeholder="e.g. )"
                    className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* 10. Extract Date Controls */}
            {actionType === 'extract_date' && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                <p>Extracts date component (e.g., <span className="font-mono font-bold">2020-12-12</span>) from column <span className="font-bold">{selectedColumn}</span>.</p>
                <p className="text-[10px] text-zinc-500 mt-1">Original column remains unchanged. Creates new column: <span className="font-mono font-bold">{selectedColumn}_Date</span>.</p>
              </div>
            )}

            {/* 11. Extract Time Controls */}
            {actionType === 'extract_time' && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                <p>Extracts time component (e.g., <span className="font-mono font-bold">14:30:00</span>) from column <span className="font-bold">{selectedColumn}</span>.</p>
                <p className="text-[10px] text-zinc-500 mt-1">Original column remains unchanged. Creates new column: <span className="font-mono font-bold">{selectedColumn}_Time</span>.</p>
              </div>
            )}

            {/* 12. Flash Fill Controls */}
            {actionType === 'flash_fill' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Flash Fill Pattern:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'First Word / Name', val: 'extract_first_word' },
                    { label: 'Last Word / Surname', val: 'extract_last_word' },
                    { label: 'Initials (e.g. J.D.)', val: 'extract_initials' },
                    { label: 'Extract Numbers Only', val: 'extract_numbers' },
                    { label: 'Capitalize First Letter', val: 'uppercase_first' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setFlashPattern(p.val as any)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        flashPattern === p.val
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Intelligently infers and extracts patterns across all rows into a new column.
                </p>
              </div>
            )}

            {/* 13. Fill Series Controls */}
            {actionType === 'fill_series' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Start Value:
                  </label>
                  <input
                    type="number"
                    value={seriesStart}
                    onChange={(e) => setSeriesStart(Number(e.target.value) || 1)}
                    className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Step Value (Increment):
                  </label>
                  <input
                    type="number"
                    value={seriesStep}
                    onChange={(e) => setSeriesStep(Number(e.target.value) || 1)}
                    className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 14. Fill Down / Fill Up info */}
            {(actionType === 'fill_down' || actionType === 'fill_up') && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                <p>
                  {actionType === 'fill_down' 
                    ? `Replicates the top value downwards to fill all subsequent rows in column "${selectedColumn}".` 
                    : `Replicates the bottom value upwards across column "${selectedColumn}".`}
                </p>
              </div>
            )}

            {/* 15. Remove Empty Columns info */}
            {actionType === 'remove_empty_columns' && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                <p>Scans the entire dataset and removes columns that contain only empty or whitespace values.</p>
              </div>
            )}

            {/* 16. Change Data Type Controls */}
            {actionType === 'change_data_type' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Target Data Type:
                </label>
                <div className="flex items-center gap-2">
                  {['Numeric', 'Integer', 'Decimal', 'Text', 'Boolean'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetDataType(t)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        targetDataType === t
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 17. Standardize Values Controls */}
            {actionType === 'standardize_values' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Standardization Scope & Mode:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Standardize All Formats', val: 'all' },
                    { label: 'Text & Extra Spaces', val: 'text' },
                    { label: 'Dates to ISO (YYYY-MM-DD)', val: 'dates' },
                    { label: 'Numeric Formats', val: 'numbers' },
                    { label: 'Booleans (TRUE/FALSE)', val: 'booleans' },
                  ].map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setStandardizeMode(m.val as any)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        standardizeMode === m.val
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Normalizes inconsistent text spacing, date encodings, boolean flags, and clean numeric values.
                </p>
              </div>
            )}

            {/* 18. Calculate Column Controls */}
            {actionType === 'calculate_column' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Calculation Type:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: '% of Column Total', val: 'percent_of_total' },
                      { label: 'Cumulative / Running Total', val: 'running_total' },
                      { label: 'Multiply by Factor', val: 'multiply_factor' },
                      { label: 'Add Constant', val: 'add_constant' },
                      { label: 'Difference vs Prev Row', val: 'diff_prev_row' },
                      { label: 'Z-Score Normalization', val: 'z_score' },
                    ].map((c) => (
                      <button
                        key={c.val}
                        type="button"
                        onClick={() => setCalcType(c.val as any)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left truncate cursor-pointer",
                          calcType === c.val
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(calcType === 'multiply_factor' || calcType === 'add_constant') && (
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      {calcType === 'multiply_factor' ? 'Multiplication Factor:' : 'Constant Value to Add:'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={calcFactor}
                      onChange={(e) => setCalcFactor(parseFloat(e.target.value) || 1)}
                      className="w-48 h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 19. Conditional Transform Controls */}
            {actionType === 'conditional_transform' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      Condition Rule:
                    </label>
                    <select
                      value={condType}
                      onChange={(e) => setCondType(e.target.value as any)}
                      className="w-full h-8 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="greater_than">Is Greater Than (&gt;)</option>
                      <option value="less_than">Is Less Than (&lt;)</option>
                      <option value="equals">Equals (==)</option>
                      <option value="contains">Text Contains</option>
                      <option value="is_blank">Is Blank / Empty</option>
                      <option value="is_not_blank">Is Not Blank</option>
                    </select>
                  </div>

                  {condType !== 'is_blank' && condType !== 'is_not_blank' && (
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                        Compare Value:
                      </label>
                      <input
                        type="text"
                        value={condVal}
                        onChange={(e) => setCondVal(e.target.value)}
                        placeholder="e.g. 100 or Active"
                        className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      New Column Name:
                    </label>
                    <input
                      type="text"
                      value={condNewColName}
                      onChange={(e) => setCondNewColName(e.target.value)}
                      placeholder={`${selectedColumn}_flag`}
                      className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      THEN Assign (Match):
                    </label>
                    <input
                      type="text"
                      value={thenVal}
                      onChange={(e) => setThenVal(e.target.value)}
                      placeholder="e.g. High or Yes"
                      className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700 dark:text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      ELSE Assign (No Match):
                    </label>
                    <input
                      type="text"
                      value={elseVal}
                      onChange={(e) => setElseVal(e.target.value)}
                      placeholder="e.g. Normal or No"
                      className="w-full h-8 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
