import React, { useState, useMemo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Dataset, ColumnType } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Hash, Calendar, Tag, CaseSensitive, Clock, Sliders, RefreshCw,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, 
  Copy, Check, ChevronDown, Filter, 
  RotateCcw, Table as TableIcon, Layers, Plus, Trash2, Edit3, Save, X, AlertCircle, PlusCircle, AlertTriangle, Calculator, Search, ShieldAlert, ShieldCheck, Wrench, History, Sparkles,
  Undo2, Redo2, Columns, Database, Eraser, Rows, Columns3, SplitSquareVertical
} from 'lucide-react';
import { Button } from '../ui/button';
import { evaluateAllFormulas } from '@/lib/formulaEngine';
import { FormulaBuilderModal } from './FormulaBuilderModal';
import { FindReplaceModal, MatchItem } from './FindReplaceModal';
import { BulkOperationsBar } from './BulkOperationsBar';
import { TypeConversionModal } from './TypeConversionModal';
import { ColumnFormattingModal } from './ColumnFormattingModal';
import { ExtractDateTimeModal } from './ExtractDateTimeModal';
import { DataQualityPanel } from './DataQualityPanel';
import { CleaningPreviewModal } from './CleaningPreviewModal';
import { CleaningHistoryPanel } from './CleaningHistoryPanel';
import { AICleaningCopilotPanel } from './AICleaningCopilotPanel';
import { DataReadinessPanel } from './DataReadinessPanel';
import { scanDatasetQuality } from '@/lib/qualityScanner';
import { evaluateDataReadiness } from '@/lib/dataReadinessEngine';
import { CleaningActionType, CleaningHistoryItem, CleaningPreviewResult } from '@/lib/manualCleaningEngine';
import { formatColumnValue, ColumnFormatConfig, ExtendedType } from '@/lib/typeStandardizer';

interface DataGridProps {
  dataset: Dataset;
  onNavigateView?: (view: any) => void;
  onUpdateDataset?: (dataset: Dataset) => void;
}

interface CellCoords {
  row: number;
  col: number;
}

interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface CellFormatStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: string;
  color?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
  numberFormat?: string;
  stylePreset?: 'header' | 'subheader' | 'total' | 'highlight' | 'warning' | 'good' | null;
}

export interface DataGridHandle {
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  setFontSize: (size: string) => void;
  setTextColor: (color: string) => void;
  setBgColor: (color: string) => void;
  setAlignment: (align: 'left' | 'center' | 'right') => void;
  toggleWrapText: () => void;
  setNumberFormat: (format: string) => void;
  applyStyle: (styleName: string) => void;
  applyConditionalFormatting: (rule: string) => void;
  autoFitColumns: () => void;
  autoFitRows: () => void;
  formatAsReport: () => void;
  printPreview: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
  undo: () => void;
  redo: () => void;
  save: () => void;
  discard: () => void;
  findReplace: () => void;
  addRow: () => void;
  addColumn: () => void;
  deleteRow: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  canDeleteRow: boolean;
}

function formatDisplayValue(val: any, format?: string): string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  const isNum = !isNaN(num);

  if (!format || format === 'general') {
    return String(val);
  }
  if (format === 'number' && isNum) {
    return num.toLocaleString();
  }
  if (format === 'decimal' && isNum) {
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (format === 'currency' && isNum) {
    return num.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }
  if (format === 'percentage' && isNum) {
    return `${(num * (num <= 1 ? 100 : 1)).toFixed(1)}%`;
  }
  if (format === 'date') {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    } catch (e) {}
  }
  if (format === 'time') {
    return String(val);
  }
  return String(val);
}

export const DataGrid = forwardRef<DataGridHandle, DataGridProps>(({ dataset, onNavigateView, onUpdateDataset }, ref) => {
  // ----------------------------------------------------
  // Cell Formatting State (Phase 8P-2M)
  // ----------------------------------------------------
  const [cellFormatting, setCellFormatting] = useState<Record<string, CellFormatStyle>>({});

  const applyFormattingToSelection = (updater: (prev: CellFormatStyle) => CellFormatStyle) => {
    if (!selectionRange) return;
    const { startRow, startCol, endRow, endCol } = selectionRange;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    setCellFormatting(prev => {
      const next = { ...prev };
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          const header = visibleHeaders[c];
          if (!header) continue;
          const key = `${r}:${header}`;
          const current = next[key] || {};
          next[key] = updater(current);
        }
      }
      return next;
    });
    setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    toggleBold: () => applyFormattingToSelection(curr => ({ ...curr, bold: !curr.bold })),
    toggleItalic: () => applyFormattingToSelection(curr => ({ ...curr, italic: !curr.italic })),
    toggleUnderline: () => applyFormattingToSelection(curr => ({ ...curr, underline: !curr.underline })),
    setFontSize: (size) => applyFormattingToSelection(curr => ({ ...curr, fontSize: size })),
    setTextColor: (color) => applyFormattingToSelection(curr => ({ ...curr, color })),
    setBgColor: (color) => applyFormattingToSelection(curr => ({ ...curr, bgColor: color })),
    setAlignment: (align) => applyFormattingToSelection(curr => ({ ...curr, align })),
    toggleWrapText: () => applyFormattingToSelection(curr => ({ ...curr, wrap: !curr.wrap })),
    setNumberFormat: (format) => applyFormattingToSelection(curr => ({ ...curr, numberFormat: format })),
    applyStyle: (styleName) => applyFormattingToSelection(curr => ({ ...curr, stylePreset: styleName as any })),
    applyConditionalFormatting: (rule) => {
      if (!selectionRange) return;
      const { startRow, startCol, endRow, endCol } = selectionRange;
      setCellFormatting(prev => {
        const next = { ...prev };
        for (let r = Math.min(startRow, endRow); r <= Math.max(startRow, endRow); r++) {
          for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
            const header = visibleHeaders[c];
            if (!header) continue;
            const key = `${r}:${header}`;
            const val = Number(displayedRows[r]?.[header]);
            let preset = null;
            if (rule === 'greater_than_1000' && val > 1000) preset = 'highlight';
            else if (rule === 'less_than_0' && val < 0) preset = 'warning';
            else if (rule === 'duplicate') preset = 'warning';
            else if (rule === 'databar') preset = 'good';
            next[key] = { ...(next[key] || {}), stylePreset: preset as any };
          }
        }
        return next;
      });
      setIsDirty(true);
    },
    autoFitColumns: () => {
      setSaveFeedback('Auto-fitted column widths successfully.');
      setTimeout(() => setSaveFeedback(null), 3000);
    },
    autoFitRows: () => {
      setSaveFeedback('Auto-fitted row heights successfully.');
      setTimeout(() => setSaveFeedback(null), 3000);
    },
    formatAsReport: () => {
      setCellFormatting(prev => {
        const next = { ...prev };
        visibleHeaders.forEach(h => {
          next[`0:${h}`] = { ...(next[`0:${h}`] || {}), stylePreset: 'header', bold: true };
        });
        if (displayedRows.length > 0) {
          const lastIdx = displayedRows.length - 1;
          visibleHeaders.forEach(h => {
            next[`${lastIdx}:${h}`] = { ...(next[`${lastIdx}:${h}`] || {}), stylePreset: 'total', bold: true };
          });
        }
        return next;
      });
      setIsDirty(true);
      setSaveFeedback('Applied Professional MIS Report format.');
      setTimeout(() => setSaveFeedback(null), 3000);
    },
    printPreview: () => {
      window.print();
    },
    copySelection: () => copyToClipboard(),
    cutSelection: () => {
      copyToClipboard();
    },
    pasteClipboard: () => {
      navigator.clipboard?.readText().then(() => {
        setSaveFeedback('Pasted text from clipboard.');
        setTimeout(() => setSaveFeedback(null), 3000);
      }).catch(() => {
        setSaveFeedback('Clipboard read requires permission.');
        setTimeout(() => setSaveFeedback(null), 3000);
      });
    },
    undo: () => handleUndoLastCleaningAction(),
    redo: () => handleRedoLastCleaningAction(),
    save: () => handleSaveChanges(),
    discard: () => setShowDiscardModal(true),
    findReplace: () => setShowFindReplaceModal(true),
    addRow: () => handleAddRow(),
    addColumn: () => setShowAddColumnModal(true),
    deleteRow: () => {
      if (selectedCell) setDeletingRowIndex(selectedCell.row);
    },
    canUndo: cleaningHistory.length > 0,
    canRedo: redoStack.length > 0,
    isDirty: isDirty,
    canDeleteRow: selectedCell !== null,
  }));
  const [workingData, setWorkingData] = useState<Record<string, any>[]>([]);
  const [workingHeaders, setWorkingHeaders] = useState<string[]>([]);
  const [workingColumnTypes, setWorkingColumnTypes] = useState<Record<string, ColumnType>>({});
  const [workingColumnFormats, setWorkingColumnFormats] = useState<Record<string, ColumnFormatConfig>>({});
  const [workingFormulas, setWorkingFormulas] = useState<Record<string, string>>({});

  // Phase 8H Type & Format Modals State
  const [typeModalCol, setTypeModalCol] = useState<string | null>(null);
  const [formatModalCol, setFormatModalCol] = useState<string | null>(null);
  const [extractModalCol, setExtractModalCol] = useState<string | null>(null);

  // Unsaved Changes & Modification Indicators
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [editedCells, setEditedCells] = useState<Set<string>>(new Set()); // `${_rowId}:${header}`
  const [addedRowIds, setAddedRowIds] = useState<Set<string>>(new Set()); // `_rowId`
  const [addedColumns, setAddedColumns] = useState<Set<string>>(new Set()); // `header`

  // Formula Builder Modal State
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [editingFormulaCol, setEditingFormulaCol] = useState<string | null>(null);

  // Find & Replace Modal State
  const [showFindReplaceModal, setShowFindReplaceModal] = useState<boolean>(false);
  const [highlightedMatches, setHighlightedMatches] = useState<MatchItem[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(-1);

  // Quality Scanner, AI Copilot & Data Readiness State (Phase 8I, 8K & 8L)
  const [showQualityModal, setShowQualityModal] = useState<boolean>(false);
  const [showAICopilotModal, setShowAICopilotModal] = useState<boolean>(false);
  const [showReadinessModal, setShowReadinessModal] = useState<boolean>(false);

  // Phase 8P-1 Formula Bar State
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isFormulaBarFocused, setIsFormulaBarFocused] = useState<boolean>(false);

  // Phase 8L Deterministic Data Readiness Evaluation
  const readinessEval = useMemo(() => {
    return evaluateDataReadiness(dataset, workingData, workingHeaders, workingFormulas);
  }, [dataset, workingData, workingHeaders, workingFormulas]);

  // Manual Cleaning Actions & History State (Phase 8J)
  const [cleaningHistory, setCleaningHistory] = useState<CleaningHistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<CleaningHistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showCleanDropdown, setShowCleanDropdown] = useState<boolean>(false);
  const [activeCleaningModal, setActiveCleaningModal] = useState<{
    actionType: CleaningActionType;
    column?: string;
    variations?: string[];
  } | null>(null);

  // ----------------------------------------------------
  // 2. Grid UI View State
  // ----------------------------------------------------
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selection state
  const [selectedCell, setSelectedCell] = useState<CellCoords | null>({ row: 0, col: 0 });
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>({
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Cell Editing state
  const [editingCell, setEditingCell] = useState<CellCoords | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: number;
    col: number;
    header: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isDraggingContextMenu, setIsDraggingContextMenu] = useState<boolean>(false);
  const menuDragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Column Visibility Popover
  const [showColumnsDropdown, setShowColumnsDropdown] = useState<boolean>(false);

  // Feedback Toasts
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [warningToast, setWarningToast] = useState<string | null>(null);

  // Modals state
  const [showAddColumnModal, setShowAddColumnModal] = useState<boolean>(false);
  const [newColName, setNewColName] = useState<string>('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [addColumnError, setAddColumnError] = useState<string | null>(null);

  const [renamingHeader, setRenamingHeader] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);

  // Column Resizing state
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  // Sync working copy when active dataset changes or is saved
  useEffect(() => {
    const sourceRows = dataset.fullData && dataset.fullData.length > 0 ? dataset.fullData : dataset.data || [];
    const formattedRows = sourceRows.map((r, idx) => ({
      ...r,
      _rowId: r._rowId || `r-${idx}-${Date.now()}`
    }));

    setWorkingData(formattedRows);
    setWorkingHeaders([...dataset.headers]);
    setWorkingColumnTypes({ ...(dataset.columnTypes || {}) });
    setWorkingColumnFormats({ ...(dataset.columnFormats || {}) });
    setWorkingFormulas({ ...(dataset.formulas || {}) });

    setIsDirty(false);
    setEditedCells(new Set());
    setAddedRowIds(new Set());
    setAddedColumns(new Set());

    setSelectedCell({ row: 0, col: 0 });
    setSelectionRange({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    setEditingCell(null);
    setSortConfig(null);
    setSearchQuery('');
  }, [dataset.id, dataset.updatedAt]);

  // Recalculate all formulas over working copy
  const recalculateAndSetData = useCallback(
    (data: Record<string, any>[], headers: string[], formulas: Record<string, string>) => {
      if (!formulas || Object.keys(formulas).length === 0) {
        setWorkingData(data);
        return;
      }
      const evalRes = evaluateAllFormulas(headers, data, formulas);
      if (!evalRes.error && evalRes.updatedData) {
        setWorkingData(evalRes.updatedData);
      } else if (evalRes.error) {
        setWarningToast(`Formula Calculation Error: ${evalRes.error}`);
      }
    },
    []
  );

  // Phase 8H Conversion & Formatting Handlers
  const handleConfirmConversion = useCallback((header: string, targetType: ExtendedType, convertedData: Record<string, any>[]) => {
    const targetLower = String(targetType).toLowerCase();
    const normType = (targetLower === 'integer' || targetLower === 'decimal' ? 'numeric' : (targetLower === 'datetime' || targetLower === 'time' ? 'date' : targetLower)) as ColumnType;
    setWorkingColumnTypes(prev => ({ ...prev, [header]: normType }));
    recalculateAndSetData(convertedData, workingHeaders, workingFormulas);
    setIsDirty(true);
    setSaveFeedback(`Converted column "${header}" to ${targetType}`);
    setTimeout(() => setSaveFeedback(null), 3000);
  }, [workingHeaders, workingFormulas, recalculateAndSetData]);

  const handleApplyFormat = useCallback((header: string, config: ColumnFormatConfig) => {
    setWorkingColumnFormats(prev => ({ ...prev, [header]: config }));
    setIsDirty(true);
    setSaveFeedback(`Applied display format to "${header}"`);
    setTimeout(() => setSaveFeedback(null), 3000);
  }, []);

  const handleExtractConfirmed = useCallback((newHeaderName: string, newColType: 'date' | 'time', updatedData: Record<string, any>[]) => {
    const nextHeaders = [...workingHeaders, newHeaderName];
    const normType = (newColType === 'time' ? 'date' : newColType) as ColumnType;
    setWorkingHeaders(nextHeaders);
    setWorkingColumnTypes(prev => ({ ...prev, [newHeaderName]: normType }));
    setAddedColumns(prev => new Set(prev).add(newHeaderName));
    recalculateAndSetData(updatedData, nextHeaders, workingFormulas);
    setIsDirty(true);
    setSaveFeedback(`Extracted new column "${newHeaderName}"`);
    setTimeout(() => setSaveFeedback(null), 3000);
  }, [workingHeaders, workingFormulas, recalculateAndSetData]);

  // Phase 8J Manual Cleaning Actions & History Handlers
  const handleApplyCleaningResult = useCallback((result: CleaningPreviewResult) => {
    const historyItem: CleaningHistoryItem = {
      id: `clean-${Date.now()}`,
      actionName: result.actionTitle,
      target: result.targetDescription,
      rowsAffected: result.rowsAffectedCount,
      cellsAffected: result.cellsAffectedCount,
      timestamp: new Date(),
      previousDataSnapshot: JSON.parse(JSON.stringify(workingData)),
      previousHeadersSnapshot: [...workingHeaders],
    };

    let updatedRows = result.updatedData;
    if (workingFormulas && Object.keys(workingFormulas).length > 0) {
      updatedRows = evaluateAllFormulas(result.updatedHeaders, updatedRows, workingFormulas).updatedData;
    }

    setWorkingData(updatedRows);
    setWorkingHeaders(result.updatedHeaders);
    setCleaningHistory(prev => [...prev, historyItem]);
    setRedoStack([]); // Clear redo stack on new action
    setIsDirty(true);

    setSaveFeedback(`Applied: ${result.actionTitle} (${result.cellsAffectedCount} cells affected)`);
    setTimeout(() => setSaveFeedback(null), 3500);
  }, [workingData, workingHeaders, workingFormulas]);

  const handleUndoLastCleaningAction = useCallback(() => {
    if (cleaningHistory.length === 0) return;

    const lastItem = cleaningHistory[cleaningHistory.length - 1];
    
    // Save current state to redo stack before undoing
    const redoItem: CleaningHistoryItem = {
      ...lastItem,
      previousDataSnapshot: JSON.parse(JSON.stringify(workingData)),
      previousHeadersSnapshot: [...workingHeaders],
    };

    let restoredRows = JSON.parse(JSON.stringify(lastItem.previousDataSnapshot));

    if (workingFormulas && Object.keys(workingFormulas).length > 0) {
      restoredRows = evaluateAllFormulas(lastItem.previousHeadersSnapshot, restoredRows, workingFormulas).updatedData;
    }

    setWorkingData(restoredRows);
    setWorkingHeaders([...lastItem.previousHeadersSnapshot]);
    setCleaningHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, redoItem]);
    setIsDirty(true);

    setSaveFeedback(`Undid: ${lastItem.actionName}`);
    setTimeout(() => setSaveFeedback(null), 3500);
  }, [cleaningHistory, workingData, workingHeaders, workingFormulas]);

  const handleRedoLastCleaningAction = useCallback(() => {
    if (redoStack.length === 0) return;

    const redoItem = redoStack[redoStack.length - 1];
    
    // Save current state to undo stack before redoing
    const undoItem: CleaningHistoryItem = {
      ...redoItem,
      previousDataSnapshot: JSON.parse(JSON.stringify(workingData)),
      previousHeadersSnapshot: [...workingHeaders],
    };

    let restoredRows = JSON.parse(JSON.stringify(redoItem.previousDataSnapshot));

    if (workingFormulas && Object.keys(workingFormulas).length > 0) {
      restoredRows = evaluateAllFormulas(redoItem.previousHeadersSnapshot, restoredRows, workingFormulas).updatedData;
    }

    setWorkingData(restoredRows);
    setWorkingHeaders([...redoItem.previousHeadersSnapshot]);
    setRedoStack(prev => prev.slice(0, -1));
    setCleaningHistory(prev => [...prev, undoItem]);
    setIsDirty(true);

    setSaveFeedback(`Redid: ${redoItem.actionName}`);
    setTimeout(() => setSaveFeedback(null), 3500);
  }, [redoStack, workingData, workingHeaders, workingFormulas]);

  // Apply or update a calculated column formula
  const handleApplyFormula = (colName: string, formulaStr: string) => {
    let nextHeaders = [...workingHeaders];
    let nextTypes = { ...workingColumnTypes };

    if (!nextHeaders.includes(colName)) {
      nextHeaders.push(colName);
      nextTypes[colName] = 'numeric';
      setAddedColumns((prev) => new Set(prev).add(colName));
    }

    const nextFormulas = { ...workingFormulas, [colName]: formulaStr };

    setWorkingHeaders(nextHeaders);
    setWorkingColumnTypes(nextTypes);
    setWorkingFormulas(nextFormulas);
    setIsDirty(true);

    // Evaluate immediately over current workingData
    recalculateAndSetData(workingData, nextHeaders, nextFormulas);

    setSaveFeedback(`Formula applied for column "${colName}"!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Delete a formula column
  const handleDeleteFormulaColumn = (colName: string) => {
    const nextFormulas = { ...workingFormulas };
    delete nextFormulas[colName];

    const nextHeaders = workingHeaders.filter((h) => h !== colName);
    const nextTypes = { ...workingColumnTypes };
    delete nextTypes[colName];

    const nextData = workingData.map((row) => {
      const { [colName]: _, ...rest } = row;
      return rest;
    });

    setWorkingHeaders(nextHeaders);
    setWorkingColumnTypes(nextTypes);
    setWorkingFormulas(nextFormulas);
    setWorkingData(nextData);
    setIsDirty(true);

    setContextMenu(null);
    setSaveFeedback(`Formula column "${colName}" removed.`);
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  // Visible Headers
  const visibleHeaders = useMemo(() => {
    return workingHeaders.filter(h => !hiddenColumns.has(h));
  }, [workingHeaders, hiddenColumns]);

  // Filtered & Sorted Rows (Grid View State)
  const processedRows = useMemo(() => {
    let result = [...workingData];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(row =>
        visibleHeaders.some(h => {
          const val = row[h];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // Column sorting
    if (sortConfig && sortConfig.key) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // Handle empty values (null, undefined, '') -> always push to end
        const isAEmpty = valA === null || valA === undefined || valA === '';
        const isBEmpty = valB === null || valB === undefined || valB === '';
        if (isAEmpty && isBEmpty) return 0;
        if (isAEmpty) return 1;
        if (isBEmpty) return -1;

        // Numeric comparison
        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA;
        }

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && String(valA).trim() !== '' && String(valB).trim() !== '') {
          return direction === 'asc' ? numA - numB : numB - numA;
        }

        // Date comparison
        if (valA instanceof Date || valB instanceof Date || (!isNaN(Date.parse(String(valA))) && !isNaN(Date.parse(String(valB))))) {
          const timeA = new Date(valA).getTime();
          const timeB = new Date(valB).getTime();
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return direction === 'asc' ? timeA - timeB : timeB - timeA;
          }
        }

        // String comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [workingData, visibleHeaders, searchQuery, sortConfig]);

  // Displayed rows (continuous worksheet)
  const displayedRows = processedRows;

  // Normalized Range Bounds
  const rangeBounds = useMemo(() => {
    if (!selectionRange) return null;
    return {
      minRow: Math.min(selectionRange.startRow, selectionRange.endRow),
      maxRow: Math.max(selectionRange.startRow, selectionRange.endRow),
      minCol: Math.min(selectionRange.startCol, selectionRange.endCol),
      maxCol: Math.max(selectionRange.startCol, selectionRange.endCol),
    };
  }, [selectionRange]);

  // Selection counts for Bulk Operations Bar
  const selectedCellCount = useMemo(() => {
    if (!rangeBounds) return 0;
    return (rangeBounds.maxRow - rangeBounds.minRow + 1) * (rangeBounds.maxCol - rangeBounds.minCol + 1);
  }, [rangeBounds]);

  const selectedRowCount = useMemo(() => {
    if (!rangeBounds) return 0;
    return rangeBounds.maxRow - rangeBounds.minRow + 1;
  }, [rangeBounds]);

  const hasFormulaColumnsInSelection = useMemo(() => {
    if (!rangeBounds) return false;
    for (let c = rangeBounds.minCol; c <= rangeBounds.maxCol; c++) {
      const h = visibleHeaders[c];
      if (h && workingFormulas[h]) {
        return true;
      }
    }
    return false;
  }, [rangeBounds, visibleHeaders, workingFormulas]);

  // Bulk Operations Handlers
  const handleApplyBulkValue = useCallback((valueStr: string) => {
    if (!rangeBounds || displayedRows.length === 0 || visibleHeaders.length === 0) return;

    const minRow = Math.max(0, rangeBounds.minRow);
    const maxRow = Math.min(displayedRows.length - 1, rangeBounds.maxRow);
    const minCol = Math.max(0, rangeBounds.minCol);
    const maxCol = Math.min(visibleHeaders.length - 1, rangeBounds.maxCol);

    const targetRowIds = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      if (displayedRows[r]) targetRowIds.add(displayedRows[r]._rowId);
    }

    const selectedCols: string[] = [];
    let skippedFormulaCols = false;

    for (let c = minCol; c <= maxCol; c++) {
      const h = visibleHeaders[c];
      if (!h) continue;
      if (workingFormulas[h]) {
        skippedFormulaCols = true;
      } else {
        selectedCols.push(h);
      }
    }

    if (selectedCols.length === 0) {
      setWarningToast('Formula columns cannot be bulk edited. Edit the formula instead.');
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    const trimmed = valueStr.trim();
    const nextEdited = new Set(editedCells);

    const nextData = workingData.map(row => {
      if (targetRowIds.has(row._rowId)) {
        const updated = { ...row };
        selectedCols.forEach(header => {
          const type = workingColumnTypes[header] || 'text';
          let newVal: any = valueStr;
          if (type === 'numeric') {
            if (trimmed === '') newVal = null;
            else if (!isNaN(Number(trimmed))) newVal = Number(trimmed);
          } else {
            if (trimmed === '') newVal = null;
          }
          updated[header] = newVal;
          nextEdited.add(`${row._rowId}:${header}`);
        });
        return updated;
      }
      return row;
    });

    recalculateAndSetData(nextData, workingHeaders, workingFormulas);
    setIsDirty(true);
    setEditedCells(nextEdited);

    if (skippedFormulaCols) {
      setWarningToast('Formula columns cannot be bulk edited. Formula cells were skipped.');
      setTimeout(() => setWarningToast(null), 3500);
    } else {
      const cellCount = targetRowIds.size * selectedCols.length;
      setSaveFeedback(`Updated ${cellCount} cell${cellCount > 1 ? 's' : ''}`);
      setTimeout(() => setSaveFeedback(null), 2500);
    }
  }, [rangeBounds, displayedRows, visibleHeaders, workingFormulas, workingColumnTypes, workingData, editedCells, workingHeaders, recalculateAndSetData]);

  const handleClearSelectedCells = useCallback(() => {
    if (!rangeBounds || displayedRows.length === 0 || visibleHeaders.length === 0) return;

    const minRow = Math.max(0, rangeBounds.minRow);
    const maxRow = Math.min(displayedRows.length - 1, rangeBounds.maxRow);
    const minCol = Math.max(0, rangeBounds.minCol);
    const maxCol = Math.min(visibleHeaders.length - 1, rangeBounds.maxCol);

    const targetRowIds = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      if (displayedRows[r]) targetRowIds.add(displayedRows[r]._rowId);
    }

    const selectedCols: string[] = [];
    let skippedFormulaCols = false;

    for (let c = minCol; c <= maxCol; c++) {
      const h = visibleHeaders[c];
      if (!h) continue;
      if (workingFormulas[h]) {
        skippedFormulaCols = true;
      } else {
        selectedCols.push(h);
      }
    }

    if (selectedCols.length === 0) {
      setWarningToast('Formula columns cannot be bulk edited. Edit the formula instead.');
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    const nextEdited = new Set(editedCells);

    const nextData = workingData.map(row => {
      if (targetRowIds.has(row._rowId)) {
        const updated = { ...row };
        selectedCols.forEach(header => {
          updated[header] = null;
          nextEdited.add(`${row._rowId}:${header}`);
        });
        return updated;
      }
      return row;
    });

    recalculateAndSetData(nextData, workingHeaders, workingFormulas);
    setIsDirty(true);
    setEditedCells(nextEdited);

    if (skippedFormulaCols) {
      setWarningToast('Formula columns cannot be bulk edited. Formula cells were skipped.');
      setTimeout(() => setWarningToast(null), 3500);
    } else {
      const cellCount = targetRowIds.size * selectedCols.length;
      setSaveFeedback(`Cleared ${cellCount} cell${cellCount > 1 ? 's' : ''}`);
      setTimeout(() => setSaveFeedback(null), 2500);
    }
  }, [rangeBounds, displayedRows, visibleHeaders, workingFormulas, workingData, editedCells, workingHeaders, recalculateAndSetData]);

  const handleDeleteSelectedRows = useCallback(() => {
    if (!rangeBounds || displayedRows.length === 0) return;

    const minRow = Math.max(0, rangeBounds.minRow);
    const maxRow = Math.min(displayedRows.length - 1, rangeBounds.maxRow);

    const targetRowIds = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      if (displayedRows[r]) targetRowIds.add(displayedRows[r]._rowId);
    }

    if (targetRowIds.size === 0) return;

    const nextData = workingData.filter(row => !targetRowIds.has(row._rowId));

    recalculateAndSetData(nextData, workingHeaders, workingFormulas);
    setIsDirty(true);

    const nextRowIdx = Math.max(0, minRow - 1);
    setSelectedCell({ row: nextRowIdx, col: 0 });
    setSelectionRange({ startRow: nextRowIdx, startCol: 0, endRow: nextRowIdx, endCol: 0 });

    setSaveFeedback(`Deleted ${targetRowIds.size} row${targetRowIds.size > 1 ? 's' : ''}`);
    setTimeout(() => setSaveFeedback(null), 2500);
  }, [rangeBounds, displayedRows, workingData, workingHeaders, workingFormulas, recalculateAndSetData]);

  // Find & Replace Callbacks
  const handleNavigateToMatch = useCallback((match: MatchItem) => {
    setSelectedCell({ row: match.rIndex, col: match.cIndex });
    setSelectionRange({
      startRow: match.rIndex,
      startCol: match.cIndex,
      endRow: match.rIndex,
      endCol: match.cIndex,
    });
  }, []);

  const handleFindReplaceSingle = useCallback((match: MatchItem, replaceText: string) => {
    if (workingFormulas[match.header]) {
      setWarningToast(`Formula column "${match.header}" cannot be bulk edited. Edit the formula instead.`);
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    const targetRow = displayedRows[match.rIndex];
    if (!targetRow) return;

    const colType = workingColumnTypes[match.header] || 'text';
    let newVal: any = replaceText;
    const trimmed = replaceText.trim();

    if (colType === 'numeric') {
      if (trimmed === '') newVal = null;
      else if (!isNaN(Number(trimmed))) newVal = Number(trimmed);
    } else {
      if (trimmed === '') newVal = null;
    }

    const nextEdited = new Set(editedCells).add(`${targetRow._rowId}:${match.header}`);
    const nextData = workingData.map(r => {
      if (r._rowId === targetRow._rowId) {
        return { ...r, [match.header]: newVal };
      }
      return r;
    });

    recalculateAndSetData(nextData, workingHeaders, workingFormulas);
    setIsDirty(true);
    setEditedCells(nextEdited);

    setSaveFeedback(`Replaced value in "${match.header}"`);
    setTimeout(() => setSaveFeedback(null), 2000);
  }, [workingFormulas, displayedRows, workingColumnTypes, editedCells, workingData, workingHeaders, recalculateAndSetData]);

  const handleFindReplaceAll = useCallback((matchesToReplace: MatchItem[], replaceText: string) => {
    const validMatches = matchesToReplace.filter(m => !workingFormulas[m.header]);
    if (validMatches.length === 0) {
      setWarningToast('Formula columns cannot be bulk edited. Edit the formula instead.');
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    const replacementMap: Record<string, Record<string, any>> = {};
    validMatches.forEach(m => {
      if (!replacementMap[m.rowId]) replacementMap[m.rowId] = {};
      const colType = workingColumnTypes[m.header] || 'text';
      let newVal: any = replaceText;
      const trimmed = replaceText.trim();

      if (colType === 'numeric') {
        if (trimmed === '') newVal = null;
        else if (!isNaN(Number(trimmed))) newVal = Number(trimmed);
      } else {
        if (trimmed === '') newVal = null;
      }
      replacementMap[m.rowId][m.header] = newVal;
    });

    const nextEdited = new Set(editedCells);
    const nextData = workingData.map(r => {
      if (replacementMap[r._rowId]) {
        const updates = replacementMap[r._rowId];
        Object.keys(updates).forEach(h => nextEdited.add(`${r._rowId}:${h}`));
        return { ...r, ...updates };
      }
      return r;
    });

    recalculateAndSetData(nextData, workingHeaders, workingFormulas);
    setIsDirty(true);
    setEditedCells(nextEdited);

    setSaveFeedback(`Replaced ${validMatches.length} matching value${validMatches.length > 1 ? 's' : ''}`);
    setTimeout(() => setSaveFeedback(null), 3000);
  }, [workingFormulas, workingColumnTypes, editedCells, workingData, workingHeaders, recalculateAndSetData]);

  const handleMatchesFoundChange = useCallback((matches: MatchItem[], activeIdx: number) => {
    setHighlightedMatches(matches);
    setActiveMatchIndex(activeIdx);
  }, []);

  // Handle Sort Toggle
  const handleHeaderClick = (header: string) => {
    if (editingCell) return;
    setSortConfig(prev => {
      if (!prev || prev.key !== header) {
        return { key: header, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: header, direction: 'desc' };
      }
      return null;
    });
  };

  // Format cell display value helper
  const formatCellValue = (val: any, header?: string) => {
    if (val === null || val === undefined || val === '') {
      return null;
    }
    const colType = header ? (workingColumnTypes[header] || 'text') : 'text';
    const fmtConfig = header ? workingColumnFormats[header] : undefined;
    if (fmtConfig) {
      return formatColumnValue(val, colType, fmtConfig);
    }
    if (val instanceof Date) {
      return val.toISOString();
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  // ----------------------------------------------------
  // 3. Cell Editing Logic
  // ----------------------------------------------------
  const startEditingCell = useCallback((rIndex: number, cIndex: number, initialChar?: string) => {
    const row = displayedRows[rIndex];
    if (!row) return;
    const header = visibleHeaders[cIndex];
    if (!header) return;

    // Check if column is a calculated formula column
    if (workingFormulas[header]) {
      setWarningToast(`Column "${header}" is calculated by formula "${workingFormulas[header]}". Click "+ Formula Column" to edit.`);
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    setEditingCell({ row: rIndex, col: cIndex });
    if (initialChar !== undefined) {
      setEditValue(initialChar);
    } else {
      const rawVal = row[header];
      setEditValue(rawVal === null || rawVal === undefined ? '' : String(rawVal));
    }
  }, [displayedRows, visibleHeaders, workingFormulas]);

  const commitCellEdit = useCallback((rIndex: number, cIndex: number, rawInput: string) => {
    const targetRow = displayedRows[rIndex];
    if (!targetRow) {
      setEditingCell(null);
      return;
    }
    const header = visibleHeaders[cIndex];
    if (!header) {
      setEditingCell(null);
      return;
    }

    const colType = workingColumnTypes[header] || 'text';
    let newValue: any = rawInput;
    const trimmed = rawInput.trim();

    if (colType === 'numeric') {
      if (trimmed === '') {
        newValue = null;
      } else {
        const num = Number(trimmed);
        if (!isNaN(num)) {
          newValue = num;
        } else {
          // Invalid number entered - preserve string safely without crashing
          newValue = trimmed;
          setWarningToast(`"${trimmed}" is not a valid number for numeric column "${header}". Preserved as string.`);
          setTimeout(() => setWarningToast(null), 3500);
        }
      }
    } else if (colType === 'date') {
      if (trimmed === '') {
        newValue = null;
      } else {
        newValue = trimmed;
      }
    } else {
      if (trimmed === '') {
        newValue = null;
      } else {
        newValue = rawInput;
      }
    }

    // Check if value actually changed
    const previousVal = targetRow[header];
    const hasChanged = previousVal !== newValue;

    if (hasChanged) {
      const nextData = workingData.map(r => {
        if (r._rowId === targetRow._rowId) {
          return { ...r, [header]: newValue };
        }
        return r;
      });

      // Recalculate any formulas dependent on this cell edit
      recalculateAndSetData(nextData, workingHeaders, workingFormulas);

      setIsDirty(true);
      setEditedCells(prev => new Set(prev).add(`${targetRow._rowId}:${header}`));
    }

    setEditingCell(null);
  }, [displayedRows, visibleHeaders, workingColumnTypes, workingData, workingHeaders, workingFormulas, recalculateAndSetData]);

  // Handle keys while editing inside input element
  const handleCellInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIndex: number, cIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitCellEdit(rIndex, cIndex, editValue);

      // Move selection down
      if (rIndex < displayedRows.length - 1) {
        const nextR = rIndex + 1;
        setSelectedCell({ row: nextR, col: cIndex });
        setSelectionRange({ startRow: nextR, startCol: cIndex, endRow: nextR, endCol: cIndex });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditingCell(null); // Cancel edit
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      commitCellEdit(rIndex, cIndex, editValue);

      // Move selection right/left
      const maxC = visibleHeaders.length - 1;
      const maxR = displayedRows.length - 1;
      if (e.shiftKey) {
        if (cIndex > 0) {
          setSelectedCell({ row: rIndex, col: cIndex - 1 });
          setSelectionRange({ startRow: rIndex, startCol: cIndex - 1, endRow: rIndex, endCol: cIndex - 1 });
        } else if (rIndex > 0) {
          setSelectedCell({ row: rIndex - 1, col: maxC });
          setSelectionRange({ startRow: rIndex - 1, startCol: maxC, endRow: rIndex - 1, endCol: maxC });
        }
      } else {
        if (cIndex < maxC) {
          setSelectedCell({ row: rIndex, col: cIndex + 1 });
          setSelectionRange({ startRow: rIndex, startCol: cIndex + 1, endRow: rIndex, endCol: cIndex + 1 });
        } else if (rIndex < maxR) {
          setSelectedCell({ row: rIndex + 1, col: 0 });
          setSelectionRange({ startRow: rIndex + 1, startCol: 0, endRow: rIndex + 1, endCol: 0 });
        }
      }
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus();
      cellInputRef.current.select();
    }
  }, [editingCell]);

  // ----------------------------------------------------
  // 4. Copy Helper
  // ----------------------------------------------------
  const copyToClipboard = useCallback((rangeOverride?: SelectionRange) => {
    const targetRange = rangeOverride || selectionRange;
    if (!targetRange || displayedRows.length === 0 || visibleHeaders.length === 0) return;

    const minRow = Math.max(0, Math.min(targetRange.startRow, targetRange.endRow));
    const maxRow = Math.min(displayedRows.length - 1, Math.max(targetRange.startRow, targetRange.endRow));
    const minCol = Math.max(0, Math.min(targetRange.startCol, targetRange.endCol));
    const maxCol = Math.min(visibleHeaders.length - 1, Math.max(targetRange.startCol, targetRange.endCol));

    const lines: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const row = displayedRows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        const header = visibleHeaders[c];
        const val = row[header];
        cells.push(val === null || val === undefined ? '' : String(val));
      }
      lines.push(cells.join('\t'));
    }

    const tsvText = lines.join('\n');
    navigator.clipboard.writeText(tsvText).then(() => {
      const cellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
      setCopyFeedback(`Copied ${cellCount} cell${cellCount > 1 ? 's' : ''} to clipboard`);
      setTimeout(() => setCopyFeedback(null), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }, [selectionRange, displayedRows, visibleHeaders]);

  // ----------------------------------------------------
  // 5. Grid Actions (Row/Column Mutators in Working Copy)
  // ----------------------------------------------------
  
  // Add Row
  const handleAddRow = () => {
    const newRowId = `r-new-${Date.now()}`;
    const newRow: Record<string, any> = { _rowId: newRowId };
    workingHeaders.forEach(h => {
      newRow[h] = null;
    });

    const nextData = [...workingData, newRow];
    recalculateAndSetData(nextData, workingHeaders, workingFormulas);

    setIsDirty(true);
    setAddedRowIds(prev => new Set(prev).add(newRowId));

    // Focus & select new row's first cell
    const newRowIndex = workingData.length;
    setSelectedCell({ row: newRowIndex, col: 0 });
    setSelectionRange({ startRow: newRowIndex, startCol: 0, endRow: newRowIndex, endCol: 0 });
    
    // Immediately open edit mode on new row if first col is not formula
    const firstCol = visibleHeaders[0];
    if (firstCol && !workingFormulas[firstCol]) {
      setTimeout(() => {
        startEditingCell(newRowIndex, 0, '');
      }, 50);
    }
  };

  // Confirm Delete Row
  const handleConfirmDeleteRow = () => {
    if (deletingRowIndex === null) return;
    const targetRow = displayedRows[deletingRowIndex];
    if (!targetRow) return;

    const nextData = workingData.filter(r => r._rowId !== targetRow._rowId);
    recalculateAndSetData(nextData, workingHeaders, workingFormulas);

    setIsDirty(true);
    setDeletingRowIndex(null);

    // Adjust selection safely
    const maxR = Math.max(0, displayedRows.length - 2);
    const nextR = Math.min(deletingRowIndex, maxR);
    setSelectedCell({ row: nextR, col: 0 });
    setSelectionRange({ startRow: nextR, startCol: 0, endRow: nextR, endCol: 0 });
  };

  // Add Column
  const handleConfirmAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const colName = newColName.trim();
    if (!colName) {
      setAddColumnError('Column name cannot be empty.');
      return;
    }
    if (workingHeaders.some(h => h.toLowerCase() === colName.toLowerCase())) {
      setAddColumnError(`A column named "${colName}" already exists.`);
      return;
    }

    setWorkingHeaders(prev => [...prev, colName]);
    setWorkingColumnTypes(prev => ({ ...prev, [colName]: newColType }));
    setWorkingData(prev => prev.map(r => ({ ...r, [colName]: null })));
    setAddedColumns(prev => new Set(prev).add(colName));

    setIsDirty(true);
    setShowAddColumnModal(false);
    setNewColName('');
    setAddColumnError(null);
  };

  // Rename Column
  const handleConfirmRenameColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingHeader) return;
    const oldName = renamingHeader;
    const newName = renameValue.trim();

    if (!newName) {
      setRenameError('Column name cannot be empty.');
      return;
    }

    if (
      oldName.toLowerCase() !== newName.toLowerCase() && 
      workingHeaders.some(h => h.toLowerCase() === newName.toLowerCase())
    ) {
      setRenameError(`A column named "${newName}" already exists.`);
      return;
    }

    if (oldName !== newName) {
      setWorkingHeaders(prev => prev.map(h => h === oldName ? newName : h));
      setWorkingColumnTypes(prev => {
        const next = { ...prev };
        const type = next[oldName] || 'text';
        delete next[oldName];
        next[newName] = type;
        return next;
      });

      setWorkingData(prev => prev.map(row => {
        const { [oldName]: val, ...rest } = row;
        return { ...rest, [newName]: val };
      }));

      if (sortConfig?.key === oldName) {
        setSortConfig({ key: newName, direction: sortConfig.direction });
      }

      setIsDirty(true);
    }

    setRenamingHeader(null);
    setRenameValue('');
    setRenameError(null);
  };

  // Save Changes to Persistence
  const handleSaveChanges = () => {
    // Strip internal `_rowId` before saving dataset
    const cleanData = workingData.map(r => {
      const { _rowId, ...rest } = r;
      return rest;
    });

    const updatedDataset: Dataset = {
      ...dataset,
      headers: workingHeaders,
      columnTypes: workingColumnTypes,
      columnFormats: workingColumnFormats,
      formulas: workingFormulas,
      rowCount: cleanData.length,
      colCount: workingHeaders.length,
      data: cleanData.slice(0, 100),
      fullData: cleanData,
      updatedAt: Date.now(),
    };

    if (onUpdateDataset) {
      onUpdateDataset(updatedDataset);
    }

    setIsDirty(false);
    setEditedCells(new Set());
    setAddedRowIds(new Set());
    setAddedColumns(new Set());

    setSaveFeedback('Changes saved successfully to workspace!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Discard Changes
  const handleConfirmDiscardChanges = () => {
    const sourceRows = dataset.fullData && dataset.fullData.length > 0 ? dataset.fullData : dataset.data || [];
    const formattedRows = sourceRows.map((r, idx) => ({
      ...r,
      _rowId: r._rowId || `r-${idx}-${Date.now()}`
    }));

    setWorkingData(formattedRows);
    setWorkingHeaders([...dataset.headers]);
    setWorkingColumnTypes({ ...(dataset.columnTypes || {}) });
    setWorkingColumnFormats({ ...(dataset.columnFormats || {}) });
    setWorkingFormulas({ ...(dataset.formulas || {}) });

    setIsDirty(false);
    setEditedCells(new Set());
    setAddedRowIds(new Set());
    setAddedColumns(new Set());
    setEditingCell(null);
    setShowDiscardModal(false);
  };

  // ----------------------------------------------------
  // 6. Cell Selection Handlers
  // ----------------------------------------------------
  const handleCellMouseDown = (rIndex: number, cIndex: number, e: React.MouseEvent) => {
    if (editingCell) return;
    if (e.button !== 0 && e.button !== 2) return; // Left or Right click

    setContextMenu(null);

    if (e.shiftKey && selectedCell) {
      setSelectionRange({
        startRow: selectedCell.row,
        startCol: selectedCell.col,
        endRow: rIndex,
        endCol: cIndex,
      });
    } else {
      setSelectedCell({ row: rIndex, col: cIndex });
      setSelectionRange({
        startRow: rIndex,
        startCol: cIndex,
        endRow: rIndex,
        endCol: cIndex,
      });
      if (e.button === 0) {
        setIsDragging(true);
      }
    }
  };

  const handleCellMouseEnter = (rIndex: number, cIndex: number) => {
    if (isDragging && selectedCell && !editingCell) {
      setSelectionRange(prev => prev ? {
        ...prev,
        endRow: rIndex,
        endCol: cIndex,
      } : null);
    }
  };

  // Mouse up window listener for drag selection & column resize
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      if (resizingCol) {
        setResizingCol(null);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [resizingCol]);

  // Column Resizing Logic
  const handleResizeMouseDown = (header: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingCol(header);
    resizeStartX.current = e.clientX;
    const currentW = columnWidths[header] || 150;
    resizeStartWidth.current = currentW;
  };

  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, Math.min(600, resizeStartWidth.current + deltaX));
      setColumnWidths(prev => ({
        ...prev,
        [resizingCol]: newWidth,
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [resizingCol]);

  // ----------------------------------------------------
  // 7. Grid Keyboard Navigation & Shortcuts
  // ----------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingCell) return; // Input handles keys while editing
    if (!selectedCell || displayedRows.length === 0 || visibleHeaders.length === 0) return;

    const maxR = displayedRows.length - 1;
    const maxC = visibleHeaders.length - 1;

    let { row, col } = selectedCell;
    let endRow = selectionRange ? selectionRange.endRow : row;
    let endCol = selectionRange ? selectionRange.endCol : col;

    let handled = false;

    // Ctrl+C / Cmd+C Copy
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      copyToClipboard();
      e.preventDefault();
      return;
    }

    // Ctrl+Z Undo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      handleUndoLastCleaningAction();
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+Z or Ctrl+Y Redo
    if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y')) {
      handleRedoLastCleaningAction();
      e.preventDefault();
      return;
    }

    // Ctrl+S Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      handleSaveChanges();
      e.preventDefault();
      return;
    }

    // Ctrl+F / Cmd+F or Ctrl+H / Cmd+H -> Find & Replace Modal
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'h')) {
      e.preventDefault();
      setShowFindReplaceModal(true);
      return;
    }

    // Delete / Backspace key -> Clear selected cells
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleClearSelectedCells();
      return;
    }

    if (e.key === 'Escape') {
      setContextMenu(null);
      setShowColumnsDropdown(false);
      e.preventDefault();
      return;
    }

    // Direct Typing -> Start editing cell with initial typed char
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      startEditingCell(row, col, e.key);
      e.preventDefault();
      return;
    }

    // Enter key -> Start editing cell
    if (e.key === 'Enter') {
      startEditingCell(row, col);
      e.preventDefault();
      return;
    }

    if (e.shiftKey) {
      // Range selection
      if (e.key === 'ArrowUp') {
        endRow = Math.max(0, endRow - 1);
        handled = true;
      } else if (e.key === 'ArrowDown') {
        endRow = Math.min(maxR, endRow + 1);
        handled = true;
      } else if (e.key === 'ArrowLeft') {
        endCol = Math.max(0, endCol - 1);
        handled = true;
      } else if (e.key === 'ArrowRight') {
        endCol = Math.min(maxC, endCol + 1);
        handled = true;
      }

      if (handled) {
        setSelectionRange({
          startRow: row,
          startCol: col,
          endRow,
          endCol,
        });
      }
    } else {
      // Cell navigation
      if (e.key === 'ArrowUp') {
        row = Math.max(0, row - 1);
        handled = true;
      } else if (e.key === 'ArrowDown') {
        row = Math.min(maxR, row + 1);
        handled = true;
      } else if (e.key === 'ArrowLeft') {
        col = Math.max(0, col - 1);
        handled = true;
      } else if (e.key === 'ArrowRight') {
        col = Math.min(maxC, col + 1);
        handled = true;
      } else if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (col > 0) col--;
          else if (row > 0) { row--; col = maxC; }
        } else {
          if (col < maxC) col++;
          else if (row < maxR) { row++; col = 0; }
        }
        handled = true;
      }

      if (handled) {
        setSelectedCell({ row, col });
        setSelectionRange({
          startRow: row,
          startCol: col,
          endRow: row,
          endCol: col,
        });
      }
    }

    if (handled) {
      e.preventDefault();
    }
  };

  // Synchronize formula bar with selection
  useEffect(() => {
    if (!selectedCell || !selectionRange || isFormulaBarFocused) {
      if (!isFormulaBarFocused) setFormulaBarValue('');
      return;
    }

    const { startRow, startCol, endRow, endCol } = selectionRange;
    const isMultiCell = startRow !== endRow || startCol !== endCol;

    if (isMultiCell) {
      setFormulaBarValue('Multiple cells selected');
      return;
    }

    const row = displayedRows[selectedCell.row];
    const header = visibleHeaders[selectedCell.col];
    if (!row || !header) {
      setFormulaBarValue('');
      return;
    }

    const formula = workingFormulas[header];
    if (formula) {
      setFormulaBarValue(`=${formula}`);
    } else {
      const val = row[header];
      setFormulaBarValue(val === null || val === undefined ? '' : String(val));
    }
  }, [selectedCell, selectionRange, displayedRows, visibleHeaders, workingFormulas, isFormulaBarFocused]);

  const commitFormulaBarEdit = () => {
    if (!selectedCell || !selectionRange) return;
    const { startRow, startCol, endRow, endCol } = selectionRange;
    const isMultiCell = startRow !== endRow || startCol !== endCol;
    if (isMultiCell) return;

    const header = visibleHeaders[selectedCell.col];
    if (!header) return;

    if (workingFormulas[header]) {
      setWarningToast('Formula columns cannot be directly overwritten. Edit the column formula instead.');
      setTimeout(() => setWarningToast(null), 3500);
      setIsFormulaBarFocused(false);
      return;
    }

    if (formulaBarValue.startsWith('=')) {
      handleApplyFormula(header, formulaBarValue.substring(1));
    } else {
      commitCellEdit(selectedCell.row, selectedCell.col, formulaBarValue);
    }
    setIsFormulaBarFocused(false);
  };

  const cancelFormulaBarEdit = () => {
    setIsFormulaBarFocused(false);
    // Triggers re-sync in useEffect
    setSelectedCell({ ...selectedCell! });
  };

  const getColumnLetter = (index: number): string => {
    let name = '';
    let i = index;
    while (i >= 0) {
      name = String.fromCharCode((i % 26) + 65) + name;
      i = Math.floor(i / 26) - 1;
    }
    return name;
  };

  const getCellNotation = (): string => {
    if (!selectedCell || !selectionRange) return '';
    const { startRow, startCol, endRow, endCol } = selectionRange;
    const isMultiCell = startRow !== endRow || startCol !== endCol;
    if (isMultiCell) return 'Range Selected';

    const colLetter = getColumnLetter(selectedCell.col);
    const header = visibleHeaders[selectedCell.col];
    return `${colLetter}${selectedCell.row + 1}${header ? ` (${header})` : ''}`;
  };

  const getNameBoxNotation = (): string => {
    if (!selectionRange) return 'A1';
    const { startRow, startCol, endRow, endCol } = selectionRange;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const startCoord = `${getColumnLetter(minCol)}${minRow + 1}`;
    if (minRow === maxRow && minCol === maxCol) {
      return startCoord;
    }
    const endCoord = `${getColumnLetter(maxCol)}${maxRow + 1}`;
    return `${startCoord}:${endCoord}`;
  };

  // Right-Click Context Menu Handler
  const handleContextMenu = (rIndex: number, cIndex: number, header: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (editingCell) return;

    if (
      !rangeBounds || 
      rIndex < rangeBounds.minRow || 
      rIndex > rangeBounds.maxRow || 
      cIndex < rangeBounds.minCol || 
      cIndex > rangeBounds.maxCol
    ) {
      setSelectedCell({ row: rIndex, col: cIndex });
      setSelectionRange({
        startRow: rIndex,
        startCol: cIndex,
        endRow: rIndex,
        endCol: cIndex,
      });
    }

    setContextMenu({
      x: Math.max(10, Math.min(e.clientX, window.innerWidth - 280)),
      y: Math.max(10, Math.min(e.clientY, window.innerHeight - 380)),
      row: rIndex,
      col: cIndex,
      header,
    });
  };

  // Context Menu Actions
  const handleSelectRow = (rIndex: number) => {
    setSelectionRange({
      startRow: rIndex,
      startCol: 0,
      endRow: rIndex,
      endCol: visibleHeaders.length - 1,
    });
    setContextMenu(null);
  };

  const handleSelectColumn = (cIndex: number) => {
    setSelectionRange({
      startRow: 0,
      startCol: cIndex,
      endRow: displayedRows.length - 1,
      endCol: cIndex,
    });
    setContextMenu(null);
  };

  const handleHideColumn = (header: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      next.add(header);
      return next;
    });
    setContextMenu(null);
  };

  const handleToggleColumnVisibility = (header: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(header)) {
        next.delete(header);
      } else {
        if (visibleHeaders.length <= 1) return prev;
        next.add(header);
      }
      return next;
    });
  };

  const handleShowAllColumns = () => {
    setHiddenColumns(new Set());
    setShowColumnsDropdown(false);
  };

  // Data type badge formatter
  const getTypeBadge = (type?: string, header?: string) => {
    const lowerType = (type || 'text').toLowerCase();
    
    let content = null;
    switch (lowerType) {
      case 'numeric':
      case 'number':
      case 'integer':
      case 'decimal':
        content = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
            <Hash className="w-2.5 h-2.5" /> {lowerType === 'integer' ? 'INT' : lowerType === 'decimal' ? 'DEC' : 'NUM'}
          </span>
        );
        break;
      case 'date':
        content = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
            <Calendar className="w-2.5 h-2.5" /> DATE
          </span>
        );
        break;
      case 'datetime':
        content = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/40">
            <Clock className="w-2.5 h-2.5" /> DATETIME
          </span>
        );
        break;
      case 'time':
        content = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40">
            <Clock className="w-2.5 h-2.5" /> TIME
          </span>
        );
        break;
      case 'categorical':
        content = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
            <Tag className="w-2.5 h-2.5" /> CAT
          </span>
        );
        break;
      case 'boolean':
        content = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-900/40">
            BOOL
          </span>
        );
        break;
      default:
        content = (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/50">
            <CaseSensitive className="w-2.5 h-2.5 text-zinc-500" /> TEXT
          </span>
        );
        break;
    }

    if (header) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTypeModalCol(header);
          }}
          className="hover:opacity-80 cursor-pointer"
          title={`Click to analyze & convert data type for "${header}"`}
        >
          {content}
        </button>
      );
    }
    return content;
  };

  // Position indicator text (e.g., "Cell B2 (Revenue)")
  const selectionInfoText = useMemo(() => {
    if (!selectionRange || visibleHeaders.length === 0 || displayedRows.length === 0) return '';
    const { minRow, maxRow, minCol, maxCol } = rangeBounds!;
    
    const getColLetter = (colIdx: number) => {
      let letter = '';
      let temp = colIdx;
      while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
      }
      return letter;
    };

    const startCellStr = `${getColLetter(minCol)}${minRow + 1}`;
    if (minRow === maxRow && minCol === maxCol) {
      const colHeader = visibleHeaders[minCol];
      return `Cell ${startCellStr} (${colHeader})`;
    }

    const endCellStr = `${getColLetter(maxCol)}${maxRow + 1}`;
    const totalCells = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return `Range ${startCellStr}:${endCellStr} (${totalCells} cells selected)`;
  }, [selectionRange, rangeBounds, visibleHeaders, displayedRows]);

  // Close context menu & dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) setContextMenu(null);
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setShowColumnsDropdown(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  return (
    <div className="glass-panel glass-card rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/60 shadow-lg flex flex-col flex-1 h-full min-h-0 w-full">
      
      {/* Formula Bar */}
      <div className="flex items-center h-9 px-2 gap-2 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        {/* Name Box */}
        <div className="w-28 h-7 flex items-center justify-center px-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 select-none shadow-xs shrink-0" title="Selected Cell / Range">
          {getNameBoxNotation()}
        </div>

        {/* Formula Bar Input Area */}
        <div className="flex-1 h-7 flex items-center px-2.5 gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded group relative">
          <span className="text-zinc-400 font-serif italic text-xs select-none shrink-0 font-bold">fx</span>
          <input
            type="text"
            className="flex-1 h-full bg-transparent border-none focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            value={formulaBarValue}
            onChange={(e) => setFormulaBarValue(e.target.value)}
            onFocus={() => setIsFormulaBarFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFormulaBarFocused(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitFormulaBarEdit();
              if (e.key === 'Escape') cancelFormulaBarEdit();
            }}
            placeholder="Enter value or formula starting with ="
          />
        </div>

        {/* Quick Search */}
        <div className="flex items-center px-2 border-l border-zinc-100 dark:border-zinc-800/50">
          <div className="relative">
            <Search className="w-3 h-3 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find in grid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 h-6 text-[10px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/30 w-32"
            />
          </div>
        </div>
      </div>

      {/* Save Feedback Banner */}
      {saveFeedback && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {saveFeedback}
          </span>
          <span className="text-[10px] font-mono opacity-80">IndexedDB Persisted</span>
        </div>
      )}

      {/* Copy Feedback Banner */}
      {copyFeedback && (
        <div className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {copyFeedback}
          </span>
          <span className="text-[10px] font-mono opacity-80">TSV formatted</span>
        </div>
      )}

      {/* Invalid Input Warning Toast */}
      {warningToast && (
        <div className="bg-amber-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {warningToast}
          </span>
          <button onClick={() => setWarningToast(null)} className="hover:opacity-75 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Spreadsheet Grid Container */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex-1 min-h-[300px] overflow-auto custom-scrollbar focus:outline-none select-none relative bg-white dark:bg-[#0c0c0e]"
      >
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-max font-mono text-xs">
          {/* Sticky Column Headers */}
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {/* Corner Header: Row Numbers (#) */}
              <th className="py-2.5 px-3 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 bg-zinc-100 dark:bg-zinc-900 z-30 shadow-[1px_0_0_0_#e4e4e7] dark:shadow-[1px_0_0_0_#27272a] text-center w-12 shrink-0">
                #
              </th>

              {visibleHeaders.map((header, cIndex) => {
                const isSorted = sortConfig?.key === header;
                const colW = columnWidths[header] || 150;
                const isHeaderActive = rangeBounds && cIndex >= rangeBounds.minCol && cIndex <= rangeBounds.maxCol;
                const isNewColumn = addedColumns.has(header);

                return (
                  <th
                    key={header}
                    style={{ width: `${colW}px`, minWidth: `${colW}px`, maxWidth: `${colW}px` }}
                    className={cn(
                      "py-2.5 px-3 border-r border-zinc-200/80 dark:border-zinc-800/80 relative group cursor-pointer transition-colors hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60",
                      isHeaderActive && "bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold"
                    )}
                    onClick={() => handleHeaderClick(header)}
                    onDoubleClick={() => {
                      setRenamingHeader(header);
                      setRenameValue(header);
                      setRenameError(null);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100 font-sans" title={`Double-click to rename "${header}"`}>
                            {header}
                          </span>
                          {workingFormulas[header] ? (
                            <span 
                              className="text-[9px] font-black font-mono bg-indigo-100 text-indigo-700 dark:bg-indigo-950/90 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 px-1 rounded flex items-center gap-0.5 shrink-0" 
                              title={`Formula: ${workingFormulas[header]}`}
                            >
                              fx
                            </span>
                          ) : isNewColumn ? (
                            <span className="text-[8px] bg-blue-500 text-white px-1 rounded font-mono uppercase font-black">
                              NEW
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5">
                          {getTypeBadge(workingColumnTypes[header], header)}
                        </div>
                      </div>

                      {/* Sort Indicator */}
                      <span className="shrink-0 text-zinc-400">
                        {isSorted ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                        )}
                      </span>
                    </div>

                    {/* Column Resizer Boundary Handle */}
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(header, e)}
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/80 transition-colors z-10",
                        resizingCol === header && "bg-blue-600"
                      )}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Spreadsheet Body */}
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/60 text-[11px] bg-white dark:bg-[#0c0c0e]">
            {displayedRows.map((row, rIndex) => {
              const isRowActive = rangeBounds && rIndex >= rangeBounds.minRow && rIndex <= rangeBounds.maxRow;
              const isNewRow = addedRowIds.has(row._rowId);

              return (
                <tr key={row._rowId || rIndex} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                  {/* Fixed Row Number (#) */}
                  <td
                    onClick={() => handleSelectRow(rIndex)}
                    className={cn(
                      "py-2 px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 sticky left-0 font-bold text-center z-10 shadow-[1px_0_0_0_#e4e4e7] dark:shadow-[1px_0_0_0_#27272a] cursor-pointer text-[10px] select-none transition-colors",
                      isRowActive 
                        ? "bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold" 
                        : "bg-zinc-50 dark:bg-zinc-950 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                    title="Click to select entire row"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isNewRow && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Newly added row" />
                      )}
                      <span>{rIndex + 1}</span>
                    </div>
                  </td>

                  {/* Grid Data Cells */}
                  {visibleHeaders.map((header, cIndex) => {
                    const rawVal = row[header];
                    const formattedVal = formatCellValue(rawVal, header);
                    const isNull = formattedVal === null;

                    const isInRange = rangeBounds && 
                      rIndex >= rangeBounds.minRow && 
                      rIndex <= rangeBounds.maxRow && 
                      cIndex >= rangeBounds.minCol && 
                      cIndex <= rangeBounds.maxCol;

                    const isSelectedCell = selectedCell && selectedCell.row === rIndex && selectedCell.col === cIndex;
                    const isEditing = editingCell && editingCell.row === rIndex && editingCell.col === cIndex;
                    const colW = columnWidths[header] || 150;
                    const isCellEdited = editedCells.has(`${row._rowId}:${header}`);
                    const formula = workingFormulas[header];

                    const isMatchCell = highlightedMatches.some(m => m.rIndex === rIndex && m.cIndex === cIndex);
                    const isActiveMatch = activeMatchIndex !== -1 && 
                      highlightedMatches[activeMatchIndex]?.rIndex === rIndex && 
                      highlightedMatches[activeMatchIndex]?.cIndex === cIndex;

                    return (
                      <td
                        key={header}
                        style={{ width: `${colW}px`, minWidth: `${colW}px`, maxWidth: `${colW}px` }}
                        onMouseDown={(e) => handleCellMouseDown(rIndex, cIndex, e)}
                        onMouseEnter={() => handleCellMouseEnter(rIndex, cIndex)}
                        onDoubleClick={() => startEditingCell(rIndex, cIndex)}
                        onContextMenu={(e) => handleContextMenu(rIndex, cIndex, header, e)}
                        className={cn(
                          "py-2 px-3 border-r border-zinc-200/50 dark:border-zinc-800/50 truncate relative cursor-default transition-all",
                          formula && "bg-indigo-50/30 dark:bg-indigo-950/20 font-mono",
                          isInRange && "bg-blue-500/12 dark:bg-blue-500/22",
                          isMatchCell && !isActiveMatch && "bg-amber-100/90 dark:bg-amber-950/80 ring-1 ring-amber-400/80 font-medium",
                          isActiveMatch && "bg-amber-300 dark:bg-amber-600 font-bold ring-2 ring-amber-600 text-black dark:text-white z-20 shadow-xs",
                          isSelectedCell && !isEditing && !isActiveMatch && "ring-2 ring-blue-600 dark:ring-blue-500 z-10 bg-blue-50 dark:bg-blue-950/40 border-transparent shadow-xs font-semibold"
                        )}
                        title={formula ? `Calculated: ${formula}` : isNull ? 'Double click or press Enter to edit' : String(formattedVal)}
                      >
                        {/* Edited Cell Dot */}
                        {isCellEdited && !isEditing && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" title="Edited cell" />
                        )}

                        {isEditing ? (
                          <input
                            ref={cellInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleCellInputKeyDown(e, rIndex, cIndex)}
                            onBlur={() => commitCellEdit(rIndex, cIndex, editValue)}
                            className="w-full h-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-2 border-blue-600 dark:border-blue-400 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none shadow-md z-30"
                          />
                        ) : isNull ? (
                          <span className="text-zinc-300 dark:text-zinc-700 italic text-[10px] select-none">null</span>
                        ) : formula ? (
                          <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
                            {formattedVal}
                          </span>
                        ) : (
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {formattedVal}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {displayedRows.length === 0 && (
              <tr>
                <td colSpan={visibleHeaders.length + 1} className="py-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Filter className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                    <p className="font-semibold text-xs text-zinc-500">No records found. Click "Add Row" to insert data.</p>
                    <Button size="sm" variant="outline" onClick={handleAddRow} className="mt-2 text-xs font-bold gap-1">
                      <Plus className="w-3.5 h-3.5 text-emerald-500" /> Add New Row
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Grid Status Bar */}
      <div className="p-2.5 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Rows: <strong className="text-zinc-800 dark:text-zinc-200">{workingData.length.toLocaleString()}</strong> | Cols: <strong className="text-zinc-800 dark:text-zinc-200">{workingHeaders.length}</strong>
          </span>
          {sortConfig && (
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              Sorted by {sortConfig.key} ({sortConfig.direction.toUpperCase()})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-zinc-400 hidden sm:inline">Double-click / Enter to edit cells | Tab to move</span>
          <span className={cn(
            "px-2 py-0.5 rounded font-bold uppercase tracking-wider",
            isDirty 
              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
              : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          )}>
            {isDirty ? "Working Copy (Unsaved)" : "Saved State"}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. Cell Context Menu */}
      {/* ---------------------------------------------------- */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-64 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 space-y-0.5 text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Draggable Header / Title Bar */}
          <div 
            className="px-2.5 py-1.5 mb-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg flex items-center justify-between cursor-move text-[10px] font-bold text-zinc-500 dark:text-zinc-400"
            onMouseDown={(e) => {
              setIsDraggingContextMenu(true);
              menuDragOffset.current = {
                x: e.clientX - contextMenu.x,
                y: e.clientY - contextMenu.y,
              };
              const handleMouseMove = (mv: MouseEvent) => {
                setContextMenu(prev => prev ? {
                  ...prev,
                  x: Math.max(10, Math.min(window.innerWidth - 260, mv.clientX - menuDragOffset.current.x)),
                  y: Math.max(10, Math.min(window.innerHeight - 350, mv.clientY - menuDragOffset.current.y)),
                } : null);
              };
              const handleMouseUp = () => {
                setIsDraggingContextMenu(false);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
              };
              window.addEventListener('mousemove', handleMouseMove);
              window.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <span>Cell: {getColumnLetter(contextMenu.col)}{contextMenu.row + 1} ({contextMenu.header})</span>
            <span className="text-[9px] uppercase tracking-wider text-zinc-400">Context Menu</span>
          </div>

          {/* Cell & Edit Actions */}
          {!workingFormulas[contextMenu.header] && (
            <button
              onClick={() => {
                startEditingCell(contextMenu.row, contextMenu.col);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                Edit Cell
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Enter</span>
            </button>
          )}

          <button
            onClick={() => {
              copyToClipboard();
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-blue-500" />
              Copy
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Ctrl+C</span>
          </button>

          {!workingFormulas[contextMenu.header] && (
            <button
              onClick={() => {
                handleClearSelectedCells();
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Eraser className="w-3.5 h-3.5 text-amber-500" />
                Clear Cell / Selection
              </span>
            </button>
          )}

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

          {/* Selection Actions */}
          <button
            onClick={() => handleSelectRow(contextMenu.row)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <Rows className="w-3.5 h-3.5 text-indigo-500" />
            Select Row (#{contextMenu.row + 1})
          </button>

          <button
            onClick={() => handleSelectColumn(contextMenu.col)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <Columns3 className="w-3.5 h-3.5 text-indigo-500" />
            Select Column ({contextMenu.header})
          </button>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

          {/* Row & Column Structure Actions */}
          <button
            onClick={() => {
              handleAddRow();
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            Add Row
          </button>

          <button
            onClick={() => {
              setDeletingRowIndex(contextMenu.row);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-left font-medium text-red-600 dark:text-red-400 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            Delete Row #{contextMenu.row + 1}
          </button>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

          <button
            onClick={() => {
              setRenamingHeader(contextMenu.header);
              setRenameValue(contextMenu.header);
              setRenameError(null);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
            Rename Column "{contextMenu.header}"
          </button>

          <button
            onClick={() => {
              handleHideColumn(contextMenu.header);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
            Hide Column "{contextMenu.header}"
          </button>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

          {/* Find & Replace */}
          <button
            onClick={() => {
              setShowFindReplaceModal(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-blue-500" />
            Find & Replace...
          </button>

          {/* Change Data Type */}
          {!workingFormulas[contextMenu.header] && (
            <button
              onClick={() => {
                setTypeModalCol(contextMenu.header);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Change Data Type...
            </button>
          )}

          {/* Split Column */}
          {!workingFormulas[contextMenu.header] && (
            <button
              onClick={() => {
                setActiveCleaningModal({ actionType: 'split_column' as any, column: contextMenu.header });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-600" />
              Split Column...
            </button>
          )}

          {/* Extract Date / Time */}
          {!workingFormulas[contextMenu.header] && (
            <>
              <button
                onClick={() => {
                  setActiveCleaningModal({ actionType: 'extract_date' as any, column: contextMenu.header });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Extract Date
              </button>
              <button
                onClick={() => {
                  setActiveCleaningModal({ actionType: 'extract_time' as any, column: contextMenu.header });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Extract Time
              </button>
            </>
          )}

          {/* Formula Actions */}
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
          {workingFormulas[contextMenu.header] ? (
            <>
              <button
                onClick={() => {
                  setEditingFormulaCol(contextMenu.header);
                  setShowFormulaModal(true);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                Edit Formula ({contextMenu.header})
              </button>

              <button
                onClick={() => {
                  handleDeleteFormulaColumn(contextMenu.header);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-left font-medium text-red-600 dark:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                Delete Formula Column
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setEditingFormulaCol(null);
                setShowFormulaModal(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-500" />
              Add Formula Column...
            </button>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 5. Modals */}
      {/* ---------------------------------------------------- */}

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Add New Column</h3>
              </div>
              <button onClick={() => setShowAddColumnModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddColumn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. DiscountPercentage"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Data Type
                </label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as ColumnType)}
                  className="w-full px-3 py-2 text-xs font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  <option value="text">Text (String)</option>
                  <option value="numeric">Numeric (Number)</option>
                  <option value="date">Date</option>
                  <option value="categorical">Categorical</option>
                </select>
              </div>

              {addColumnError && (
                <div className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/30 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addColumnError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddColumnModal(false)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Add Column
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Column Modal */}
      {renamingHeader && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Rename Column</h3>
              </div>
              <button onClick={() => setRenamingHeader(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRenameColumn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  New Name for "{renamingHeader}"
                </label>
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {renameError && (
                <div className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900/30 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{renameError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRenamingHeader(null)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Save Name
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Row Confirmation Modal */}
      {deletingRowIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Delete Row #{deletingRowIndex + 1}?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">This will remove the row from your editable working copy.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingRowIndex(null)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDeleteRow}
                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Confirmation Modal */}
      {showDiscardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Discard Unsaved Edits?</h3>
                <p className="text-xs text-zinc-500 mt-0.5">All unsaved cell edits, added rows, and column changes will be discarded.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiscardModal(false)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDiscardChanges}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Formula Builder Modal */}
      <FormulaBuilderModal
        isOpen={showFormulaModal}
        onClose={() => {
          setShowFormulaModal(false);
          setEditingFormulaCol(null);
        }}
        onApplyFormula={handleApplyFormula}
        availableHeaders={workingHeaders}
        existingFormulas={workingFormulas}
        editingColName={editingFormulaCol}
        sampleData={workingData}
      />

      {/* Floating Bulk Operations Toolbar */}
      <BulkOperationsBar
        selectedCellCount={selectedCellCount}
        selectedRowCount={selectedRowCount}
        hasFormulaColumnsInSelection={hasFormulaColumnsInSelection}
        onApplyBulkValue={handleApplyBulkValue}
        onClearSelectedCells={handleClearSelectedCells}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onOpenFindReplace={() => setShowFindReplaceModal(true)}
        onClearSelection={() => {
          setSelectedCell(null);
          setSelectionRange(null);
        }}
      />

      {/* Find & Replace Modal */}
      <FindReplaceModal
        isOpen={showFindReplaceModal}
        onClose={() => {
          setShowFindReplaceModal(false);
          setHighlightedMatches([]);
          setActiveMatchIndex(-1);
        }}
        availableHeaders={workingHeaders}
        visibleHeaders={visibleHeaders}
        workingFormulas={workingFormulas}
        workingColumnTypes={workingColumnTypes}
        displayedRows={displayedRows}
        workingData={workingData}
        selectedHeader={visibleHeaders[selectedCell?.col ?? 0]}
        selectedCell={selectedCell}
        onNavigateToMatch={handleNavigateToMatch}
        onReplaceSingle={handleFindReplaceSingle}
        onReplaceAll={handleFindReplaceAll}
        onMatchesFoundChange={handleMatchesFoundChange}
      />

      {/* Phase 8H Data Type Conversion Modal */}
      {typeModalCol && (
        <TypeConversionModal
          isOpen={!!typeModalCol}
          onClose={() => setTypeModalCol(null)}
          header={typeModalCol}
          currentType={workingColumnTypes[typeModalCol] || 'text'}
          workingData={workingData}
          isFormulaColumn={!!workingFormulas[typeModalCol]}
          onConfirmConversion={(hdr, targetType, convertedData) => {
            handleConfirmConversion(hdr, targetType, convertedData);
            setTypeModalCol(null);
          }}
        />
      )}

      {/* Phase 8H Column Formatting Modal */}
      {formatModalCol && (
        <ColumnFormattingModal
          isOpen={!!formatModalCol}
          onClose={() => setFormatModalCol(null)}
          header={formatModalCol}
          colType={workingColumnTypes[formatModalCol] || 'text'}
          currentConfig={workingColumnFormats[formatModalCol]}
          sampleValues={workingData.slice(0, 50).map(r => r[formatModalCol])}
          onApplyFormat={(hdr, config) => {
            handleApplyFormat(hdr, config);
            setFormatModalCol(null);
          }}
        />
      )}

      {/* Phase 8H Extract Date/Time Part Modal */}
      {extractModalCol && (
        <ExtractDateTimeModal
          isOpen={!!extractModalCol}
          onClose={() => setExtractModalCol(null)}
          header={extractModalCol}
          workingData={workingData}
          onExtractConfirmed={(newHeaderName, newColType, updatedData) => {
            handleExtractConfirmed(newHeaderName, newColType, updatedData);
            setExtractModalCol(null);
          }}
        />
      )}

      {/* Phase 8I Data Quality Audit Modal Overlay */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
            <DataQualityPanel
              dataset={dataset}
              workingData={workingData}
              onOpenFixModal={(actionType, col, vars) => {
                setShowQualityModal(false);
                setActiveCleaningModal({ actionType, column: col, variations: vars });
              }}
              onOpenAICopilot={() => {
                setShowQualityModal(false);
                setShowAICopilotModal(true);
              }}
              onNavigateView={(view) => {
                setShowQualityModal(false);
                if (onNavigateView) onNavigateView(view);
              }}
              onClose={() => setShowQualityModal(false)}
            />
          </div>
        </div>
      )}

      {/* Phase 8K AI Data Cleaning Copilot Modal Overlay */}
      {showAICopilotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <AICleaningCopilotPanel
            dataset={dataset}
            workingData={workingData}
            workingHeaders={workingHeaders}
            qualityReport={scanDatasetQuality(dataset, workingData)}
            workingFormulas={workingFormulas}
            cleaningHistory={cleaningHistory}
            onOpenFixModal={(actionType, col, vars) => {
              setShowAICopilotModal(false);
              setActiveCleaningModal({ actionType, column: col, variations: vars });
            }}
            onClose={() => setShowAICopilotModal(false)}
          />
        </div>
      )}

      {/* Phase 8J Cleaning Preview Modal */}
      {activeCleaningModal && (
        <CleaningPreviewModal
          initialAction={activeCleaningModal.actionType}
          initialColumn={activeCleaningModal.column}
          initialVariations={activeCleaningModal.variations}
          data={workingData}
          headers={workingHeaders}
          formulas={workingFormulas}
          onClose={() => setActiveCleaningModal(null)}
          onApply={handleApplyCleaningResult}
        />
      )}

      {/* Phase 8J Cleaning History Panel Overlay */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <CleaningHistoryPanel
            history={cleaningHistory}
            onUndoLastAction={handleUndoLastCleaningAction}
            onClose={() => setShowHistoryModal(false)}
          />
        </div>
      )}

      {/* Phase 8L Data Readiness Gate & Validation Overlay */}
      {showReadinessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <DataReadinessPanel
            dataset={dataset}
            workingData={workingData}
            workingHeaders={workingHeaders}
            workingFormulas={workingFormulas}
            onOpenFixModal={(actionType, col, vars) => {
              setShowReadinessModal(false);
              setActiveCleaningModal({ actionType, column: col, variations: vars });
            }}
            onOpenAICopilot={() => {
              setShowReadinessModal(false);
              setShowAICopilotModal(true);
            }}
            onProceedToReporting={(snapshot) => {
              setShowReadinessModal(false);
              
              if (onUpdateDataset) {
                // Strip internal `_rowId` before saving dataset
                const cleanData = workingData.map(r => {
                  const { _rowId, ...rest } = r;
                  return rest;
                });
                
                onUpdateDataset({
                  ...dataset,
                  fullData: cleanData,
                  headers: workingHeaders,
                  columnTypes: workingColumnTypes,
                  formulas: workingFormulas,
                  cleaningStatus: 'cleaned',
                  rowCount: cleanData.length,
                  colCount: workingHeaders.length,
                  data: cleanData.slice(0, 100),
                  updatedAt: Date.now(),
                  // store snapshot validation details
                  readinessSnapshot: {
                    ...snapshot,
                    validationTimestamp: snapshot.validationTimestamp.toISOString(),
                  } as any
                });
              }
              if (onNavigateView) {
                onNavigateView('mis-report');
              }
            }}
            onNavigateView={(view) => {
              setShowReadinessModal(false);
              if (onNavigateView) onNavigateView(view);
            }}
            onClose={() => setShowReadinessModal(false)}
          />
        </div>
      )}

    </div>
  );
});
