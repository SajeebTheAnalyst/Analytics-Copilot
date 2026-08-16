import React, { useState, useEffect, useRef } from 'react';
import { 
  Copy, 
  Scissors, 
  ClipboardPaste, 
  Bold, 
  Italic, 
  Underline, 
  ChevronDown, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Hash, 
  Layers, 
  Sparkles, 
  Plus, 
  PlusCircle, 
  Trash2, 
  Maximize2, 
  Save, 
  RotateCcw, 
  Undo2, 
  Redo2, 
  Search, 
  FileText, 
  Printer, 
  Download,
  Wand2,
  CaseSensitive,
  Replace,
  SplitSquareVertical,
  Columns3,
  ListTree,
  Calendar,
  Clock,
  Binary,
  GitMerge,
  PlusSquare,
  Workflow,
  ShieldCheck,
  Bot,
  Filter,
  ArrowUpDown,
  FileSearch,
  Grid,
  EyeOff,
  Lock,
  Percent,
  DollarSign,
  CheckCircle2,
  Calculator
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export type RibbonTabId = 'home' | 'cleaning' | 'data' | 'view';

interface RibbonTab {
  id: RibbonTabId;
  label: string;
}

const RIBBON_TABS: RibbonTab[] = [
  { id: 'home', label: 'Home' },
  { id: 'cleaning', label: 'Data Cleaning' },
  { id: 'data', label: 'Data' },
  { id: 'view', label: 'View' },
];

interface CleaningRibbonProps {
  activeTab: RibbonTabId;
  onTabChange: (tab: RibbonTabId) => void;
  // Formatting Handlers
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleUnderline?: () => void;
  onSetFontSize?: (size: string) => void;
  onSetTextColor?: (color: string) => void;
  onSetBgColor?: (color: string) => void;
  onSetAlignment?: (align: 'left' | 'center' | 'right') => void;
  onToggleWrapText?: () => void;
  onSetNumberFormat?: (format: string) => void;
  onApplyStyle?: (style: string) => void;
  onApplyConditionalFormatting?: (rule: string) => void;
  onAutoFitColumns?: () => void;
  onAutoFitRows?: () => void;
  onFormatAsReport?: () => void;
  onPrintPreview?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  // Edit Handlers
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onSave?: () => void;
  onDiscard?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isDirty?: boolean;
  // Row/Column Handlers
  onAddRow?: () => void;
  onAddColumn?: () => void;
  onDeleteRow?: () => void;
  canDeleteRow?: boolean;
  // Data Cleaning Specific Handlers
  onQualityAudit?: () => void;
  onAICopilot?: () => void;
  onTrimWhitespace?: () => void;
  onCleanCharacters?: (mode?: string) => void;
  onCapitalizeCase?: (mode?: 'title' | 'upper' | 'lower' | 'sentence') => void;
  onStandardizeCapitalization?: () => void;
  onFindReplace?: () => void;
  onMergeVariations?: () => void;
  onFillMissing?: () => void;
  onClearCells?: () => void;
  onRemoveDuplicates?: () => void;
  onRemoveEmptyRows?: () => void;
  onRemoveBlankColumns?: () => void;
  onDeleteColumns?: () => void;
  onRenameColumn?: () => void;
  onSplitColumn?: () => void;
  onExtractBeforeDelimiter?: () => void;
  onExtractAfterDelimiter?: () => void;
  onExtractBetweenDelimiters?: () => void;
  onExtractDate?: () => void;
  onExtractTime?: () => void;
  onFlashFill?: () => void;
  onFillUp?: () => void;
  onFillSeries?: () => void;
  onChangeDataType?: () => void;
  // Advanced Transform & Formula Actions
  onReplaceValues?: () => void;
  onMergeCategories?: () => void;
  onStandardizeValuesMode?: (mode: string) => void;
  onChangeDataTypeOption?: (type: string) => void;
  onFormulaColumnPreset?: (preset: string) => void;
  onCustomFormula?: () => void;
  onCalculateColumn?: () => void;
  onConditionalTransform?: () => void;
  // Data Ribbon Actions
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  onToggleFilter?: () => void;
  isFilterActive?: boolean;
  onClearFilter?: () => void;
  onTextToColumns?: () => void;
  onFillDown?: () => void;
  onFillRight?: () => void;
  onFindErrors?: () => void;
  onStandardizeValues?: () => void;
  onValidateData?: () => void;
  onDetectInvalidValues?: () => void;
  onDetectMixedTypes?: () => void;
  onGroupRows?: () => void;
  onUngroupRows?: () => void;
  onToggleOutlineDetails?: () => void;
  isOutlineExpanded?: boolean;
  // View Ribbon Actions
  showGridlines?: boolean;
  onToggleGridlines?: () => void;
  rowDensity?: 'compact' | 'normal' | 'comfortable';
  onChangeRowDensity?: (density: 'compact' | 'normal' | 'comfortable') => void;
  isHeaderFrozen?: boolean;
  onToggleFreezeHeader?: () => void;
  hiddenColumns?: Set<string>;
  onUnhideColumn?: (col: string) => void;
  onUnhideAllColumns?: () => void;
}

export function CleaningRibbon({
  activeTab,
  onTabChange,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
  onSetFontSize,
  onSetTextColor,
  onSetBgColor,
  onSetAlignment,
  onToggleWrapText,
  onSetNumberFormat,
  onApplyStyle,
  onApplyConditionalFormatting,
  onAutoFitColumns,
  onAutoFitRows,
  onFormatAsReport,
  onPrintPreview,
  onExportExcel,
  onCopy,
  onCut,
  onPaste,
  onSave,
  onDiscard,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDirty,
  onAddRow,
  onAddColumn,
  onDeleteRow,
  canDeleteRow,
  onQualityAudit,
  onAICopilot,
  onTrimWhitespace,
  onCleanCharacters,
  onCapitalizeCase,
  onFindReplace,
  onFillMissing,
  onClearCells,
  onRemoveDuplicates,
  onRemoveEmptyRows,
  onRemoveBlankColumns,
  onSplitColumn,
  onExtractBeforeDelimiter,
  onExtractAfterDelimiter,
  onExtractBetweenDelimiters,
  onExtractDate,
  onExtractTime,
  onFlashFill,
  onChangeDataType,
  onReplaceValues,
  onMergeCategories,
  onStandardizeValuesMode,
  onChangeDataTypeOption,
  onFormulaColumnPreset,
  onCustomFormula,
  onCalculateColumn,
  onConditionalTransform,
  onSortAsc,
  onSortDesc,
  onToggleFilter,
  isFilterActive,
  onClearFilter,
  onTextToColumns,
  onFillDown,
  onFillRight,
  onFindErrors,
  onStandardizeValues,
  onValidateData,
  onDetectInvalidValues,
  onDetectMixedTypes,
  onGroupRows,
  onUngroupRows,
  onToggleOutlineDetails,
  isOutlineExpanded,
  showGridlines = true,
  onToggleGridlines,
  rowDensity = 'normal',
  onChangeRowDensity,
  isHeaderFrozen = true,
  onToggleFreezeHeader,
  hiddenColumns,
  onUnhideColumn,
  onUnhideAllColumns
}: CleaningRibbonProps) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, [role="button"]')) {
      return;
    }
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    scrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    const dx = e.clientX - startXRef.current;
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - dx;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Unified Floating Dropdown State
  type DropdownType =
    | 'fontSize' 
    | 'textColor' 
    | 'bgColor' 
    | 'numberFormat' 
    | 'styles' 
    | 'condFormat' 
    | 'hiddenColumns'
    | 'cleanCase'
    | 'cleanChars'
    | 'extractMenu'
    | 'removeEmptyMenu'
    | 'dataTypeMenu'
    | 'standardizeMenu'
    | 'formulaColumnMenu'
    | 'calculateColumnMenu'
    | 'conditionalTransformMenu'
    | null;

  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);

  const toggleDropdown = (dropdownName: Exclude<DropdownType, null>, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveDropdown(prev => {
      if (prev === dropdownName) {
        setDropdownPos(null);
        return null;
      }
      if (e && e.currentTarget) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const vw = window.innerWidth || 1024;
        const menuWidth = 220;
        const left = Math.max(8, Math.min(rect.left, vw - menuWidth - 8));
        const top = rect.bottom + 4;
        setDropdownPos({ top, left });
      }
      return dropdownName;
    });
  };

  // Close open dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setActiveDropdown(null);
        setDropdownPos(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close open dropdown when scrolling anywhere
  useEffect(() => {
    const handleScroll = () => {
      setActiveDropdown(null);
      setDropdownPos(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const fontSizes = ['10px', '11px', '12px', '14px', '16px', '18px'];
  const textColors = [
    { label: 'Default', value: '' },
    { label: 'Zinc Dark', value: '#18181b' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Red', value: '#dc2626' },
    { label: 'Purple', value: '#7c3aed' },
  ];
  const bgColors = [
    { label: 'None', value: '' },
    { label: 'Light Blue', value: '#eff6ff' },
    { label: 'Light Emerald', value: '#ecfdf5' },
    { label: 'Light Amber', value: '#fffbeb' },
    { label: 'Light Red', value: '#fef2f2' },
    { label: 'Light Zinc', value: '#f4f4f5' },
  ];
  const numberFormats = [
    { label: 'General', value: 'general' },
    { label: 'Number', value: 'number' },
    { label: 'Decimal (.00)', value: 'decimal' },
    { label: 'Currency ($)', value: 'currency' },
    { label: 'Percentage (%)', value: 'percentage' },
    { label: 'Date', value: 'date' },
    { label: 'Time', value: 'time' },
  ];
  const stylePresets = [
    { label: 'Header Style', value: 'header' },
    { label: 'Subheader Style', value: 'subheader' },
    { label: 'Total Row Style', value: 'total' },
    { label: 'Highlight', value: 'highlight' },
    { label: 'Warning', value: 'warning' },
    { label: 'Good / Success', value: 'good' },
  ];
  const condFormattingRules = [
    { label: 'Greater Than 1,000', value: 'greater_than_1000' },
    { label: 'Less Than 0', value: 'less_than_0' },
    { label: 'Duplicate Values', value: 'duplicate' },
    { label: 'Data Bar Highlights', value: 'databar' },
  ];

  return (
    <div ref={ribbonRef} className="w-full shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-[#0c0c0e] select-none">
      {/* Ribbon Tabs Header */}
      <div className="flex items-center px-3 pt-1 gap-1 overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800/80">
        {RIBBON_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "px-3.5 py-1 text-xs font-medium rounded-t-md transition-colors relative cursor-pointer border-t border-x whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-zinc-200 dark:border-zinc-800 border-b-white dark:border-b-zinc-950 -mb-[1px] z-10 shadow-2xs font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 border-transparent"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 rounded-t-md" />
              )}
            </button>
          );
        })}
      </div>

      {/* Ribbon Toolbar Content Area (Compact Single Row, Thin Horizontal Navigation) */}
      <div className="bg-white dark:bg-zinc-950 flex items-center h-[62px] min-h-[62px] text-xs relative z-30 overflow-hidden">
        <div 
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full flex items-center justify-start gap-0.5 px-2 select-none min-w-0 overflow-x-auto ribbon-scrollbar cursor-grab active:cursor-grabbing"
        >
        {activeTab === 'home' && (
          <div className="flex items-center h-full min-w-0 flex-nowrap shrink-0">
            {/* 1. Clipboard Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onCopy} title="Copy Selection">
                  <Copy className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onCut} title="Cut Selection">
                  <Scissors className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onPaste} title="Paste Clipboard">
                  <ClipboardPaste className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Clipboard</span>
            </div>

            {/* 2. Font Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded font-bold" onClick={onToggleBold} title="Bold">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded italic" onClick={onToggleItalic} title="Italic">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded underline" onClick={onToggleUnderline} title="Underline">
                  <Underline className="h-3.5 w-3.5" />
                </Button>

                <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                {/* Font Size Dropdown */}
                <div className="dropdown-container">
                  <button 
                    onClick={(e) => toggleDropdown('fontSize', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-mono hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Font Size"
                  >
                    <span>Size</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                {/* Text Color Dropdown */}
                <div className="dropdown-container">
                  <button 
                    onClick={(e) => toggleDropdown('textColor', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-bold text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Text Color"
                  >
                    <span>A</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                {/* Fill Color Dropdown */}
                <div className="dropdown-container">
                  <button 
                    onClick={(e) => toggleDropdown('bgColor', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-bold text-amber-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Cell Background Fill"
                  >
                    <span>Fill</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Font</span>
            </div>

            {/* 3. Alignment Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={() => onSetAlignment?.('left')} title="Align Left">
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={() => onSetAlignment?.('center')} title="Center">
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={() => onSetAlignment?.('right')} title="Align Right">
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6.5 text-[11px] px-1.5 font-medium rounded" onClick={onToggleWrapText} title="Wrap Text">
                  Wrap
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Alignment</span>
            </div>

            {/* 4. Number Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <div className="dropdown-container">
                  <button 
                    onClick={(e) => toggleDropdown('numberFormat', e)}
                    className="h-6.5 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Number Format"
                  >
                    <Hash className="w-3.5 h-3.5 text-blue-600" />
                    <span>Number</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Number</span>
            </div>

            {/* 5. Styles Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                {/* Cell Styles Dropdown */}
                <div className="dropdown-container">
                  <button 
                    onClick={(e) => toggleDropdown('styles', e)}
                    className="h-6.5 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Cell Styles & MIS Presets"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cell Styles</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                {/* Conditional Formatting Dropdown */}
                <div className="dropdown-container">
                  <button 
                    onClick={(e) => toggleDropdown('condFormat', e)}
                    className="h-6.5 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Conditional Formatting"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cond. Formatting</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Styles</span>
            </div>

            {/* 6. Rows & Columns Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <Button variant="ghost" size="sm" className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" onClick={onAddRow} title="Add Row">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Row</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" onClick={onAddColumn} title="Add Column">
                  <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                  <span>Col</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6.5 w-6.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" 
                  onClick={onDeleteRow} 
                  disabled={!canDeleteRow}
                  title="Delete Selected Row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onAutoFitColumns} title="Auto Fit Column Width">
                  <Maximize2 className="h-3.5 w-3.5 text-zinc-600" />
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Rows & Columns</span>
            </div>

            {/* 7. Editing Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <Button variant="ghost" size="sm" className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" onClick={onSave} disabled={!isDirty} title="Save Changes (Ctrl+S)">
                  <Save className="h-3.5 w-3.5 text-blue-600" />
                  <span>Save</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" onClick={onDiscard} disabled={!isDirty} title="Discard Changes">
                  <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Discard</span>
                </Button>
                <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onFindReplace} title="Find & Replace (Ctrl+F)">
                  <Search className="h-3.5 w-3.5 text-indigo-500" />
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Editing</span>
            </div>

            {/* 8. Report Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <Button variant="ghost" size="sm" className="h-6.5 text-[11px] gap-1 px-1.5 font-semibold text-indigo-600 dark:text-indigo-400 rounded" onClick={onFormatAsReport} title="Format as Professional MIS Report">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Report</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-6.5 w-6.5 rounded" onClick={onPrintPreview} title="Print Preview">
                  <Printer className="h-3.5 w-3.5 text-zinc-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6.5 text-[11px] gap-1 px-1.5 font-semibold text-emerald-600 dark:text-emerald-400 rounded" onClick={onExportExcel} title="Export Cleaned Excel">
                  <Download className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Report</span>
            </div>
          </div>
        )}

        {activeTab === 'cleaning' && (
          <div className="flex items-center h-full min-w-0 flex-nowrap shrink-0">
            {/* 1. Quality & AI Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-2 font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded" 
                  onClick={onQualityAudit} 
                  title="Run Full Data Quality Audit"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Quality Audit</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-2 font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded" 
                  onClick={onAICopilot} 
                  title="Open AI Copilot Cleaning Assistant"
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>AI Copilot</span>
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Audit & AI</span>
            </div>

            {/* 2. Text Cleaning Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onTrimWhitespace} 
                  title="Trim Leading, Trailing, and Excess Spaces"
                >
                  <Scissors className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Trim Spaces</span>
                </Button>

                {/* Clean Characters Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('cleanChars', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Clean Non-Printable Characters & Hidden Symbols"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-amber-500" />
                    <span>Clean Chars</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                {/* Case Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('cleanCase', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Change Letter Case & Capitalization"
                  >
                    <CaseSensitive className="h-3.5 w-3.5 text-blue-600" />
                    <span>Case</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Text Cleaning</span>
            </div>

            {/* 3. Missing Data Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFillMissing} 
                  title="Fill Missing / Null Cells with Mean, Median, Mode, or Constant"
                >
                  <Wand2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Fill Missing</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onClearCells} 
                  title="Clear Contents of Selected Cells"
                >
                  <Trash2 className="h-3.5 w-3.5 text-amber-600" />
                  <span>Clear Cells</span>
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Missing Data</span>
            </div>

            {/* 4. Duplicates & Blanks Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onRemoveDuplicates} 
                  title="Deduplicate Dataset based on key columns"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  <span>Remove Duplicates</span>
                </Button>

                {/* Remove Empty Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('removeEmptyMenu', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Remove Blank Rows or Columns"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>Remove Blanks</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Duplicates & Blanks</span>
            </div>

            {/* 5. Split & Extract Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onSplitColumn} 
                  title="Split Column by Delimiter (Comma, Space, Custom)"
                >
                  <SplitSquareVertical className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Split Column</span>
                </Button>

                {/* Extract Dropdown Menu */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('extractMenu', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Extract Substrings, Dates, and Times"
                  >
                    <ListTree className="h-3.5 w-3.5 text-purple-600" />
                    <span>Extract</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFlashFill} 
                  title="Flash Fill: Auto-detect pattern from examples"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Flash Fill</span>
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Split & Extract</span>
            </div>

            {/* 6. Transform Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                {/* Data Type Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('dataTypeMenu', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Change Data Type of Selected Column"
                  >
                    <Binary className="h-3.5 w-3.5 text-blue-600" />
                    <span>Data Type</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onReplaceValues} 
                  title="Find and Replace Values in Column or Selection"
                >
                  <Replace className="h-3.5 w-3.5 text-amber-600" />
                  <span>Replace</span>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onMergeCategories} 
                  title="Merge Categorical Variations & Misspellings"
                >
                  <GitMerge className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Merge Categories</span>
                </Button>

                {/* Standardize Values Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('standardizeMenu', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-emerald-700 dark:text-emerald-400"
                    title="Standardize and Normalize Formats across Column"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Standardize</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Transform</span>
            </div>

            {/* 7. Formula & Calculation Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                {/* Formula Column Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('formulaColumnMenu', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-indigo-700 dark:text-indigo-400"
                    title="Insert or Manage Formula Column"
                  >
                    <PlusSquare className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Formula Col</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                {/* Calculate Column Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('calculateColumnMenu', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-blue-700 dark:text-blue-400"
                    title="Math Calculations between Columns"
                  >
                    <PlusSquare className="h-3.5 w-3.5 text-blue-600" />
                    <span>Calculate</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>

                {/* Conditional Transform Dropdown */}
                <div className="dropdown-container">
                  <button
                    onClick={(e) => toggleDropdown('conditionalTransformMenu', e)}
                    className="h-6.5 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-amber-700 dark:text-amber-400"
                    title="Create Conditional If/Then Rules"
                  >
                    <Workflow className="h-3.5 w-3.5 text-amber-600" />
                    <span>If / Then</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Formula & Calculation</span>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="flex items-center h-full min-w-0 flex-nowrap shrink-0">
            {/* 1. Sort & Filter Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onSortAsc}
                  title="Sort Ascending (A to Z, 0 to 9)"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-blue-600" />
                  <span>Sort A-Z</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onSortDesc}
                  title="Sort Descending (Z to A, 9 to 0)"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Sort Z-A</span>
                </Button>
                <Button 
                  variant={isFilterActive ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onToggleFilter}
                  title="Toggle Column Filter Menu"
                >
                  <Filter className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Filter</span>
                </Button>
                {isFilterActive && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6.5 text-[11px] px-1.5 font-medium text-red-600 dark:text-red-400 rounded" 
                    onClick={onClearFilter}
                    title="Clear Active Filters"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Sort & Filter</span>
            </div>

            {/* 2. Data Tools Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onTextToColumns}
                  title="Text to Columns Split Wizard"
                >
                  <SplitSquareVertical className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Text to Cols</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={onFillDown}
                  title="Fill Down (Ctrl+D)"
                >
                  Fill Down
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={onFillRight}
                  title="Fill Right (Ctrl+R)"
                >
                  Fill Right
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium text-amber-600 dark:text-amber-400 rounded" 
                  onClick={onFindErrors}
                  title="Find Cell Formula Errors (#REF!, #VALUE!)"
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  <span>Find Errors</span>
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Data Tools</span>
            </div>

            {/* 3. Data Quality & Audit Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onStandardizeValues}
                  title="Standardize Values"
                >
                  <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Standardize</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onValidateData}
                  title="Validate Data Types"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Validate</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium text-red-600 dark:text-red-400 rounded" 
                  onClick={onDetectInvalidValues}
                  title="Detect Invalid Values"
                >
                  Invalid Values
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium text-amber-600 dark:text-amber-400 rounded" 
                  onClick={onDetectMixedTypes}
                  title="Detect Mixed Data Types"
                >
                  Mixed Types
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Data Quality</span>
            </div>

            {/* 4. Outline Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={onGroupRows}
                  title="Group Selected Rows"
                >
                  Group Rows
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={onUngroupRows}
                  title="Ungroup Selected Rows"
                >
                  Ungroup
                </Button>
                <Button 
                  variant={isOutlineExpanded ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={onToggleOutlineDetails}
                  title="Toggle Group Outline Expand/Collapse"
                >
                  {isOutlineExpanded ? 'Collapse Outline' : 'Expand Outline'}
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Outline</span>
            </div>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="flex items-center h-full min-w-0 flex-nowrap shrink-0">
            {/* 1. Window & Freeze Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant={isHeaderFrozen ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onToggleFreezeHeader}
                  title="Freeze Header Row during scrolling"
                >
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isHeaderFrozen ? 'Header Frozen' : 'Freeze Header'}</span>
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Window</span>
            </div>

            {/* 2. Show / Hide Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant={showGridlines ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium rounded" 
                  onClick={onToggleGridlines}
                  title="Show / Hide Gridlines"
                >
                  <Grid className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Gridlines</span>
                </Button>

                {/* Hidden Columns Dropdown */}
                <div className="dropdown-container">
                  <button 
                    onClick={(e) => toggleDropdown('hiddenColumns', e)}
                    className="h-6.5 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Manage Hidden Columns"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>Columns ({hiddenColumns?.size || 0})</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Show / Hide</span>
            </div>

            {/* 3. Row Density Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
              <div className="flex items-center gap-0.5 pt-0.5">
                <Button 
                  variant={rowDensity === 'compact' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={() => onChangeRowDensity?.('compact')}
                  title="Compact Row Density"
                >
                  Compact
                </Button>
                <Button 
                  variant={rowDensity === 'normal' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={() => onChangeRowDensity?.('normal')}
                  title="Normal Row Density"
                >
                  Normal
                </Button>
                <Button 
                  variant={rowDensity === 'comfortable' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-6.5 text-[11px] px-1.5 font-medium rounded" 
                  onClick={() => onChangeRowDensity?.('comfortable')}
                  title="Comfortable Row Density"
                >
                  Comfortable
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">Row Density</span>
            </div>

            {/* 4. AutoFit Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 shrink-0">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium text-blue-600 dark:text-blue-400 rounded" 
                  onClick={onAutoFitColumns}
                  title="Auto Fit Column Widths"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Fit Widths</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6.5 text-[11px] gap-1 px-1.5 font-medium text-emerald-600 dark:text-emerald-400 rounded" 
                  onClick={onAutoFitRows}
                  title="Auto Fit Row Heights"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Fit Heights</span>
                </Button>
              </div>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase pb-0.5 select-none">AutoFit</span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Floating Ribbon Dropdown Overlay Layer (Outside document flow, zero effect on ribbon dimensions) */}
      {activeDropdown && dropdownPos && (
        <div 
          className="fixed z-[100] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100 dropdown-container"
          style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Font Size */}
          {activeDropdown === 'fontSize' && (
            <div className="w-28 py-1">
              {fontSizes.map(sz => (
                <button
                  key={sz}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-mono cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onSetFontSize?.(sz);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  {sz}
                </button>
              ))}
            </div>
          )}

          {/* 2. Text Color */}
          {activeDropdown === 'textColor' && (
            <div className="w-36 p-1 space-y-0.5">
              {textColors.map(c => (
                <button
                  key={c.value}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer rounded transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onSetTextColor?.(c.value);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0 shadow-xs" style={{ backgroundColor: c.value || '#18181b' }} />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 3. Fill Color */}
          {activeDropdown === 'bgColor' && (
            <div className="w-36 p-1 space-y-0.5">
              {bgColors.map(c => (
                <button
                  key={c.value}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer rounded transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onSetBgColor?.(c.value);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  <span className="w-3.5 h-3.5 rounded border border-zinc-300 dark:border-zinc-700 shrink-0 shadow-xs" style={{ backgroundColor: c.value || '#ffffff' }} />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 4. Number Format */}
          {activeDropdown === 'numberFormat' && (
            <div className="w-40 py-1">
              {numberFormats.map(fmt => (
                <button
                  key={fmt.value}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onSetNumberFormat?.(fmt.value);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          )}

          {/* 5. Cell Styles */}
          {activeDropdown === 'styles' && (
            <div className="w-44 py-1">
              {stylePresets.map(st => (
                <button
                  key={st.value}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onApplyStyle?.(st.value);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}

          {/* 6. Conditional Formatting */}
          {activeDropdown === 'condFormat' && (
            <div className="w-48 py-1">
              {condFormattingRules.map(rule => (
                <button
                  key={rule.value}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onApplyConditionalFormatting?.(rule.value);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  {rule.label}
                </button>
              ))}
            </div>
          )}

          {/* 7. Clean Chars */}
          {activeDropdown === 'cleanChars' && (
            <div className="w-56 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCleanCharacters?.('all_non_printable');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                <span>All Non-Printable Characters</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCleanCharacters?.('control_chars');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Hash className="w-3.5 h-3.5 text-indigo-500" />
                <span>Control Characters (\x00-\x1F)</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCleanCharacters?.('strip_symbols');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Scissors className="w-3.5 h-3.5 text-red-500" />
                <span>Strip Special Symbols</span>
              </button>
            </div>
          )}

          {/* 8. Clean Case */}
          {activeDropdown === 'cleanCase' && (
            <div className="w-52 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCapitalizeCase?.('title');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <span>Capitalize Each Word</span>
                <span className="text-[10px] text-zinc-400 font-mono">Title Case</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCapitalizeCase?.('upper');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <span>UPPERCASE</span>
                <span className="text-[10px] text-zinc-400 font-mono">ALL CAPS</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCapitalizeCase?.('lower');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <span>lowercase</span>
                <span className="text-[10px] text-zinc-400 font-mono">small</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCapitalizeCase?.('sentence');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <span>Sentence case</span>
                <span className="text-[10px] text-zinc-400 font-mono">First letter</span>
              </button>
            </div>
          )}

          {/* 9. Extract Menu */}
          {activeDropdown === 'extractMenu' && (
            <div className="w-56 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onExtractBeforeDelimiter?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Scissors className="w-3.5 h-3.5 text-purple-500" />
                <span>Extract Before Delimiter...</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onExtractAfterDelimiter?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Scissors className="w-3.5 h-3.5 text-blue-500" />
                <span>Extract After Delimiter...</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onExtractBetweenDelimiters?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Columns3 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Extract Between Delimiters...</span>
              </button>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onExtractDate?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Extract Date (YYYY-MM-DD)</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onExtractTime?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Extract Time (HH:MM:SS)</span>
              </button>
            </div>
          )}

          {/* 10. Data Type Menu */}
          {activeDropdown === 'dataTypeMenu' && (
            <div className="w-56 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onChangeDataType?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Binary className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold">Type Conversion Wizard...</span>
              </button>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
              {[
                { label: 'Numeric / Number', type: 'number', icon: Hash, color: 'text-emerald-600' },
                { label: 'Text / String', type: 'text', icon: CaseSensitive, color: 'text-zinc-600' },
                { label: 'Date (YYYY-MM-DD)', type: 'date', icon: Calendar, color: 'text-blue-600' },
                { label: 'Boolean (TRUE/FALSE)', type: 'boolean', icon: CheckCircle2, color: 'text-indigo-600' },
                { label: 'Currency ($)', type: 'currency', icon: DollarSign, color: 'text-emerald-600' },
                { label: 'Percentage (%)', type: 'percentage', icon: Percent, color: 'text-purple-600' },
              ].map((t) => (
                <button
                  key={t.type}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onChangeDataTypeOption?.(t.type);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  <t.icon className={cn("w-3.5 h-3.5", t.color)} />
                  <span>Convert to {t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 11. Standardize Menu */}
          {activeDropdown === 'standardizeMenu' && (
            <div className="w-56 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors font-semibold text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onStandardizeValuesMode?.('all');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Standardize All Formats</span>
              </button>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onStandardizeValuesMode?.('text');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <CaseSensitive className="w-3.5 h-3.5 text-blue-600" />
                <span>Text & Extra Whitespaces</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onStandardizeValuesMode?.('dates');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dates to ISO (YYYY-MM-DD)</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onStandardizeValuesMode?.('numbers');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>Clean Numeric Values</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onStandardizeValuesMode?.('booleans');
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Boolean Flags (TRUE/FALSE)</span>
              </button>
            </div>
          )}

          {/* 12. Formula Column Menu */}
          {activeDropdown === 'formulaColumnMenu' && (
            <div className="w-60 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors font-semibold text-indigo-600 dark:text-indigo-400"
                onClick={() => {
                  onCustomFormula?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Open Custom Formula Builder...</span>
              </button>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
              {[
                { label: 'Total Amount (= Qty * Price)', preset: 'total_amount' },
                { label: 'Full Name (= First + " " + Last)', preset: 'full_name' },
                { label: 'Year (= YEAR(Date))', preset: 'year_extract' },
                { label: 'Discount Amount (= Sales * 0.1)', preset: 'discount' },
                { label: 'Net Sales (= Gross - Discount)', preset: 'net_sales' },
              ].map((p) => (
                <button
                  key={p.preset}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                  onClick={() => {
                    onFormulaColumnPreset?.(p.preset);
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                >
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 13. Calculate Column Menu */}
          {activeDropdown === 'calculateColumnMenu' && (
            <div className="w-56 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors font-semibold text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCalculateColumn?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <PlusSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Quick Math Calculator...</span>
              </button>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCalculateColumn?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                <span>Calculate Difference (A - B)</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onCalculateColumn?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Percent className="w-3.5 h-3.5 text-purple-600" />
                <span>Percentage Change %</span>
              </button>
            </div>
          )}

          {/* 14. Conditional Transform Menu */}
          {activeDropdown === 'conditionalTransformMenu' && (
            <div className="w-60 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors font-semibold text-amber-600 dark:text-amber-400"
                onClick={() => {
                  onConditionalTransform?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>If / Then Rule Builder...</span>
              </button>
            </div>
          )}

          {/* 15. Remove Empty Menu */}
          {activeDropdown === 'removeEmptyMenu' && (
            <div className="w-52 py-1">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-red-600 dark:text-red-400 font-medium"
                onClick={() => {
                  onRemoveEmptyRows?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Entire Blank Rows</span>
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-red-600 dark:text-red-400 font-medium"
                onClick={() => {
                  onRemoveBlankColumns?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Entire Blank Columns</span>
              </button>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer transition-colors text-zinc-800 dark:text-zinc-200"
                onClick={() => {
                  onClearCells?.();
                  setActiveDropdown(null);
                  setDropdownPos(null);
                }}
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Clear Cells in Selection</span>
              </button>
            </div>
          )}

          {/* 16. Hidden Columns Menu */}
          {activeDropdown === 'hiddenColumns' && hiddenColumns && hiddenColumns.size > 0 && (
            <div className="w-52 py-1 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Hidden Columns</span>
                <button 
                  onClick={() => {
                    onUnhideAllColumns?.();
                    setActiveDropdown(null);
                    setDropdownPos(null);
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Unhide All
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {Array.from(hiddenColumns).map(col => (
                  <div key={col} className="px-3 py-1.5 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group">
                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate pr-2">{col}</span>
                    <button 
                      onClick={() => onUnhideColumn?.(col)}
                      className="text-[10px] text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium cursor-pointer"
                    >
                      Unhide
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
