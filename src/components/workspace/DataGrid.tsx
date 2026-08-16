import React, { useState, useMemo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Dataset, ColumnType } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Hash, Calendar, Tag, CaseSensitive, Clock, Sliders, RefreshCw,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, 
  Copy, Check, ChevronDown, Filter, 
  RotateCcw, Table as TableIcon, Layers, Plus, Trash2, Edit3, Save, X, AlertCircle, PlusCircle, AlertTriangle, Calculator, Search, ShieldAlert, ShieldCheck, Wrench, History, Sparkles,
  Undo2, Redo2, Columns, Database, Eraser, Rows, Columns3, SplitSquareVertical, Lock,
  Scissors, ArrowLeftRight, Percent, DollarSign, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline
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

const cloneDataSnapshot = (data: Record<string, any>[]): Record<string, any>[] => {
  if (!data) return [];
  return data.map(row => ({ ...row }));
};

interface DataGridProps {
  dataset: Dataset;
  onNavigateView?: (view: any) => void;
  onUpdateDataset?: (dataset: Dataset) => void;
  showGridlines?: boolean;
  rowDensity?: 'compact' | 'normal' | 'comfortable';
  isHeaderFrozen?: boolean;
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
  renameColumn: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  canDeleteRow: boolean;

  // Phase 8P-2W Data Ribbon Handlers
  sortAscending: () => void;
  sortDescending: () => void;
  toggleFilter: () => void;
  clearFilter: () => void;
  isFilterActive: boolean;
  removeDuplicates: () => void;
  textToColumns: () => void;
  splitColumn: () => void;
  changeDataType: () => void;
  fillDown: () => void;
  fillRight: () => void;
  trimSpaces: () => void;
  removeBlankRows: () => void;
  removeBlankColumns: () => void;
  findErrors: () => void;
  standardizeValues: () => void;
  validateData: () => void;
  detectInvalidValues: () => void;
  detectMixedDataTypes: () => void;
  groupRows: () => void;
  ungroupRows: () => void;
  toggleOutlineDetails: () => void;
  isOutlineExpanded: boolean;
  openFormulaBuilder: (colName?: string) => void;
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

export const DataGrid = forwardRef<DataGridHandle, DataGridProps>(({ 
  dataset, 
  onNavigateView, 
  onUpdateDataset,
  showGridlines = true,
  rowDensity = 'normal',
  isHeaderFrozen = true
}, ref) => {
  // ----------------------------------------------------
  // Cell Formatting State (Phase 8P-2M)
  // ----------------------------------------------------
  const [cellFormatting, setCellFormatting] = useState<Record<string, CellFormatStyle>>({});

  const applyFormattingToSelection = (updater: (prev: CellFormatStyle) => CellFormatStyle, actionName = "Cell Formatting") => {
    if (!selectionRange) return;
    const { startRow, startCol, endRow, endCol } = selectionRange;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    const prevFormattingSnapshot = { ...cellFormatting };

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

    const historyItem: CleaningHistoryItem = {
      id: `format-${Date.now()}`,
      actionName,
      target: `Range R${minRow + 1}C${minCol + 1}:R${maxRow + 1}C${maxCol + 1}`,
      rowsAffected: maxRow - minRow + 1,
      cellsAffected: (maxRow - minRow + 1) * (maxCol - minCol + 1),
      timestamp: new Date(),
      previousDataSnapshot: cloneDataSnapshot(workingData),
      previousHeadersSnapshot: [...workingHeaders],
      previousCellFormattingSnapshot: prevFormattingSnapshot,
    };

    setCleaningHistory(prev => [...prev, historyItem]);
    setRedoStack([]);
    setIsDirty(true);
  };

  useImperativeHandle(ref, () => ({
    toggleBold: () => applyFormattingToSelection(curr => ({ ...curr, bold: !curr.bold }), "Toggle Bold"),
    toggleItalic: () => applyFormattingToSelection(curr => ({ ...curr, italic: !curr.italic }), "Toggle Italic"),
    toggleUnderline: () => applyFormattingToSelection(curr => ({ ...curr, underline: !curr.underline }), "Toggle Underline"),
    setFontSize: (size) => applyFormattingToSelection(curr => ({ ...curr, fontSize: size }), `Set Font Size (${size})`),
    setTextColor: (color) => applyFormattingToSelection(curr => ({ ...curr, color }), "Set Text Color"),
    setBgColor: (color) => applyFormattingToSelection(curr => ({ ...curr, bgColor: color }), "Set Fill Color"),
    setAlignment: (align) => applyFormattingToSelection(curr => ({ ...curr, align }), `Align ${align}`),
    toggleWrapText: () => applyFormattingToSelection(curr => ({ ...curr, wrap: !curr.wrap }), "Toggle Wrap Text"),
    setNumberFormat: (format) => applyFormattingToSelection(curr => ({ ...curr, numberFormat: format }), `Format as ${format}`),
    applyStyle: (styleName) => applyFormattingToSelection(curr => ({ ...curr, stylePreset: styleName as any }), `Apply Cell Style (${styleName})`),
    applyConditionalFormatting: (rule) => {
      if (!selectionRange) return;
      const { startRow, startCol, endRow, endCol } = selectionRange;
      const prevFormattingSnapshot = { ...cellFormatting };
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

      const historyItem: CleaningHistoryItem = {
        id: `condformat-${Date.now()}`,
        actionName: `Conditional Formatting (${rule})`,
        target: `Range R${Math.min(startRow, endRow) + 1}C${Math.min(startCol, endCol) + 1}:R${Math.max(startRow, endRow) + 1}C${Math.max(startCol, endCol) + 1}`,
        rowsAffected: Math.abs(endRow - startRow) + 1,
        cellsAffected: (Math.abs(endRow - startRow) + 1) * (Math.abs(endCol - startCol) + 1),
        timestamp: new Date(),
        previousDataSnapshot: cloneDataSnapshot(workingData),
        previousHeadersSnapshot: [...workingHeaders],
        previousCellFormattingSnapshot: prevFormattingSnapshot,
      };
      setCleaningHistory(prev => [...prev, historyItem]);
      setRedoStack([]);
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
      pasteFromClipboard();
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
    renameColumn: () => {
      const target = selectedCell ? visibleHeaders[selectedCell.col] : visibleHeaders[0];
      if (target) {
        setRenamingHeader(target);
        setRenameValue(target);
        setRenameError(null);
      }
    },
    canUndo: cleaningHistory.length > 0,
    canRedo: redoStack.length > 0,
    isDirty: isDirty,
    canDeleteRow: selectedCell !== null,

    // Phase 8P-2W Data Ribbon Handlers
    sortAscending: () => handleSortAsc(),
    sortDescending: () => handleSortDesc(),
    toggleFilter: () => handleToggleFilter(),
    clearFilter: () => handleClearFilter(),
    isFilterActive: isFilterActive,
    removeDuplicates: () => {
      setActiveCleaningModal({ actionType: 'remove_duplicates' });
    },
    textToColumns: () => {
      const header = selectedCell ? visibleHeaders[selectedCell.col] : visibleHeaders[0];
      setActiveCleaningModal({ actionType: 'split_column' as any, column: header });
    },
    splitColumn: () => {
      const header = selectedCell ? visibleHeaders[selectedCell.col] : visibleHeaders[0];
      setActiveCleaningModal({ actionType: 'split_column' as any, column: header });
    },
    changeDataType: () => {
      const header = selectedCell ? visibleHeaders[selectedCell.col] : visibleHeaders[0];
      if (header) setTypeModalCol(header);
    },
    fillDown: () => handleFillDown(),
    fillRight: () => handleFillRight(),
    trimSpaces: () => {
      const header = selectedCell ? visibleHeaders[selectedCell.col] : undefined;
      setActiveCleaningModal({ actionType: 'trim_whitespace', column: header });
    },
    removeBlankRows: () => {
      setActiveCleaningModal({ actionType: 'remove_empty_rows' });
    },
    removeBlankColumns: () => handleRemoveBlankColumns(),
    findErrors: () => handleFindErrors(),
    standardizeValues: () => {
      const header = selectedCell ? visibleHeaders[selectedCell.col] : undefined;
      setActiveCleaningModal({ actionType: 'text_capitalization', column: header });
    },
    validateData: () => handleValidateData(),
    detectInvalidValues: () => handleDetectInvalidValues(),
    detectMixedDataTypes: () => handleDetectMixedDataTypes(),
    groupRows: () => handleGroupRows(),
    ungroupRows: () => handleUngroupRows(),
    toggleOutlineDetails: () => handleToggleOutlineDetails(),
    isOutlineExpanded: isOutlineExpanded,
    openFormulaBuilder: (colName?: string) => {
      const target = colName || (selectedCell ? visibleHeaders[selectedCell.col] : null);
      setEditingFormulaCol(target && workingFormulas[target] ? target : null);
      setShowFormulaModal(true);
    },
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

  // Phase 8P-2S Name Box States
  const [nameBoxInput, setNameBoxInput] = useState<string>('A1');
  const [isNameBoxFocused, setIsNameBoxFocused] = useState<boolean>(false);

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Data Grid Virtualization State
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(600);

  useEffect(() => {
    if (!gridRef.current) return;
    const el = gridRef.current;
    setViewportHeight(el.clientHeight || 600);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height) {
          setViewportHeight(entry.contentRect.height);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    targetType?: 'cell' | 'row' | 'column';
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isDraggingContextMenu, setIsDraggingContextMenu] = useState<boolean>(false);
  const menuDragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dedicated Column Header Context Menu state (Phase 8P-2W)
  const [columnContextMenu, setColumnContextMenu] = useState<{
    x: number;
    y: number;
    col: number;
    header: string;
  } | null>(null);
  const columnContextMenuRef = useRef<HTMLDivElement>(null);

  // Column Width Modal state
  const [columnWidthModal, setColumnWidthModal] = useState<{
    header: string;
    currentWidth: number;
  } | null>(null);
  const [customColumnWidthInput, setCustomColumnWidthInput] = useState<string>('150');

  // Column Visibility Popover
  const [showColumnsDropdown, setShowColumnsDropdown] = useState<boolean>(false);

  // Data Ribbon State (Phase 8P-2W)
  const [isFilterActive, setIsFilterActive] = useState<boolean>(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [filterPopoverCol, setFilterPopoverCol] = useState<string | null>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState<string>('');
  const [rowGroups, setRowGroups] = useState<Array<{ id: string; startRow: number; endRow: number; collapsed: boolean }>>([]);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState<boolean>(true);

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
  const lastDatasetIdRef = useRef<string | null>(null);

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
    setCellFormatting(dataset.cellFormatting || {});
    setColumnWidths(dataset.columnWidths || {});

    setIsDirty(false);
    setEditedCells(new Set());
    setAddedRowIds(new Set());
    setAddedColumns(new Set());

    const isNewDataset = lastDatasetIdRef.current !== dataset.id;
    lastDatasetIdRef.current = dataset.id;

    if (isNewDataset) {
      setSelectedCell({ row: 0, col: 0 });
      setSelectionRange({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
      setEditingCell(null);
      setSortConfig(null);
      setSearchQuery('');
    }
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
      previousDataSnapshot: cloneDataSnapshot(workingData),
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
      previousDataSnapshot: cloneDataSnapshot(workingData),
      previousHeadersSnapshot: [...workingHeaders],
      previousCellFormattingSnapshot: { ...cellFormatting },
    };

    let restoredRows = cloneDataSnapshot(lastItem.previousDataSnapshot);

    if (workingFormulas && Object.keys(workingFormulas).length > 0) {
      restoredRows = evaluateAllFormulas(lastItem.previousHeadersSnapshot, restoredRows, workingFormulas).updatedData;
    }

    setWorkingData(restoredRows);
    setWorkingHeaders([...lastItem.previousHeadersSnapshot]);
    if (lastItem.previousCellFormattingSnapshot) {
      setCellFormatting(lastItem.previousCellFormattingSnapshot);
    }
    setCleaningHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, redoItem]);
    setIsDirty(true);

    setSaveFeedback(`Undid: ${lastItem.actionName}`);
    setTimeout(() => setSaveFeedback(null), 3500);
  }, [cleaningHistory, workingData, workingHeaders, workingFormulas, cellFormatting]);

  const handleRedoLastCleaningAction = useCallback(() => {
    if (redoStack.length === 0) return;

    const redoItem = redoStack[redoStack.length - 1];
    
    // Save current state to undo stack before redoing
    const undoItem: CleaningHistoryItem = {
      ...redoItem,
      previousDataSnapshot: cloneDataSnapshot(workingData),
      previousHeadersSnapshot: [...workingHeaders],
      previousCellFormattingSnapshot: { ...cellFormatting },
    };

    let restoredRows = cloneDataSnapshot(redoItem.previousDataSnapshot);

    if (workingFormulas && Object.keys(workingFormulas).length > 0) {
      restoredRows = evaluateAllFormulas(redoItem.previousHeadersSnapshot, restoredRows, workingFormulas).updatedData;
    }

    setWorkingData(restoredRows);
    setWorkingHeaders([...redoItem.previousHeadersSnapshot]);
    if (redoItem.previousCellFormattingSnapshot) {
      setCellFormatting(redoItem.previousCellFormattingSnapshot);
    }
    setRedoStack(prev => prev.slice(0, -1));
    setCleaningHistory(prev => [...prev, undoItem]);
    setIsDirty(true);

    setSaveFeedback(`Redid: ${redoItem.actionName}`);
    setTimeout(() => setSaveFeedback(null), 3500);
  }, [redoStack, workingData, workingHeaders, workingFormulas, cellFormatting]);

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
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(row =>
        visibleHeaders.some(h => {
          const val = row[h];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // AutoFilter column specific filters
    if (isFilterActive && Object.keys(columnFilters).length > 0) {
      result = result.filter(row => {
        return Object.entries(columnFilters).every(([col, allowedValues]) => {
          if (!allowedValues || allowedValues.length === 0) return true;
          const cellVal = String(row[col] ?? '');
          return allowedValues.includes(cellVal);
        });
      });
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
  }, [workingData, visibleHeaders, debouncedSearchQuery, sortConfig, isFilterActive, columnFilters]);

  // Displayed rows (continuous worksheet)
  const displayedRows = processedRows;

  // Virtual Row Slice Calculation
  const rowHeight = useMemo(() => {
    return rowDensity === 'compact' ? 28 : rowDensity === 'comfortable' ? 48 : 36;
  }, [rowDensity]);

  const totalRows = displayedRows.length;
  const overscan = 15;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(totalRows - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);

  const visibleRows = useMemo(() => {
    if (totalRows === 0) return [];
    return displayedRows.slice(startIndex, Math.min(totalRows, endIndex + 1));
  }, [displayedRows, startIndex, endIndex, totalRows]);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalRows - 1 - endIndex) * rowHeight);

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

  // Handle Column Selection (Normal Left-Click)
  const handleHeaderClick = (header: string, cIndex: number) => {
    if (editingCell) return;
    setSelectedCell({ row: 0, col: cIndex });
    setSelectionRange({
      startRow: 0,
      startCol: cIndex,
      endRow: Math.max(0, displayedRows.length - 1),
      endCol: cIndex,
    });
    setContextMenu(null);
    setColumnContextMenu(null);
    setFilterPopoverCol(null);
  };

  // Format cell display value helper
  const formatCellValue = (val: any, rIndex?: number, header?: string) => {
    if (val === null || val === undefined || val === '') {
      return null;
    }
    if (rIndex !== undefined && header) {
      const cellKey = `${rIndex}:${header}`;
      const cellFormat = cellFormatting[cellKey];
      if (cellFormat && cellFormat.numberFormat) {
        return formatDisplayValue(val, cellFormat.numberFormat);
      }
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

      // Move selection down (or up if Shift + Enter)
      if (e.shiftKey) {
        if (rIndex > 0) {
          const prevR = rIndex - 1;
          setSelectedCell({ row: prevR, col: cIndex });
          setSelectionRange({ startRow: prevR, startCol: cIndex, endRow: prevR, endCol: cIndex });
        }
      } else {
        if (rIndex < displayedRows.length - 1) {
          const nextR = rIndex + 1;
          setSelectedCell({ row: nextR, col: cIndex });
          setSelectionRange({ startRow: nextR, startCol: cIndex, endRow: nextR, endCol: cIndex });
        }
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

  // Real Excel TSV Paste Handler (Phase 8P-2R)
  const pasteFromClipboard = useCallback(() => {
    if (!selectedCell || displayedRows.length === 0 || visibleHeaders.length === 0) return;

    navigator.clipboard?.readText().then(text => {
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      const { row: startRowIdx, col: startColIdx } = selectedCell;
      const nextData = [...workingData];
      const nextEdited = new Set(editedCells);
      let skippedFormulaCols = false;
      let pastedCount = 0;

      lines.forEach((line, rOffset) => {
        const targetRowIdx = startRowIdx + rOffset;
        if (targetRowIdx >= displayedRows.length) return;

        const displayedRow = displayedRows[targetRowIdx];
        if (!displayedRow) return;

        const workingRowIdx = nextData.findIndex(r => r._rowId === displayedRow._rowId);
        if (workingRowIdx === -1) return;

        const workingRow = { ...nextData[workingRowIdx] };
        const cells = line.split('\t');

        cells.forEach((cellVal, cOffset) => {
          const targetColIdx = startColIdx + cOffset;
          if (targetColIdx >= visibleHeaders.length) return;

          const header = visibleHeaders[targetColIdx];
          if (!header) return;

          if (workingFormulas[header]) {
            skippedFormulaCols = true;
          } else {
            workingRow[header] = cellVal === '' ? null : cellVal;
            nextEdited.add(`${workingRow._rowId}:${header}`);
            pastedCount++;
          }
        });

        nextData[workingRowIdx] = workingRow;
      });

      if (pastedCount > 0) {
        recalculateAndSetData(nextData, workingHeaders, workingFormulas);
        setIsDirty(true);
        setEditedCells(nextEdited);
        setSaveFeedback(`Pasted values into ${pastedCount} cell${pastedCount > 1 ? 's' : ''}`);
        setTimeout(() => setSaveFeedback(null), 2500);
      }

      if (skippedFormulaCols) {
        setWarningToast('Formula columns are protected and were not overwritten.');
        setTimeout(() => setWarningToast(null), 3500);
      }
    }).catch(err => {
      console.error('Failed to paste from clipboard: ', err);
      setSaveFeedback('Clipboard read requires permission.');
      setTimeout(() => setSaveFeedback(null), 3000);
    });
  }, [selectedCell, displayedRows, visibleHeaders, workingData, editedCells, workingFormulas, workingHeaders, recalculateAndSetData]);

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
      cellFormatting: cellFormatting,
      columnWidths: columnWidths,
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

  // Auto-save changes immediately to centralized store when isDirty becomes true
  useEffect(() => {
    if (isDirty) {
      handleSaveChanges();
    }
  }, [isDirty]);

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
    setCellFormatting(dataset.cellFormatting || {});
    setColumnWidths(dataset.columnWidths || {});

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

    // Ctrl+V / Cmd+V Paste
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      pasteFromClipboard();
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

    // F2 key -> Start editing cell
    if (e.key === 'F2') {
      startEditingCell(row, col);
      e.preventDefault();
      return;
    }

    if (e.key === 'Escape') {
      setContextMenu(null);
      setShowColumnsDropdown(false);
      e.preventDefault();
      return;
    }

    // Tab key (with or without Shift) should always navigate
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (col > 0) {
          col--;
        } else if (row > 0) {
          row--;
          col = maxC;
        }
      } else {
        if (col < maxC) {
          col++;
        } else if (row < maxR) {
          row++;
          col = 0;
        }
      }
      setSelectedCell({ row, col });
      setSelectionRange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      });
      e.preventDefault();
      return;
    }

    // Enter key (with or without Shift)
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter: Move selection up
        row = Math.max(0, row - 1);
        setSelectedCell({ row, col });
        setSelectionRange({
          startRow: row,
          startCol: col,
          endRow: row,
          endCol: row,
        });
      } else {
        // Enter: Enter edit mode
        startEditingCell(row, col);
      }
      e.preventDefault();
      return;
    }

    // Direct Typing -> Start editing cell with initial typed char
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      startEditingCell(row, col, e.key);
      e.preventDefault();
      return;
    }

    // Shift key selection expansion
    if (e.shiftKey) {
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
      } else if (e.key === 'Home') {
        endCol = 0;
        handled = true;
      } else if (e.key === 'End') {
        endCol = maxC;
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
      // Regular arrow navigation, Home, End
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
      } else if (e.key === 'Home') {
        col = 0;
        handled = true;
      } else if (e.key === 'End') {
        col = maxC;
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

  // Scroll active cell into view smoothly and minimally with virtualization support
  useEffect(() => {
    if (selectedCell && gridRef.current) {
      const container = gridRef.current;
      const targetTop = selectedCell.row * rowHeight;
      const targetBottom = targetTop + rowHeight;
      const currentScrollTop = container.scrollTop;
      const currentScrollBottom = currentScrollTop + (container.clientHeight || 600);

      if (targetTop < currentScrollTop) {
        container.scrollTop = targetTop;
      } else if (targetBottom > currentScrollBottom) {
        container.scrollTop = targetBottom - (container.clientHeight || 600);
      }

      const cellElement = document.getElementById(`cell-${selectedCell.row}-${selectedCell.col}`);
      if (cellElement) {
        cellElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, [selectedCell, rowHeight]);

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

  // Synchronize Name Box with selection
  useEffect(() => {
    if (!isNameBoxFocused) {
      setNameBoxInput(getNameBoxNotation());
    }
  }, [selectionRange, displayedRows, visibleHeaders, isNameBoxFocused]);

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

    // If entire column is selected
    if (minRow === 0 && maxRow === Math.max(0, displayedRows.length - 1) && minCol === maxCol) {
      const header = visibleHeaders[minCol];
      if (header && !header.startsWith('Column_') && isNaN(Number(header))) {
        return header;
      }
      return `Column ${getColumnLetter(minCol)}`;
    }

    const startCoord = `${getColumnLetter(minCol)}${minRow + 1}`;
    if (minRow === maxRow && minCol === maxCol) {
      return startCoord;
    }
    const endCoord = `${getColumnLetter(maxCol)}${maxRow + 1}`;
    return `${startCoord}:${endCoord}`;
  };

  const getColIndexFromLetter = (letter: string): number => {
    let index = 0;
    const clean = letter.toUpperCase();
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i) - 64;
      if (charCode < 1 || charCode > 26) return -1;
      index = index * 26 + charCode;
    }
    return index - 1;
  };

  const parseCellAddress = (input: string) => {
    const clean = input.trim();
    if (!clean) return null;

    // 1. Direct Column Header Name (e.g. "Revenue")
    const headerIndex = visibleHeaders.findIndex(h => h.toLowerCase() === clean.toLowerCase());
    if (headerIndex !== -1) {
      return {
        type: 'column',
        startCol: headerIndex,
        endCol: headerIndex
      };
    }

    // 2. "Column B" notation
    const colMatch = clean.match(/^col(?:umn)?\s+([a-z]+)$/i);
    if (colMatch) {
      const colIdx = getColIndexFromLetter(colMatch[1]);
      if (colIdx >= 0 && colIdx < visibleHeaders.length) {
        return {
          type: 'column',
          startCol: colIdx,
          endCol: colIdx
        };
      }
    }

    // 3. A1 or B10:F20 notation
    const cellOrRangeMatch = clean.match(/^([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?$/i);
    if (cellOrRangeMatch) {
      const startColLetter = cellOrRangeMatch[1];
      const startRowNumber = parseInt(cellOrRangeMatch[2], 10);
      const endColLetter = cellOrRangeMatch[3];
      const endRowNumber = cellOrRangeMatch[4] ? parseInt(cellOrRangeMatch[4], 10) : undefined;

      const sCol = getColIndexFromLetter(startColLetter);
      const sRow = startRowNumber - 1;

      if (sCol < 0 || sCol >= visibleHeaders.length || sRow < 0 || sRow >= displayedRows.length) {
        return null;
      }

      if (endColLetter && endRowNumber !== undefined) {
        const eCol = getColIndexFromLetter(endColLetter);
        const eRow = endRowNumber - 1;

        if (eCol < 0 || eCol >= visibleHeaders.length || eRow < 0 || eRow >= displayedRows.length) {
          return null;
        }

        return {
          type: 'range',
          startRow: sRow,
          startCol: sCol,
          endRow: eRow,
          endCol: eCol
        };
      } else {
        return {
          type: 'cell',
          row: sRow,
          col: sCol
        };
      }
    }

    return null;
  };

  const handleNameBoxNavigation = () => {
    const parsed = parseCellAddress(nameBoxInput);
    if (!parsed) {
      setWarningToast('Invalid cell or range address.');
      setTimeout(() => setWarningToast(null), 3000);
      // Revert name box input back to selection
      setNameBoxInput(getNameBoxNotation());
      return;
    }

    if (parsed.type === 'column') {
      const { startCol } = parsed;
      setSelectedCell({ row: 0, col: startCol });
      setSelectionRange({
        startRow: 0,
        startCol,
        endRow: displayedRows.length - 1,
        endCol: startCol
      });
    } else if (parsed.type === 'range') {
      const { startRow, startCol, endRow, endCol } = parsed;
      setSelectedCell({ row: startRow, col: startCol });
      setSelectionRange({
        startRow,
        startCol,
        endRow,
        endCol
      });
    } else if (parsed.type === 'cell') {
      const { row, col } = parsed;
      setSelectedCell({ row, col });
      setSelectionRange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col
      });
    }
  };

  // Right-Click Context Menu Handler (Cell / Row)
  const handleContextMenu = (
    rIndex: number, 
    cIndex: number, 
    header: string, 
    e: React.MouseEvent,
    targetType: 'cell' | 'row' | 'column' = 'cell'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (editingCell) return;

    if (targetType === 'row') {
      if (!rangeBounds || rIndex < rangeBounds.minRow || rIndex > rangeBounds.maxRow) {
        setSelectedCell({ row: rIndex, col: 0 });
        setSelectionRange({
          startRow: rIndex,
          startCol: 0,
          endRow: rIndex,
          endCol: Math.max(0, visibleHeaders.length - 1),
        });
      }
    } else if (targetType === 'column') {
      if (!rangeBounds || cIndex < rangeBounds.minCol || cIndex > rangeBounds.maxCol) {
        setSelectedCell({ row: 0, col: cIndex });
        setSelectionRange({
          startRow: 0,
          startCol: cIndex,
          endRow: Math.max(0, displayedRows.length - 1),
          endCol: cIndex,
        });
      }
    } else {
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
    }

    // Dismiss any active column menu
    setColumnContextMenu(null);

    const MENU_WIDTH = 230;
    const MENU_HEIGHT = 420;
    const PADDING = 8;

    const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
    const vh = window.innerHeight || document.documentElement.clientHeight || 768;

    let x = e.clientX;
    let y = e.clientY;

    if (x + MENU_WIDTH > vw - PADDING) {
      x = Math.max(PADDING, e.clientX - MENU_WIDTH);
    } else {
      x = Math.max(PADDING, x);
    }

    if (y + MENU_HEIGHT > vh - PADDING) {
      y = Math.max(PADDING, e.clientY - MENU_HEIGHT);
    } else {
      y = Math.max(PADDING, y);
    }

    setContextMenu({
      x,
      y,
      row: rIndex,
      col: cIndex,
      header,
      targetType,
    });
  };

  // Context Menu Actions
  const handleSelectRow = (rIndex: number) => {
    setSelectedCell({ row: rIndex, col: 0 });
    setSelectionRange({
      startRow: rIndex,
      startCol: 0,
      endRow: rIndex,
      endCol: visibleHeaders.length - 1,
    });
    setContextMenu(null);
  };

  const handleSelectColumn = (cIndex: number) => {
    setSelectedCell({ row: 0, col: cIndex });
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

  // ----------------------------------------------------
  // Excel-Style Column Header Context Menu Logic
  // ----------------------------------------------------
  const handleColumnHeaderContextMenu = (
    header: string,
    cIndex: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (editingCell) return;

    // 1. Select the entire column
    setSelectedCell({ row: 0, col: cIndex });
    setSelectionRange({
      startRow: 0,
      startCol: cIndex,
      endRow: Math.max(0, displayedRows.length - 1),
      endCol: cIndex,
    });

    // 2. Dismiss any generic cell context menu
    setContextMenu(null);

    const targetEl = e.currentTarget as HTMLElement | null;
    const rect = targetEl?.getBoundingClientRect ? targetEl.getBoundingClientRect() : null;

    const MENU_WIDTH = 240;
    const MENU_HEIGHT = 460;
    const PADDING = 8;
    const GAP = 2;

    const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
    const vh = window.innerHeight || document.documentElement.clientHeight || 768;

    // Anchor at cursor X, column header bottom Y
    let x = e.clientX;
    let y = rect ? rect.bottom + GAP : e.clientY + GAP;

    if (x + MENU_WIDTH > vw - PADDING) {
      x = Math.max(PADDING, e.clientX - MENU_WIDTH);
    } else {
      x = Math.max(PADDING, x);
    }

    if (y + MENU_HEIGHT > vh - PADDING) {
      if (rect && rect.top - MENU_HEIGHT - GAP >= PADDING) {
        y = rect.top - MENU_HEIGHT - GAP;
      } else {
        y = Math.max(PADDING, e.clientY - MENU_HEIGHT);
      }
    } else {
      y = Math.max(PADDING, y);
    }

    setColumnContextMenu({
      x,
      y,
      col: cIndex,
      header,
    });
  };

  // Column Context Menu Actions
  const handleColumnCut = (header: string) => {
    copyToClipboard();
    setSaveFeedback(`Cut column "${header}" (Copied to clipboard)`);
    setTimeout(() => setSaveFeedback(null), 2500);
    setColumnContextMenu(null);
  };

  const handleColumnCopy = () => {
    copyToClipboard();
    setColumnContextMenu(null);
  };

  const handleInsertColumnAt = (targetIndex: number) => {
    let baseName = 'New_Column';
    let counter = 1;
    let candidate = baseName;
    while (workingHeaders.some(h => h.toLowerCase() === candidate.toLowerCase())) {
      counter++;
      candidate = `${baseName}_${counter}`;
    }

    const nextHeaders = [...workingHeaders];
    nextHeaders.splice(targetIndex, 0, candidate);

    setWorkingHeaders(nextHeaders);
    setWorkingColumnTypes(prev => ({ ...prev, [candidate]: 'text' }));
    setWorkingData(prev => prev.map(r => ({ ...r, [candidate]: null })));
    setAddedColumns(prev => new Set(prev).add(candidate));
    setIsDirty(true);
    setSaveFeedback(`Inserted column "${candidate}"`);
    setTimeout(() => setSaveFeedback(null), 3000);
    setColumnContextMenu(null);
  };

  const handleDeleteColumn = (header: string) => {
    if (workingHeaders.length <= 1) {
      setWarningToast('Cannot delete the only remaining column.');
      setTimeout(() => setWarningToast(null), 3500);
      setColumnContextMenu(null);
      return;
    }

    if (workingFormulas[header]) {
      handleDeleteFormulaColumn(header);
      setColumnContextMenu(null);
      return;
    }

    const nextHeaders = workingHeaders.filter(h => h !== header);
    const nextTypes = { ...workingColumnTypes };
    delete nextTypes[header];
    const nextFormats = { ...workingColumnFormats };
    delete nextFormats[header];

    const nextData = workingData.map(r => {
      const { [header]: _, ...rest } = r;
      return rest;
    });

    recalculateAndSetData(nextData, nextHeaders, workingFormulas);
    setWorkingHeaders(nextHeaders);
    setWorkingColumnTypes(nextTypes);
    setWorkingColumnFormats(nextFormats);
    setIsDirty(true);
    setSaveFeedback(`Deleted column "${header}"`);
    setTimeout(() => setSaveFeedback(null), 3000);
    setColumnContextMenu(null);
  };

  const handleClearColumnContents = (header: string) => {
    if (workingFormulas[header]) {
      setWarningToast(`Column "${header}" is calculated by formula and cannot be manually cleared.`);
      setTimeout(() => setWarningToast(null), 3500);
      setColumnContextMenu(null);
      return;
    }

    const nextData = workingData.map(r => ({
      ...r,
      [header]: null,
    }));
    recalculateAndSetData(nextData, workingHeaders, workingFormulas);
    setIsDirty(true);
    setSaveFeedback(`Cleared contents of column "${header}"`);
    setTimeout(() => setSaveFeedback(null), 3000);
    setColumnContextMenu(null);
  };

  const handleAutoFitSingleColumn = (header: string) => {
    const maxLen = Math.max(
      header.length,
      ...displayedRows.map(row => String(row[header] || '').length)
    );
    const newWidth = Math.max(90, Math.min(500, maxLen * 9 + 36));
    setColumnWidths(prev => ({ ...prev, [header]: newWidth }));
    setSaveFeedback(`Auto-fitted column "${header}" (${newWidth}px)`);
    setTimeout(() => setSaveFeedback(null), 2500);
    setColumnContextMenu(null);
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

  // ----------------------------------------------------
  // Phase 8P-2W Data Ribbon Action Handlers
  // ----------------------------------------------------
  const handleSortAsc = useCallback(() => {
    const header = selectedCell ? visibleHeaders[selectedCell.col] : visibleHeaders[0];
    if (!header) return;
    setSortConfig({ key: header, direction: 'asc' });
    setSaveFeedback(`Sorted by "${header}" (A → Z)`);
    setTimeout(() => setSaveFeedback(null), 2500);
  }, [selectedCell, visibleHeaders]);

  const handleSortDesc = useCallback(() => {
    const header = selectedCell ? visibleHeaders[selectedCell.col] : visibleHeaders[0];
    if (!header) return;
    setSortConfig({ key: header, direction: 'desc' });
    setSaveFeedback(`Sorted by "${header}" (Z → A)`);
    setTimeout(() => setSaveFeedback(null), 2500);
  }, [selectedCell, visibleHeaders]);

  const handleToggleFilter = useCallback(() => {
    setIsFilterActive(prev => {
      const next = !prev;
      if (!next) {
        setColumnFilters({});
        setFilterPopoverCol(null);
      }
      setSaveFeedback(next ? 'AutoFilter enabled (Click filter icon in headers)' : 'AutoFilter disabled');
      setTimeout(() => setSaveFeedback(null), 2500);
      return next;
    });
  }, []);

  const handleClearFilter = useCallback(() => {
    setColumnFilters({});
    setFilterPopoverCol(null);
    setSearchQuery('');
    setSortConfig(null);
    setSaveFeedback('Filters and sortings cleared');
    setTimeout(() => setSaveFeedback(null), 2500);
  }, []);

  const handleFillDown = useCallback(() => {
    if (!rangeBounds || rangeBounds.maxRow <= rangeBounds.minRow) {
      setWarningToast('Select a range with at least 2 rows to Fill Down.');
      setTimeout(() => setWarningToast(null), 3000);
      return;
    }
    const { minRow, maxRow, minCol, maxCol } = rangeBounds;
    const nextData = workingData.map(r => ({ ...r }));
    const nextEdited = new Set(editedCells);
    let filledCount = 0;

    for (let c = minCol; c <= maxCol; c++) {
      const header = visibleHeaders[c];
      if (!header || workingFormulas[header]) continue;
      const sourceVal = workingData[minRow]?.[header];

      for (let r = minRow + 1; r <= maxRow; r++) {
        const rowObj = nextData[r];
        if (rowObj) {
          rowObj[header] = sourceVal;
          nextEdited.add(`${rowObj._rowId || r}:${header}`);
          filledCount++;
        }
      }
    }

    if (filledCount > 0) {
      const historyItem: CleaningHistoryItem = {
        id: `fill-down-${Date.now()}`,
        actionName: `Fill Down (Rows ${minRow + 1} to ${maxRow + 1})`,
        target: `Range R${minRow + 1}C${minCol + 1}:R${maxRow + 1}C${maxCol + 1}`,
        rowsAffected: maxRow - minRow,
        cellsAffected: filledCount,
        timestamp: new Date(),
        previousDataSnapshot: cloneDataSnapshot(workingData),
        previousHeadersSnapshot: [...workingHeaders],
        previousCellFormattingSnapshot: { ...cellFormatting },
      };
      setCleaningHistory(prev => [...prev, historyItem]);
      setRedoStack([]);
      recalculateAndSetData(nextData, workingHeaders, workingFormulas);
      setEditedCells(nextEdited);
      setIsDirty(true);
      setSaveFeedback(`Filled down ${filledCount} cell${filledCount > 1 ? 's' : ''}`);
      setTimeout(() => setSaveFeedback(null), 2500);
    }
  }, [rangeBounds, workingData, visibleHeaders, workingFormulas, editedCells, cellFormatting, workingHeaders, recalculateAndSetData]);

  const handleFillRight = useCallback(() => {
    if (!rangeBounds || rangeBounds.maxCol <= rangeBounds.minCol) {
      setWarningToast('Select a range with at least 2 columns to Fill Right.');
      setTimeout(() => setWarningToast(null), 3000);
      return;
    }
    const { minRow, maxRow, minCol, maxCol } = rangeBounds;
    const nextData = workingData.map(r => ({ ...r }));
    const nextEdited = new Set(editedCells);
    let filledCount = 0;

    for (let r = minRow; r <= maxRow; r++) {
      const sourceHeader = visibleHeaders[minCol];
      if (!sourceHeader) continue;
      const sourceVal = workingData[r]?.[sourceHeader];
      const rowObj = nextData[r];
      if (!rowObj) continue;

      for (let c = minCol + 1; c <= maxCol; c++) {
        const targetHeader = visibleHeaders[c];
        if (!targetHeader || workingFormulas[targetHeader]) continue;
        rowObj[targetHeader] = sourceVal;
        nextEdited.add(`${rowObj._rowId || r}:${targetHeader}`);
        filledCount++;
      }
    }

    if (filledCount > 0) {
      const historyItem: CleaningHistoryItem = {
        id: `fill-right-${Date.now()}`,
        actionName: `Fill Right (Cols ${minCol + 1} to ${maxCol + 1})`,
        target: `Range R${minRow + 1}C${minCol + 1}:R${maxRow + 1}C${maxCol + 1}`,
        rowsAffected: maxRow - minRow + 1,
        cellsAffected: filledCount,
        timestamp: new Date(),
        previousDataSnapshot: cloneDataSnapshot(workingData),
        previousHeadersSnapshot: [...workingHeaders],
        previousCellFormattingSnapshot: { ...cellFormatting },
      };
      setCleaningHistory(prev => [...prev, historyItem]);
      setRedoStack([]);
      recalculateAndSetData(nextData, workingHeaders, workingFormulas);
      setEditedCells(nextEdited);
      setIsDirty(true);
      setSaveFeedback(`Filled right ${filledCount} cell${filledCount > 1 ? 's' : ''}`);
      setTimeout(() => setSaveFeedback(null), 2500);
    }
  }, [rangeBounds, workingData, visibleHeaders, workingFormulas, editedCells, cellFormatting, workingHeaders, recalculateAndSetData]);

  const handleRemoveBlankColumns = useCallback(() => {
    const blankCols: string[] = [];
    workingHeaders.forEach(header => {
      if (workingFormulas[header]) return;
      const isAllBlank = workingData.every(row => {
        const val = row[header];
        return val === null || val === undefined || String(val).trim() === '';
      });
      if (isAllBlank) {
        blankCols.push(header);
      }
    });

    if (blankCols.length === 0) {
      setSaveFeedback('No blank columns found in dataset.');
      setTimeout(() => setSaveFeedback(null), 3000);
      return;
    }

    if (blankCols.length >= workingHeaders.length) {
      setWarningToast('Cannot remove all columns from the dataset.');
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    const nextHeaders = workingHeaders.filter(h => !blankCols.includes(h));
    const nextTypes = { ...workingColumnTypes };
    const nextFormats = { ...workingColumnFormats };
    blankCols.forEach(h => {
      delete nextTypes[h];
      delete nextFormats[h];
    });

    const nextData = workingData.map(r => {
      const copy = { ...r };
      blankCols.forEach(h => delete copy[h]);
      return copy;
    });

    const historyItem: CleaningHistoryItem = {
      id: `remove-blank-cols-${Date.now()}`,
      actionName: `Remove Blank Columns (${blankCols.join(', ')})`,
      target: `Columns: ${blankCols.join(', ')}`,
      rowsAffected: workingData.length,
      cellsAffected: blankCols.length * workingData.length,
      timestamp: new Date(),
      previousDataSnapshot: cloneDataSnapshot(workingData),
      previousHeadersSnapshot: [...workingHeaders],
      previousCellFormattingSnapshot: { ...cellFormatting },
    };
    setCleaningHistory(prev => [...prev, historyItem]);
    setRedoStack([]);
    recalculateAndSetData(nextData, nextHeaders, workingFormulas);
    setWorkingHeaders(nextHeaders);
    setWorkingColumnTypes(nextTypes);
    setWorkingColumnFormats(nextFormats);
    setIsDirty(true);
    setSaveFeedback(`Removed ${blankCols.length} blank column(s): ${blankCols.join(', ')}`);
    setTimeout(() => setSaveFeedback(null), 3500);
  }, [workingHeaders, workingFormulas, workingData, workingColumnTypes, workingColumnFormats, cellFormatting, recalculateAndSetData]);

  const handleFindErrors = useCallback(() => {
    const errors: Array<{ row: number; col: number; header: string; reason: string }> = [];
    const formulaErrorKeywords = ['#DIV/0!', '#REF!', '#VALUE!', '#NAME?', '#N/A', 'NaN', 'Error'];

    workingData.forEach((row, rIdx) => {
      visibleHeaders.forEach((header, cIdx) => {
        const val = row[header];
        const strVal = String(val ?? '').trim();
        if (formulaErrorKeywords.some(kw => strVal.toUpperCase().includes(kw))) {
          errors.push({ row: rIdx, col: cIdx, header, reason: `Formula Error (${strVal})` });
        } else if (val === null || val === undefined || strVal === '') {
          errors.push({ row: rIdx, col: cIdx, header, reason: 'Empty/Missing Value' });
        }
      });
    });

    if (errors.length === 0) {
      setSaveFeedback('✓ No formula or data errors found in dataset!');
      setTimeout(() => setSaveFeedback(null), 3000);
      return;
    }

    const first = errors[0];
    setSelectedCell({ row: first.row, col: first.col });
    setSelectionRange({ startRow: first.row, startCol: first.col, endRow: first.row, endCol: first.col });
    setSaveFeedback(`Found ${errors.length} error/missing cell(s). Selected ${getColumnLetter(first.col)}${first.row + 1} (${first.header}): ${first.reason}`);
    setTimeout(() => setSaveFeedback(null), 4000);
  }, [workingData, visibleHeaders]);

  const handleValidateData = useCallback(() => {
    setShowReadinessModal(true);
  }, []);

  const handleDetectInvalidValues = useCallback(() => {
    const invalids: Array<{ row: number; col: number; header: string; reason: string }> = [];
    workingData.forEach((row, rIdx) => {
      visibleHeaders.forEach((header, cIdx) => {
        const val = row[header];
        if (val === null || val === undefined || String(val).trim() === '') return;
        const colType = String(workingColumnTypes[header] || 'text');
        if (colType === 'numeric' || colType === 'number' || colType === 'integer' || colType === 'decimal') {
          if (isNaN(Number(val))) {
            invalids.push({ row: rIdx, col: cIdx, header, reason: `Non-numeric value "${val}" in ${colType} column` });
          }
        } else if (colType === 'date' || colType === 'datetime' || colType === 'time') {
          const parsed = Date.parse(String(val));
          if (isNaN(parsed)) {
            invalids.push({ row: rIdx, col: cIdx, header, reason: `Invalid date string "${val}"` });
          }
        }
      });
    });

    if (invalids.length === 0) {
      setSaveFeedback('✓ All values strictly match declared column types and validation rules!');
      setTimeout(() => setSaveFeedback(null), 3500);
      return;
    }

    const first = invalids[0];
    setSelectedCell({ row: first.row, col: first.col });
    setSelectionRange({ startRow: first.row, startCol: first.col, endRow: first.row, endCol: first.col });
    setSaveFeedback(`Detected ${invalids.length} invalid value(s). Selected ${getColumnLetter(first.col)}${first.row + 1} (${first.header}): ${first.reason}`);
    setTimeout(() => setSaveFeedback(null), 4500);
  }, [workingData, visibleHeaders, workingColumnTypes]);

  const handleDetectMixedDataTypes = useCallback(() => {
    const mixedCols: string[] = [];
    visibleHeaders.forEach(header => {
      let hasNum = false;
      let hasStr = false;
      let hasDate = false;
      workingData.forEach(row => {
        const val = row[header];
        if (val === null || val === undefined || String(val).trim() === '') return;
        const num = Number(val);
        if (!isNaN(num) && typeof val === 'number') {
          hasNum = true;
        } else if (!isNaN(Date.parse(String(val))) && isNaN(Number(val)) && String(val).includes('-')) {
          hasDate = true;
        } else {
          hasStr = true;
        }
      });
      if ((hasNum && hasStr) || (hasDate && hasStr) || (hasNum && hasDate)) {
        mixedCols.push(header);
      }
    });

    if (mixedCols.length === 0) {
      setSaveFeedback('✓ No mixed data types detected in any column.');
      setTimeout(() => setSaveFeedback(null), 3500);
      return;
    }

    const firstColName = mixedCols[0];
    const colIdx = visibleHeaders.indexOf(firstColName);
    if (colIdx >= 0) {
      setSelectedCell({ row: 0, col: colIdx });
      setSelectionRange({ startRow: 0, startCol: colIdx, endRow: workingData.length - 1, endCol: colIdx });
    }
    setSaveFeedback(`Detected mixed data types in ${mixedCols.length} column(s): ${mixedCols.join(', ')}`);
    setTimeout(() => setSaveFeedback(null), 4500);
  }, [visibleHeaders, workingData]);

  const handleGroupRows = useCallback(() => {
    if (!rangeBounds || rangeBounds.maxRow <= rangeBounds.minRow) {
      setWarningToast('Select at least 2 rows to create an Outline Row Group.');
      setTimeout(() => setWarningToast(null), 3000);
      return;
    }
    const { minRow, maxRow } = rangeBounds;
    const newGroup = {
      id: `group-${Date.now()}`,
      startRow: minRow,
      endRow: maxRow,
      collapsed: false,
    };
    setRowGroups(prev => [...prev.filter(g => !(g.startRow === minRow && g.endRow === maxRow)), newGroup]);
    setSaveFeedback(`Grouped Rows ${minRow + 1} to ${maxRow + 1} in Outline.`);
    setTimeout(() => setSaveFeedback(null), 3000);
  }, [rangeBounds]);

  const handleUngroupRows = useCallback(() => {
    if (!rangeBounds) {
      setRowGroups([]);
      setSaveFeedback('Cleared all outline groups.');
      setTimeout(() => setSaveFeedback(null), 2500);
      return;
    }
    const { minRow, maxRow } = rangeBounds;
    setRowGroups(prev => prev.filter(g => !(g.startRow >= minRow && g.endRow <= maxRow)));
    setSaveFeedback(`Ungrouped rows in selected range.`);
    setTimeout(() => setSaveFeedback(null), 2500);
  }, [rangeBounds]);

  const handleToggleOutlineDetails = useCallback(() => {
    setIsOutlineExpanded(prev => {
      const next = !prev;
      setRowGroups(groups => groups.map(g => ({ ...g, collapsed: !next })));
      setSaveFeedback(next ? 'Expanded all outline groups' : 'Collapsed all outline groups');
      setTimeout(() => setSaveFeedback(null), 2000);
      return next;
    });
  }, []);

  // Close context menu & dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (columnContextMenuRef.current && !columnContextMenuRef.current.contains(e.target as Node)) {
        setColumnContextMenu(null);
      }
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setShowColumnsDropdown(false);
      }
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setFilterPopoverCol(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu, columnContextMenu]);

  const isFormulaColumnSelected = useMemo(() => {
    if (!selectedCell || !selectionRange) return false;
    const header = visibleHeaders[selectedCell.col];
    return !!(header && workingFormulas[header]);
  }, [selectedCell, selectionRange, visibleHeaders, workingFormulas]);

  return (
    <div className="glass-panel glass-card rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/60 shadow-lg flex flex-col flex-1 h-full min-h-0 w-full">
      
      {/* Formula Bar */}
      <div className="flex items-center h-9 px-2 gap-2 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        {/* Name Box */}
        <input
          type="text"
          className="w-28 h-7 text-center px-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm shrink-0"
          value={nameBoxInput}
          onChange={(e) => setNameBoxInput(e.target.value)}
          onFocus={() => setIsNameBoxFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              setIsNameBoxFocused(false);
              setNameBoxInput(getNameBoxNotation());
            }, 150);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleNameBoxNavigation();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setNameBoxInput(getNameBoxNotation());
              e.currentTarget.blur();
            }
          }}
          title="Selected Cell / Range (Type address like A1, B7:D12, or Column B, then press Enter to navigate)"
        />

        {/* Formula Bar Input Area */}
        <div className={`flex-1 h-7 flex items-center px-2.5 gap-2 border border-zinc-200 dark:border-zinc-800 rounded group relative shadow-sm ${
          isFormulaColumnSelected 
            ? 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60' 
            : 'bg-white dark:bg-zinc-900'
        }`}>
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
              if (e.key === 'Enter') {
                commitFormulaBarEdit();
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') {
                cancelFormulaBarEdit();
                e.currentTarget.blur();
              }
            }}
            placeholder="Enter value or formula starting with ="
            readOnly={isFormulaColumnSelected}
            title={isFormulaColumnSelected ? "Formula column cell (Protected)" : "Formula Bar"}
          />
          {isFormulaColumnSelected && (
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded-sm">
                <Lock className="w-2.5 h-2.5 text-zinc-400" />
                <span>Formula</span>
              </span>
              <button
                onClick={() => {
                  const header = selectedCell ? visibleHeaders[selectedCell.col] : null;
                  if (header) {
                    setEditingFormulaCol(header);
                    setShowFormulaModal(true);
                  }
                }}
                className="h-5 px-1.5 flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 rounded cursor-pointer transition-colors"
                title="Edit the formula governing this entire column"
              >
                <Calculator className="h-2.5 w-2.5 text-indigo-500" />
                <span>Edit Formula</span>
              </button>
            </div>
          )}
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
        onScroll={(e) => {
          setScrollTop(e.currentTarget.scrollTop);
          if (contextMenu) setContextMenu(null);
          if (columnContextMenu) setColumnContextMenu(null);
        }}
        className="flex-1 min-h-[300px] overflow-auto custom-scrollbar focus:outline-none select-none relative bg-white dark:bg-[#0c0c0e]"
      >
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-max font-mono text-xs">
          {/* Sticky Column Headers */}
          <thead className={cn(isHeaderFrozen && "sticky top-0 z-20 shadow-xs")}>
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
                    onClick={() => handleHeaderClick(header, cIndex)}
                    onContextMenu={(e) => handleColumnHeaderContextMenu(header, cIndex, e)}
                    onDoubleClick={() => {
                      setRenamingHeader(header);
                      setRenameValue(header);
                      setRenameError(null);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-mono font-bold mr-0.5">{getColumnLetter(cIndex)}</span>
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

                      {/* Sort & Filter Indicators */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isFilterActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterPopoverCol(prev => prev === header ? null : header);
                            }}
                            className={cn(
                              "p-0.5 rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer",
                              (columnFilters[header] && columnFilters[header].length > 0)
                                ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 font-bold"
                                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            )}
                            title={`Filter "${header}"`}
                          >
                            <Filter className="w-3 h-3" />
                          </button>
                        )}
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
                    </div>

                    {/* Column Resizer Boundary Handle */}
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(header, e)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        const sampleRows = displayedRows.slice(0, 100);
                        const maxLen = Math.max(
                          header.length,
                          ...sampleRows.map(row => String(row[header] || '').length)
                        );
                        const newWidth = Math.max(100, Math.min(450, maxLen * 9 + 30));
                        setColumnWidths(prev => ({ ...prev, [header]: newWidth }));
                      }}
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/80 transition-colors z-10",
                        resizingCol === header && "bg-blue-600"
                      )}
                      title="Double-click to auto-fit column width"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Spreadsheet Body */}
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/60 text-[11px] bg-white dark:bg-[#0c0c0e]">
            {topSpacerHeight > 0 && (
              <tr style={{ height: `${topSpacerHeight}px` }}>
                <td colSpan={visibleHeaders.length + 1} style={{ border: 'none', padding: 0, margin: 0 }} />
              </tr>
            )}
            {visibleRows.map((row, idx) => {
              const rIndex = startIndex + idx;
              const isRowActive = rangeBounds && rIndex >= rangeBounds.minRow && rIndex <= rangeBounds.maxRow;
              const isNewRow = addedRowIds.has(row._rowId);

              return (
                <tr key={row._rowId || `row-${rIndex}`} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors">
                  {/* Fixed Row Number (#) */}
                  <td
                    onClick={() => handleSelectRow(rIndex)}
                    onContextMenu={(e) => handleContextMenu(rIndex, 0, visibleHeaders[0] || '', e, 'row')}
                    className={cn(
                      "py-2 px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 sticky left-0 font-bold text-center z-10 shadow-[1px_0_0_0_#e4e4e7] dark:shadow-[1px_0_0_0_#27272a] cursor-pointer text-[10px] select-none transition-colors",
                      isRowActive 
                        ? "bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold" 
                        : "bg-zinc-50 dark:bg-zinc-950 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                    title="Click to select entire row"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {/* Outline Group Toggle */}
                      {rowGroups.find(g => g.startRow === rIndex) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRowGroups(groups =>
                              groups.map(g => g.startRow === rIndex ? { ...g, collapsed: !g.collapsed } : g)
                            );
                          }}
                          className="w-3.5 h-3.5 flex items-center justify-center rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-blue-200 text-zinc-700 dark:text-zinc-300 font-mono text-[9px] font-bold cursor-pointer"
                          title="Toggle Outline Group"
                        >
                          {rowGroups.find(g => g.startRow === rIndex)?.collapsed ? '+' : '−'}
                        </button>
                      )}
                      {isNewRow && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Newly added row" />
                      )}
                      <span>{rIndex + 1}</span>
                    </div>
                  </td>

                  {/* Grid Data Cells */}
                  {visibleHeaders.map((header, cIndex) => {
                    const rawVal = row[header];
                    const formattedVal = formatCellValue(rawVal, rIndex, header);
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

                    const cellPadding = rowDensity === 'compact' ? 'py-1 px-2.5' : rowDensity === 'comfortable' ? 'py-3 px-3.5' : 'py-2 px-3';
                    const gridlineClass = showGridlines ? 'border-r border-b border-zinc-200/50 dark:border-zinc-800/50' : 'border-r-0 border-b-0';

                    const cellKey = `${rIndex}:${header}`;
                    const cellFormat = cellFormatting[cellKey];

                    const customStyles: React.CSSProperties = {
                      width: `${colW}px`,
                      minWidth: `${colW}px`,
                      maxWidth: `${colW}px`,
                    };

                    if (cellFormat) {
                      if (cellFormat.fontSize) {
                        customStyles.fontSize = cellFormat.fontSize;
                      }
                      if (cellFormat.color) {
                        customStyles.color = cellFormat.color;
                      }
                      if (cellFormat.bgColor) {
                        customStyles.backgroundColor = cellFormat.bgColor;
                      }
                      if (cellFormat.align) {
                        customStyles.textAlign = cellFormat.align;
                      }
                    }

                    const isWrap = cellFormat?.wrap;
                    const formatClasses = cn(
                      cellPadding,
                      gridlineClass,
                      "relative cursor-default transition-all",
                      isWrap ? "whitespace-normal break-words" : "truncate",
                      cellFormat?.bold && "font-bold",
                      cellFormat?.italic && "italic",
                      cellFormat?.underline && "underline",
                      
                      // Style Presets
                      cellFormat?.stylePreset === 'header' && "font-bold text-center bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-zinc-50",
                      cellFormat?.stylePreset === 'subheader' && "font-semibold italic bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200",
                      cellFormat?.stylePreset === 'total' && "font-bold border-t border-zinc-400 dark:border-zinc-600 border-b-4 border-double border-b-zinc-400 dark:border-b-zinc-600 text-zinc-950 dark:text-zinc-50",
                      cellFormat?.stylePreset === 'highlight' && "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium",
                      cellFormat?.stylePreset === 'warning' && "bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-medium",
                      cellFormat?.stylePreset === 'good' && "bg-green-100 dark:bg-green-950/40 text-green-900 dark:text-green-200 font-medium"
                    );

                    return (
                      <td
                        key={header}
                        id={`cell-${rIndex}-${cIndex}`}
                        style={customStyles}
                        onMouseDown={(e) => handleCellMouseDown(rIndex, cIndex, e)}
                        onMouseEnter={() => handleCellMouseEnter(rIndex, cIndex)}
                        onDoubleClick={() => startEditingCell(rIndex, cIndex)}
                        onContextMenu={(e) => handleContextMenu(rIndex, cIndex, header, e, 'cell')}
                        className={cn(
                          formatClasses,
                          formula && !cellFormat?.bgColor && "bg-indigo-50/30 dark:bg-indigo-950/20 font-mono",
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
                          <span className="text-indigo-700 dark:text-indigo-300 font-semibold" style={{ color: cellFormat?.color }}>
                            {formattedVal}
                          </span>
                        ) : (
                          <span className="text-zinc-800 dark:text-zinc-200" style={{ color: cellFormat?.color }}>
                            {formattedVal}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {bottomSpacerHeight > 0 && (
              <tr style={{ height: `${bottomSpacerHeight}px` }}>
                <td colSpan={visibleHeaders.length + 1} style={{ border: 'none', padding: 0, margin: 0 }} />
              </tr>
            )}

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
          className="fixed z-[100] w-[230px] max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 space-y-0.5 text-[12px] font-sans select-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Title Bar */}
          <div className="px-2 py-1 mb-1 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-md flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 select-none">
            <span className="truncate max-w-[150px]">
              {contextMenu.targetType === 'row' 
                ? `Row: #${contextMenu.row + 1}`
                : contextMenu.targetType === 'column'
                ? `Column: ${contextMenu.header} (${getColumnLetter(contextMenu.col)})`
                : `Cell: ${getColumnLetter(contextMenu.col)}${contextMenu.row + 1}`
              }
            </span>
            <span className="text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">
              {contextMenu.targetType.toUpperCase()}
            </span>
          </div>

          {/* Cell & Edit Actions */}
          {!workingFormulas[contextMenu.header] && (
            <button
              onClick={() => {
                startEditingCell(contextMenu.row, contextMenu.col);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                Edit Cell
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Enter</span>
            </button>
          )}

          <button
            onClick={() => {
              copyToClipboard();
              setContextMenu(null);
            }}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Copy
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+C</span>
          </button>

          {!workingFormulas[contextMenu.header] && (
            <button
              onClick={() => {
                handleClearSelectedCells();
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Eraser className="w-3.5 h-3.5 text-amber-500" />
                Clear Cell / Selection
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Del</span>
            </button>
          )}

          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

          {/* Selection Actions */}
          <button
            onClick={() => handleSelectRow(contextMenu.row)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Rows className="w-3.5 h-3.5 text-indigo-500" />
            Select Row (#{contextMenu.row + 1})
          </button>

          <button
            onClick={() => handleSelectColumn(contextMenu.col)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Columns3 className="w-3.5 h-3.5 text-indigo-500" />
            Select Column ({contextMenu.header})
          </button>

          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

          {/* Row Structure Actions */}
          <button
            onClick={() => {
              handleAddRow();
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            Add Row
          </button>

          <button
            onClick={() => {
              setDeletingRowIndex(contextMenu.row);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 text-left font-medium text-red-600 dark:text-red-400 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            Delete Row #{contextMenu.row + 1}
          </button>

          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

          <button
            onClick={() => {
              setRenamingHeader(contextMenu.header);
              setRenameValue(contextMenu.header);
              setRenameError(null);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
            Rename Column "{contextMenu.header}"
          </button>

          <button
            onClick={() => {
              handleHideColumn(contextMenu.header);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            Hide Column "{contextMenu.header}"
          </button>

          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

          {/* Find & Replace */}
          <button
            onClick={() => {
              setShowFindReplaceModal(true);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
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
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
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
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
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
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Extract Date
              </button>
              <button
                onClick={() => {
                  setActiveCleaningModal({ actionType: 'extract_time' as any, column: contextMenu.header });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Extract Time
              </button>
            </>
          )}

          {/* Formula Actions */}
          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />
          {workingFormulas[contextMenu.header] ? (
            <>
              <button
                onClick={() => {
                  setEditingFormulaCol(contextMenu.header);
                  setShowFormulaModal(true);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer transition-colors"
              >
                <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                Edit Formula ({contextMenu.header})
              </button>

              <button
                onClick={() => {
                  handleDeleteFormulaColumn(contextMenu.header);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 text-left font-medium text-red-600 dark:text-red-400 cursor-pointer transition-colors"
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
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left font-medium text-indigo-700 dark:text-indigo-300 cursor-pointer transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-indigo-500" />
              Add Formula Column...
            </button>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4b. Dedicated Column Header Context Menu */}
      {/* ---------------------------------------------------- */}
      {columnContextMenu && (
        <div
          ref={columnContextMenuRef}
          style={{ top: columnContextMenu.y, left: columnContextMenu.x }}
          className="fixed z-[100] w-[240px] max-h-[calc(100vh-24px)] overflow-y-auto custom-scrollbar bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 space-y-0.5 text-[12px] font-sans select-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Title Bar */}
          <div className="px-2 py-1 mb-1 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-md flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400 select-none">
            <span className="truncate max-w-[150px]">
              Column: {columnContextMenu.header} ({getColumnLetter(columnContextMenu.col)})
            </span>
            <span className="text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono font-bold shrink-0">COLUMN</span>
          </div>

          {/* Mini Formatting Toolbar (Excel Style) */}
          <div className="p-1 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 mb-1">
            <div className="flex items-center justify-between gap-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, bold: !curr.bold }), "Toggle Bold")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold transition-colors cursor-pointer"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, italic: !curr.italic }), "Toggle Italic")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 italic transition-colors cursor-pointer"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, underline: !curr.underline }), "Toggle Underline")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 underline transition-colors cursor-pointer"
                title="Underline"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-700 my-auto" />
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, align: 'left' }), "Align Left")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, align: 'center' }), "Align Center")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, align: 'right' }), "Align Right")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-zinc-300 dark:bg-zinc-700 my-auto" />
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, numberFormat: 'currency' }), "Format Currency")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold transition-colors cursor-pointer"
                title="Currency ($)"
              >
                <DollarSign className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => applyFormattingToSelection(curr => ({ ...curr, numberFormat: 'percent' }), "Format Percent")}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold transition-colors cursor-pointer"
                title="Percent (%)"
              >
                <Percent className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 1. Cut */}
          <button
            onClick={() => handleColumnCut(columnContextMenu.header)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Cut
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+X</span>
          </button>

          {/* 2. Copy */}
          <button
            onClick={handleColumnCopy}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Copy
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+C</span>
          </button>

          {/* 3. Clear Contents */}
          <button
            onClick={() => handleClearColumnContents(columnContextMenu.header)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Eraser className="w-3.5 h-3.5 text-amber-500" />
              Clear Contents
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Del</span>
          </button>

          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

          {/* 4. Insert Column */}
          <button
            onClick={() => handleInsertColumnAt(columnContextMenu.col)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            Insert Column
          </button>

          {/* 5. Delete Column */}
          <button
            onClick={() => handleDeleteColumn(columnContextMenu.header)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 text-left font-medium text-red-600 dark:text-red-400 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            Delete Column
          </button>

          {/* 6. Rename Column */}
          <button
            onClick={() => {
              setRenamingHeader(columnContextMenu.header);
              setRenameValue(columnContextMenu.header);
              setRenameError(null);
              setColumnContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
            Rename Column...
          </button>

          {/* 7. Column Width... */}
          <button
            onClick={() => {
              const curW = columnWidths[columnContextMenu.header] || 150;
              setColumnWidthModal({
                header: columnContextMenu.header,
                currentWidth: curW,
              });
              setCustomColumnWidthInput(String(curW));
              setColumnContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
            Column Width...
          </button>

          {/* 8. AutoFit Column Width */}
          <button
            onClick={() => handleAutoFitSingleColumn(columnContextMenu.header)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            AutoFit Column Width
          </button>

          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

          {/* 9. Format Cells... */}
          <button
            onClick={() => {
              setFormatModalCol(columnContextMenu.header);
              setColumnContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-500" />
            Format Cells...
          </button>

          {/* 10. Hide Column */}
          <button
            onClick={() => {
              handleHideColumn(columnContextMenu.header);
              setColumnContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            Hide Column
          </button>

          {/* 11. Unhide Columns */}
          <button
            onClick={() => {
              handleShowAllColumns();
              setColumnContextMenu(null);
            }}
            disabled={hiddenColumns.size === 0}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left font-medium transition-colors",
              hiddenColumns.size > 0 
                ? "hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 cursor-pointer" 
                : "opacity-40 cursor-not-allowed text-zinc-400 dark:text-zinc-600"
            )}
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            Unhide Columns {hiddenColumns.size > 0 ? `(${hiddenColumns.size})` : ''}
          </button>

          <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />

          {/* 12. Change Data Type */}
          {!workingFormulas[columnContextMenu.header] && (
            <button
              onClick={() => {
                setTypeModalCol(columnContextMenu.header);
                setColumnContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Change Data Type...
            </button>
          )}

          {/* 13. Split Column... */}
          {!workingFormulas[columnContextMenu.header] && (
            <button
              onClick={() => {
                setActiveCleaningModal({ actionType: 'split_column' as any, column: columnContextMenu.header });
                setColumnContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
            >
              <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-600" />
              Split Column...
            </button>
          )}

          {/* 14. Extract Date */}
          {!workingFormulas[columnContextMenu.header] && (
            <button
              onClick={() => {
                setActiveCleaningModal({ actionType: 'extract_date' as any, column: columnContextMenu.header });
                setColumnContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Extract Date
            </button>
          )}

          {/* 15. Extract Time */}
          {!workingFormulas[columnContextMenu.header] && (
            <button
              onClick={() => {
                setActiveCleaningModal({ actionType: 'extract_time' as any, column: columnContextMenu.header });
                setColumnContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-left font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Extract Time
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
        selectedCellCount={
          (rangeBounds && displayedRows.length > 0 && rangeBounds.minRow === 0 && rangeBounds.maxRow === displayedRows.length - 1 && rangeBounds.minCol === rangeBounds.maxCol)
            ? 0
            : selectedCellCount
        }
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

      {/* Column Width Modal (Phase 8P-2W) */}
      {columnWidthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Column Width</h3>
              </div>
              <button 
                onClick={() => setColumnWidthModal(null)} 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Column Width (pixels) for <span className="font-bold text-zinc-900 dark:text-zinc-100">{columnWidthModal.header}</span>:
              </label>
              <input
                type="number"
                min="50"
                max="800"
                step="5"
                autoFocus
                value={customColumnWidthInput}
                onChange={(e) => setCustomColumnWidthInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const w = parseInt(customColumnWidthInput, 10);
                    if (!isNaN(w) && w >= 50 && w <= 800) {
                      setColumnWidths(prev => ({ ...prev, [columnWidthModal.header]: w }));
                      setColumnWidthModal(null);
                    }
                  } else if (e.key === 'Escape') {
                    setColumnWidthModal(null);
                  }
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              />
              <div className="flex gap-1.5 pt-1">
                {[100, 150, 200, 260].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomColumnWidthInput(String(preset))}
                    className="flex-1 py-1 text-[10px] font-mono font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                  >
                    {preset}px
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setColumnWidthModal(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const w = parseInt(customColumnWidthInput, 10);
                  if (!isNaN(w) && w >= 50 && w <= 800) {
                    setColumnWidths(prev => ({ ...prev, [columnWidthModal.header]: w }));
                    setColumnWidthModal(null);
                  }
                }}
                className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Phase 8P-2W Floating AutoFilter Popover */}
      {filterPopoverCol && (
        <div
          ref={filterPopoverRef}
          className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 w-64 text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: '180px',
            left: '280px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2">
            <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Filter: {filterPopoverCol}
            </span>
            <button
              onClick={() => setFilterPopoverCol(null)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search values */}
          <div className="relative mb-2">
            <Search className="w-3 h-3 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search values..."
              value={filterSearchTerm}
              onChange={(e) => setFilterSearchTerm(e.target.value)}
              className="w-full pl-6 pr-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Select all / clear buttons */}
          <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 mb-2 px-0.5">
            <button
              type="button"
              onClick={() => {
                const distinct = Array.from(new Set(workingData.map(r => String(r[filterPopoverCol] ?? ''))));
                setColumnFilters(prev => ({ ...prev, [filterPopoverCol]: distinct }));
              }}
              className="hover:underline font-semibold cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => {
                setColumnFilters(prev => ({ ...prev, [filterPopoverCol]: [] }));
              }}
              className="hover:underline font-semibold cursor-pointer"
            >
              Clear All
            </button>
          </div>

          {/* Value List */}
          <div className="max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md p-1 space-y-1 custom-scrollbar">
            {Array.from(new Set(workingData.map(r => String(r[filterPopoverCol] ?? ''))))
              .filter(val => val.toLowerCase().includes(filterSearchTerm.toLowerCase()))
              .map(val => {
                const allDistinct = Array.from(new Set(workingData.map(r => String(r[filterPopoverCol] ?? ''))));
                const currentSelected = columnFilters[filterPopoverCol] ?? allDistinct;
                const isChecked = currentSelected.includes(val);
                return (
                  <label key={val} className="flex items-center gap-2 px-1.5 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer text-zinc-700 dark:text-zinc-300 select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const current = columnFilters[filterPopoverCol] || allDistinct;
                        let next: string[];
                        if (e.target.checked) {
                          next = [...current, val];
                        } else {
                          next = current.filter(v => v !== val);
                        }
                        setColumnFilters(prev => ({ ...prev, [filterPopoverCol]: next }));
                      }}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span className="truncate">{val === '' ? '(Blanks)' : val}</span>
                  </label>
                );
              })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setColumnFilters(prev => {
                  const next = { ...prev };
                  delete next[filterPopoverCol];
                  return next;
                });
                setFilterPopoverCol(null);
              }}
              className="text-xs h-7 px-2 text-zinc-600 dark:text-zinc-400"
            >
              Reset
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setFilterPopoverCol(null)}
              className="text-xs h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Apply Filter
            </Button>
          </div>
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
