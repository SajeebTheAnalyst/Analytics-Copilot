import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { 
  Save, RotateCcw, Undo2, Redo2, Search, Plus, PlusCircle, Trash2,
  Wrench, ShieldAlert, Sparkles, Scissors, CaseSensitive, Replace,
  ListTree, Sparkle, Eraser, CopyX, Columns3, SplitSquareVertical,
  Calendar, Clock, Database, Copy, ClipboardPaste, Edit3,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Hash, Percent, DollarSign, Layers, FileText, Printer, Download, Maximize2,
  ChevronDown, ChevronLeft, ChevronRight, Grid, Lock, EyeOff, Wand2, ListOrdered, ArrowUp,
  ArrowDownAZ, ArrowUpAZ, Filter, FilterX, ArrowDown, ArrowRight,
  ShieldCheck, AlertTriangle, FolderPlus, FolderMinus, Eye, Columns,
  Calculator, Sigma, Sliders, Tag, GitMerge, CheckCircle2, Binary, Variable
} from 'lucide-react';

export type RibbonTabId = 'home' | 'cleaning' | 'data' | 'view';

export interface RibbonTab {
  id: RibbonTabId;
  label: string;
}

export const RIBBON_TABS: RibbonTab[] = [
  { id: 'home', label: 'Home' },
  { id: 'cleaning', label: 'Data Cleaning' },
  { id: 'data', label: 'Data' },
  { id: 'view', label: 'View' },
];

interface CleaningRibbonProps {
  activeTab: RibbonTabId;
  onTabChange: (tab: RibbonTabId) => void;
  // Home actions
  onSave?: () => void;
  onDiscard?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isDirty?: boolean;
  onFindReplace?: () => void;
  onAddRow?: () => void;
  onAddColumn?: () => void;
  onDeleteRow?: () => void;
  canDeleteRow?: boolean;
  onDeleteColumns?: () => void;
  // Font & Style
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleUnderline?: () => void;
  onSetFontSize?: (size: string) => void;
  onSetTextColor?: (color: string) => void;
  onSetBgColor?: (color: string) => void;
  onSetAlignment?: (align: 'left' | 'center' | 'right') => void;
  onToggleWrapText?: () => void;
  onSetNumberFormat?: (format: string) => void;
  onApplyStyle?: (styleName: string) => void;
  onApplyConditionalFormatting?: (rule: string) => void;
  onAutoFitColumns?: () => void;
  onAutoFitRows?: () => void;
  onFormatAsReport?: () => void;
  onPrintPreview?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  showGridlines?: boolean;
  onToggleGridlines?: () => void;
  rowDensity?: 'compact' | 'normal' | 'comfortable';
  onChangeRowDensity?: (density: 'compact' | 'normal' | 'comfortable') => void;
  isHeaderFrozen?: boolean;
  onToggleFreezeHeader?: () => void;
  hiddenColumns?: Set<string>;
  onUnhideColumn?: (header: string) => void;
  onUnhideAllColumns?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  // Cleaning actions (Phase 8P-2X)
  onCleanData?: () => void;
  onQualityAudit?: () => void;
  onAICopilot?: () => void;
  onTrimWhitespace?: () => void;
  onCleanCharacters?: (mode?: 'all_non_printable' | 'control_chars' | 'strip_symbols') => void;
  onCapitalizeCase?: (style?: 'title' | 'upper' | 'lower' | 'sentence') => void;
  onStandardizeCapitalization?: () => void;
  onMergeVariations?: () => void;
  onExtractBeforeDelimiter?: () => void;
  onExtractAfterDelimiter?: () => void;
  onExtractBetweenDelimiters?: () => void;
  onExtractDate?: () => void;
  onExtractTime?: () => void;
  onFlashFill?: () => void;
  onFillUp?: () => void;
  onFillSeries?: () => void;
  onFillMissing?: () => void;
  onClearCells?: () => void;
  onRemoveDuplicates?: () => void;
  onRemoveEmptyRows?: () => void;
  onRemoveBlankColumns?: () => void;
  onSplitColumn?: () => void;
  onChangeDataType?: () => void;
  onRenameColumn?: () => void;
  // Phase 8P-2Y Transform & Formula Ribbon Actions
  onReplaceValues?: () => void;
  onMergeCategories?: () => void;
  onStandardizeValuesMode?: (mode?: 'all' | 'text' | 'dates' | 'numbers' | 'booleans') => void;
  onChangeDataTypeOption?: (type?: string) => void;
  onFormulaColumnPreset?: (presetName?: string) => void;
  onCustomFormula?: () => void;
  onCalculateColumn?: (calcType?: 'percent_of_total' | 'running_total' | 'multiply_factor' | 'add_constant' | 'diff_prev_row' | 'z_score') => void;
  onConditionalTransform?: (condType?: string) => void;
  // Data Ribbon actions (Phase 8P-2W)
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
}

export function CleaningRibbon({ 
  activeTab, 
  onTabChange,
  onSave,
  onDiscard,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isDirty = false,
  onFindReplace,
  onAddRow,
  onAddColumn,
  onDeleteRow,
  canDeleteRow = false,
  onDeleteColumns,
  onRenameColumn,
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
  onExportPdf,
  onCopy,
  onCut,
  onPaste,
  onCleanData,
  onQualityAudit,
  onAICopilot,
  onTrimWhitespace,
  onCleanCharacters,
  onCapitalizeCase,
  onStandardizeCapitalization,
  onMergeVariations,
  onExtractBeforeDelimiter,
  onExtractAfterDelimiter,
  onExtractBetweenDelimiters,
  onExtractDate,
  onExtractTime,
  onFlashFill,
  onFillUp,
  onFillSeries,
  onFillMissing,
  onClearCells,
  onRemoveDuplicates,
  onRemoveEmptyRows,
  onRemoveBlankColumns,
  onSplitColumn,
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
  isFilterActive = false,
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
  isOutlineExpanded = true,
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Unified Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<
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
    | null
  >(null);

  const updateScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    updateScrollState();
    const timer = setTimeout(updateScrollState, 100);
    window.addEventListener('resize', updateScrollState);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [activeTab]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  const handleWheelScroll = (e: React.WheelEvent) => {
    if (!scrollContainerRef.current) return;
    if (e.deltaX !== 0) return;
    if (Math.abs(e.deltaY) > 0) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
      updateScrollState();
    }
  };

  const toggleDropdown = (
    dropdownName: 
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
      | 'conditionalTransformMenu',
    e?: React.MouseEvent
  ) => {
    setActiveDropdown(prev => {
      if (prev === dropdownName) {
        setDropdownPos(null);
        return null;
      }
      if (e && e.currentTarget) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + 2,
          left: Math.min(rect.left, (window.innerWidth || 1024) - 230),
        });
      }
      return dropdownName;
    });
  };

  // Close any open dropdowns when clicking outside of any dropdown container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideDropdown = target.closest('.dropdown-container');
      if (!isInsideDropdown) {
        setActiveDropdown(null);
        setDropdownPos(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close any open dropdowns when scrolling anywhere on the page
  useEffect(() => {
    const handleScroll = () => {
      setActiveDropdown(null);
      setDropdownPos(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
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
      <div className="flex items-center px-3 pt-1 gap-1 overflow-x-auto no-scrollbar border-b border-zinc-200/80 dark:border-zinc-800/80">
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

      {/* Ribbon Toolbar Content Area */}
      <div className="bg-white dark:bg-zinc-950 py-1 flex items-center min-h-[62px] h-[62px] text-xs relative z-40">
        {/* Subtle Compact Left Scroll Chevron */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={handleScrollLeft}
            className="absolute left-0 top-0 bottom-0 z-30 w-7 flex items-center justify-center bg-gradient-to-r from-white via-white/95 dark:from-zinc-950 dark:via-zinc-950/95 to-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-opacity cursor-pointer shadow-xs"
            title="Scroll ribbon left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Ribbon Groups Container */}
        <div 
          ref={scrollContainerRef}
          onScroll={() => {
            updateScrollState();
            if (activeDropdown) {
              setActiveDropdown(null);
              setDropdownPos(null);
            }
          }}
          onWheel={handleWheelScroll}
          className="w-full h-full flex items-center overflow-x-auto no-scrollbar scroll-smooth px-2.5"
        >
        {activeTab === 'home' && (
          <div className="flex items-center h-full">
            {/* 1. Clipboard Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onCopy} title="Copy Selection">
                  <Copy className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onCut} title="Cut Selection">
                  <Scissors className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onPaste} title="Paste Clipboard">
                  <ClipboardPaste className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Clipboard</span>
            </div>

            {/* 2. Font Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded font-bold" onClick={onToggleBold} title="Bold">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded italic" onClick={onToggleItalic} title="Italic">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded underline" onClick={onToggleUnderline} title="Underline">
                  <Underline className="h-3.5 w-3.5" />
                </Button>

                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                {/* Font Size Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('fontSize')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-mono hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Font Size"
                  >
                    <span>Size</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'fontSize' && (
                    <div className="absolute left-0 mt-1 w-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 py-1">
                      {fontSizes.map(sz => (
                        <button
                          key={sz}
                          className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-mono cursor-pointer"
                          onClick={() => {
                            onSetFontSize?.(sz);
                            setActiveDropdown(null);
                          }}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Text Color Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('textColor')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-bold text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Text Color"
                  >
                    <span>A</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'textColor' && (
                    <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 p-1 space-y-0.5">
                      {textColors.map(c => (
                        <button
                          key={c.value}
                          className="w-full text-left px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer rounded"
                          onClick={() => {
                            onSetTextColor?.(c.value);
                            setActiveDropdown(null);
                          }}
                        >
                          <span className="w-3 h-3 rounded-full border border-zinc-300 shrink-0" style={{ backgroundColor: c.value || '#18181b' }} />
                          <span className="truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fill Color Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('bgColor')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-bold text-amber-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Cell Background Fill"
                  >
                    <span>Fill</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'bgColor' && (
                    <div className="absolute left-0 mt-1 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 p-1 space-y-0.5">
                      {bgColors.map(c => (
                        <button
                          key={c.value}
                          className="w-full text-left px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer rounded"
                          onClick={() => {
                            onSetBgColor?.(c.value);
                            setActiveDropdown(null);
                          }}
                        >
                          <span className="w-3 h-3 rounded border border-zinc-300 shrink-0" style={{ backgroundColor: c.value || '#ffffff' }} />
                          <span className="truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Font</span>
            </div>

            {/* 3. Alignment Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={() => onSetAlignment?.('left')} title="Align Left">
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={() => onSetAlignment?.('center')} title="Center">
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={() => onSetAlignment?.('right')} title="Align Right">
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 font-medium rounded" onClick={onToggleWrapText} title="Wrap Text">
                  Wrap
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Alignment</span>
            </div>

            {/* 4. Number Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('numberFormat')}
                    className="h-7 px-2.5 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Number Format"
                  >
                    <Hash className="w-3.5 h-3.5 text-blue-600" />
                    <span>Number Format</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'numberFormat' && (
                    <div className="absolute left-0 mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 py-1">
                      {numberFormats.map(fmt => (
                        <button
                          key={fmt.value}
                          className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] cursor-pointer"
                          onClick={() => {
                            onSetNumberFormat?.(fmt.value);
                            setActiveDropdown(null);
                          }}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Number</span>
            </div>

            {/* 5. Styles Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1.5 pt-0.5">
                {/* Cell Styles Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('styles')}
                    className="h-7 px-2.5 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Cell Styles & MIS Presets"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cell Styles</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'styles' && (
                    <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 py-1">
                      {stylePresets.map(st => (
                        <button
                          key={st.value}
                          className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium cursor-pointer"
                          onClick={() => {
                            onApplyStyle?.(st.value);
                            setActiveDropdown(null);
                          }}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conditional Formatting Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('condFormat')}
                    className="h-7 px-2.5 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Conditional Formatting"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cond. Formatting</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'condFormat' && (
                    <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 py-1">
                      {condFormattingRules.map(rule => (
                        <button
                          key={rule.value}
                          className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] cursor-pointer"
                          onClick={() => {
                            onApplyConditionalFormatting?.(rule.value);
                            setActiveDropdown(null);
                          }}
                        >
                          {rule.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Styles</span>
            </div>

            {/* 6. Rows & Columns Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-medium rounded" onClick={onAddRow} title="Add Row">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Row</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-medium rounded" onClick={onAddColumn} title="Add Column">
                  <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                  <span>Col</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" 
                  onClick={onDeleteRow} 
                  disabled={!canDeleteRow}
                  title="Delete Selected Row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onAutoFitColumns} title="Auto Fit Column Width">
                  <Maximize2 className="h-3.5 w-3.5 text-zinc-600" />
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Rows & Columns</span>
            </div>

            {/* 7. Editing Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-medium rounded" onClick={onSave} disabled={!isDirty} title="Save Changes (Ctrl+S)">
                  <Save className="h-3.5 w-3.5 text-blue-600" />
                  <span>Save</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-medium rounded" onClick={onDiscard} disabled={!isDirty} title="Discard Changes">
                  <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Discard</span>
                </Button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onFindReplace} title="Find & Replace (Ctrl+F)">
                  <Search className="h-3.5 w-3.5 text-indigo-500" />
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Editing</span>
            </div>

            {/* 8. Report Group */}
            <div className="flex flex-col items-center justify-between h-full px-2">
              <div className="flex items-center gap-1 pt-0.5">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-semibold text-indigo-600 dark:text-indigo-400 rounded" onClick={onFormatAsReport} title="Format as Professional MIS Report">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Report</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={onPrintPreview} title="Print Preview">
                  <Printer className="h-3.5 w-3.5 text-zinc-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-semibold text-emerald-600 dark:text-emerald-400 rounded" onClick={onExportExcel} title="Export Cleaned Excel">
                  <Download className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Report</span>
            </div>
          </div>
        )}

        {activeTab === 'cleaning' && (
          <div className="flex items-center h-full">
            {/* 1. Text Cleaning Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onTrimWhitespace} 
                  title="Trim Leading, Trailing, and Excess Spaces"
                >
                  <Scissors className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Trim Spaces</span>
                </Button>

                {/* Clean Characters Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={() => toggleDropdown('cleanChars')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Clean Non-Printable Characters & Hidden Symbols"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-amber-500" />
                    <span>Clean Chars</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'cleanChars' && (
                    <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCleanCharacters?.('all_non_printable');
                          setActiveDropdown(null);
                        }}
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>All Non-Printable Characters</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCleanCharacters?.('control_chars');
                          setActiveDropdown(null);
                        }}
                      >
                        <Hash className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Control Characters (\x00-\x1F)</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCleanCharacters?.('strip_symbols');
                          setActiveDropdown(null);
                        }}
                      >
                        <Scissors className="w-3.5 h-3.5 text-red-500" />
                        <span>Strip Special Symbols</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Capitalize / UPPERCASE / lowercase Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={() => toggleDropdown('cleanCase')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Change Letter Case & Capitalization"
                  >
                    <CaseSensitive className="h-3.5 w-3.5 text-blue-600" />
                    <span>Case</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'cleanCase' && (
                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCapitalizeCase?.('title');
                          setActiveDropdown(null);
                        }}
                      >
                        <span>Capitalize Each Word</span>
                        <span className="text-[10px] text-zinc-400 font-mono">Title Case</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCapitalizeCase?.('upper');
                          setActiveDropdown(null);
                        }}
                      >
                        <span>UPPERCASE</span>
                        <span className="text-[10px] text-zinc-400 font-mono">ALL CAPS</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCapitalizeCase?.('lower');
                          setActiveDropdown(null);
                        }}
                      >
                        <span>lowercase</span>
                        <span className="text-[10px] text-zinc-400 font-mono">small letters</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center justify-between cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCapitalizeCase?.('sentence');
                          setActiveDropdown(null);
                        }}
                      >
                        <span>Sentence case</span>
                        <span className="text-[10px] text-zinc-400 font-mono">First letter</span>
                      </button>
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFindReplace} 
                  title="Find & Replace"
                >
                  <Replace className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Find & Replace</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Text Cleaning</span>
            </div>

            {/* 2. Split & Extract Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onTextToColumns || onSplitColumn} 
                  title="Text to Columns: Split delimited text into separate columns"
                >
                  <SplitSquareVertical className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Text to Cols</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onSplitColumn} 
                  title="Split Column by Delimiter (Comma, Space, Custom)"
                >
                  <Columns3 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Split Delim</span>
                </Button>

                {/* Extract Dropdown Menu */}
                <div className="dropdown-container relative">
                  <button
                    onClick={() => toggleDropdown('extractMenu')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Extract Substrings, Dates, and Times"
                  >
                    <ListTree className="h-3.5 w-3.5 text-purple-600" />
                    <span>Extract</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'extractMenu' && (
                    <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onExtractBeforeDelimiter?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Scissors className="w-3.5 h-3.5 text-purple-500" />
                        <span>Extract Before Delimiter...</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onExtractAfterDelimiter?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Scissors className="w-3.5 h-3.5 text-blue-500" />
                        <span>Extract After Delimiter...</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onExtractBetweenDelimiters?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Columns3 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Extract Between Delimiters...</span>
                      </button>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onExtractDate?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Extract Date (YYYY-MM-DD)</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onExtractTime?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Extract Time (HH:MM:SS)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Split & Extract</span>
            </div>

            {/* 3. Transform Group (Phase 8P-2Y) */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                {/* Change Data Type Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={() => toggleDropdown('dataTypeMenu')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300"
                    title="Change Data Type of Selected Column"
                  >
                    <Binary className="h-3.5 w-3.5 text-blue-600" />
                    <span>Data Type</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'dataTypeMenu' && (
                    <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onChangeDataType?.();
                          setActiveDropdown(null);
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
                          className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                          onClick={() => {
                            onChangeDataTypeOption?.(t.type);
                            setActiveDropdown(null);
                          }}
                        >
                          <t.icon className={cn("w-3.5 h-3.5", t.color)} />
                          <span>Convert to {t.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onReplaceValues} 
                  title="Find and Replace Values in Column or Selection"
                >
                  <Replace className="h-3.5 w-3.5 text-amber-600" />
                  <span>Replace Values</span>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onMergeCategories} 
                  title="Merge Categorical Variations & Misspellings"
                >
                  <GitMerge className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Merge Categories</span>
                </Button>

                {/* Standardize Values Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={(e) => toggleDropdown('standardizeMenu', e)}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-emerald-700 dark:text-emerald-400"
                    title="Standardize and Normalize Formats across Column"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Standardize</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'standardizeMenu' && (
                    <div 
                      className="fixed z-[100] w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1"
                      style={dropdownPos ? { top: `${dropdownPos.top}px`, left: `${Math.max(8, dropdownPos.left)}px` } : undefined}
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300 font-semibold"
                        onClick={() => {
                          onStandardizeValuesMode?.('all');
                          setActiveDropdown(null);
                        }}
                      >
                        <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Standardize All Formats</span>
                      </button>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onStandardizeValuesMode?.('text');
                          setActiveDropdown(null);
                        }}
                      >
                        <CaseSensitive className="w-3.5 h-3.5 text-blue-600" />
                        <span>Text & Extra Whitespaces</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onStandardizeValuesMode?.('dates');
                          setActiveDropdown(null);
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dates to ISO (YYYY-MM-DD)</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onStandardizeValuesMode?.('numbers');
                          setActiveDropdown(null);
                        }}
                      >
                        <Hash className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Clean Numeric Values</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onStandardizeValuesMode?.('booleans');
                          setActiveDropdown(null);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Boolean Flags (TRUE/FALSE)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Transform</span>
            </div>

            {/* 4. Formula & Advanced Group (Phase 8P-2Y) */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                {/* Formula Column Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={(e) => toggleDropdown('formulaColumnMenu', e)}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-indigo-700 dark:text-indigo-400"
                    title="Insert or Manage Formula Column"
                  >
                    <Calculator className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Formula Column</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'formulaColumnMenu' && (
                    <div 
                      className="fixed z-[100] w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1"
                      style={dropdownPos ? { top: `${dropdownPos.top}px`, left: `${Math.max(8, dropdownPos.left)}px` } : undefined}
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300 font-semibold"
                        onClick={() => {
                          onCustomFormula?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Create / Edit Formula Column...</span>
                      </button>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onFormulaColumnPreset?.('profit');
                          setActiveDropdown(null);
                        }}
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Profit = Revenue - Cost</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onFormulaColumnPreset?.('margin');
                          setActiveDropdown(null);
                        }}
                      >
                        <Percent className="w-3.5 h-3.5 text-purple-600" />
                        <span>Margin % = (Profit / Revenue) * 100</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onFormulaColumnPreset?.('total');
                          setActiveDropdown(null);
                        }}
                      >
                        <Sigma className="w-3.5 h-3.5 text-blue-600" />
                        <span>Total = Column_A + Column_B</span>
                      </button>
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onCustomFormula} 
                  title="Open Interactive Custom Formula Builder"
                >
                  <Variable className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Custom Formula</span>
                </Button>

                {/* Calculate Column Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={(e) => toggleDropdown('calculateColumnMenu', e)}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-blue-700 dark:text-blue-400"
                    title="Calculate Derived Statistical / Math Columns"
                  >
                    <Sigma className="h-3.5 w-3.5 text-blue-600" />
                    <span>Calculate</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'calculateColumnMenu' && (
                    <div 
                      className="fixed z-[100] w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1"
                      style={dropdownPos ? { top: `${dropdownPos.top}px`, left: `${Math.max(8, dropdownPos.left)}px` } : undefined}
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCalculateColumn?.('percent_of_total');
                          setActiveDropdown(null);
                        }}
                      >
                        <Percent className="w-3.5 h-3.5 text-purple-600" />
                        <span>% of Column Total</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCalculateColumn?.('running_total');
                          setActiveDropdown(null);
                        }}
                      >
                        <Sigma className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cumulative Running Total</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCalculateColumn?.('multiply_factor');
                          setActiveDropdown(null);
                        }}
                      >
                        <Hash className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Multiply by Factor (e.g. 1.1x)</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCalculateColumn?.('diff_prev_row');
                          setActiveDropdown(null);
                        }}
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Difference vs Prev Row</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onCalculateColumn?.('z_score');
                          setActiveDropdown(null);
                        }}
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        <span>Z-Score Normalization</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Conditional Transform Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={() => toggleDropdown('conditionalTransformMenu')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-purple-700 dark:text-purple-400"
                    title="Conditional If-Then and Categorization Rules"
                  >
                    <Sliders className="h-3.5 w-3.5 text-purple-600" />
                    <span>Conditional</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'conditionalTransformMenu' && (
                    <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onConditionalTransform?.('if_then');
                          setActiveDropdown(null);
                        }}
                      >
                        <Sliders className="w-3.5 h-3.5 text-purple-600" />
                        <span>IF - THEN - ELSE Rule...</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onConditionalTransform?.('bins');
                          setActiveDropdown(null);
                        }}
                      >
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                        <span>Category Bins (High / Low)</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        onClick={() => {
                          onConditionalTransform?.('outliers');
                          setActiveDropdown(null);
                        }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Flag Outliers / Anomalies</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Formula & Advanced</span>
            </div>

            {/* 5. Smart Fill Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30" 
                  onClick={onFlashFill} 
                  title="Flash Fill: Automatically extract or combine patterns across rows"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Flash Fill</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFillDown} 
                  title="Fill Down: Copy top value down through empty cells (Ctrl+D)"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Fill Down</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFillUp} 
                  title="Fill Up: Copy bottom value up through empty cells"
                >
                  <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
                  <span>Fill Up</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFillSeries} 
                  title="Fill Series: Generate numeric sequences (1, 2, 3...)"
                >
                  <ListOrdered className="h-3.5 w-3.5 text-teal-600" />
                  <span>Fill Series</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Smart Fill</span>
            </div>

            {/* 4. Missing & Duplicates Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30" 
                  onClick={onFillMissing} 
                  title="Fill Missing Values with Custom Text, Mean, Median, or Mode"
                >
                  <Sparkle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Fill Missing</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" 
                  onClick={onClearCells} 
                  title="Clear Selected Cells (Del)"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>Clear Cells</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30" 
                  onClick={onRemoveDuplicates} 
                  title="Remove Duplicate Rows"
                >
                  <CopyX className="h-3.5 w-3.5 text-orange-600" />
                  <span>Duplicates</span>
                </Button>

                {/* Remove Empty Dropdown */}
                <div className="dropdown-container relative">
                  <button
                    onClick={() => toggleDropdown('removeEmptyMenu')}
                    className="h-7 px-2 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer text-red-600 dark:text-red-400"
                    title="Remove Blank / Empty Rows or Columns"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>Remove Empty</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'removeEmptyMenu' && (
                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1">
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                        onClick={() => {
                          onRemoveEmptyRows?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Empty Rows</span>
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"
                        onClick={() => {
                          onRemoveBlankColumns?.();
                          setActiveDropdown(null);
                        }}
                      >
                        <Columns className="w-3.5 h-3.5" />
                        <span>Remove Empty Columns</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Missing & Duplicates</span>
            </div>

            {/* 5. Quality & AI Copilot Group */}
            <div className="flex flex-col items-center justify-between h-full px-2">
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1.5 px-2.5 font-semibold text-blue-600 dark:text-blue-400 rounded" 
                  onClick={onQualityAudit} 
                  title="Open Quality Audit Scanner"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Quality Audit</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1.5 px-2.5 font-semibold text-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded" 
                  onClick={onAICopilot} 
                  title="AI Data Cleaning Copilot"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Copilot</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Quality & AI</span>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="flex items-center h-full">
            {/* 1. Sort & Filter Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onSortAsc} 
                  title="Sort Ascending (A to Z / Lowest to Highest)"
                >
                  <ArrowDownAZ className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>A → Z</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onSortDesc} 
                  title="Sort Descending (Z to A / Highest to Lowest)"
                >
                  <ArrowUpAZ className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Z → A</span>
                </Button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                <Button 
                  variant={isFilterActive ? "secondary" : "ghost"} 
                  size="sm" 
                  className={cn(
                    "h-7 text-[11px] gap-1 px-2 font-medium rounded",
                    isFilterActive && "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                  )} 
                  onClick={onToggleFilter} 
                  title="Toggle AutoFilter on Headers"
                >
                  <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Filter</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" 
                  onClick={onClearFilter} 
                  title="Clear All Filters and Sorting"
                >
                  <FilterX className="h-3.5 w-3.5 text-amber-600" />
                  <span>Clear Filter</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Sort & Filter</span>
            </div>

            {/* 2. Data Tools Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30" 
                  onClick={onRemoveDuplicates} 
                  title="Remove Duplicate Rows"
                >
                  <CopyX className="h-3.5 w-3.5 text-orange-600" />
                  <span>Duplicates</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onTextToColumns || onSplitColumn} 
                  title="Text to Columns: Split delimited text into separate columns"
                >
                  <SplitSquareVertical className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Text to Cols</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onSplitColumn} 
                  title="Split Column by Delimiter or Position"
                >
                  <Columns3 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Split Col</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onChangeDataType} 
                  title="Change Column Data Type"
                >
                  <Database className="h-3.5 w-3.5 text-amber-600" />
                  <span>Data Type</span>
                </Button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFillDown} 
                  title="Fill Down: Copy top cell value down through selected rows (Ctrl+D)"
                >
                  <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Fill Down</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFillRight} 
                  title="Fill Right: Copy leftmost cell value across selected columns (Ctrl+R)"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Fill Right</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Data Tools</span>
            </div>

            {/* 3. Data Cleaning Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onTrimWhitespace} 
                  title="Trim Leading, Trailing, and Excess Spaces"
                >
                  <Scissors className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Trim Spaces</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onRemoveEmptyRows} 
                  title="Remove Empty / Blank Rows"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  <span>Blank Rows</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onRemoveBlankColumns} 
                  title="Remove Blank / Empty Columns"
                >
                  <Columns className="h-3.5 w-3.5 text-amber-600" />
                  <span>Blank Cols</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onFindErrors} 
                  title="Find & Highlight Errors or Missing Data in Dataset"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Find Errors</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                  onClick={onStandardizeValues || onStandardizeCapitalization} 
                  title="Standardize Values & Capitalization"
                >
                  <CaseSensitive className="h-3.5 w-3.5 text-blue-600" />
                  <span>Standardize</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Data Cleaning</span>
            </div>

            {/* 4. Data Validation Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded" 
                  onClick={onValidateData} 
                  title="Validate Data Integrity & Type Conformance"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Validate Data</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" 
                  onClick={onDetectInvalidValues} 
                  title="Detect & Jump to Invalid Values"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Invalid Values</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded" 
                  onClick={onDetectMixedTypes} 
                  title="Detect Columns with Mixed Data Types"
                >
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                  <span>Mixed Types</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Data Validation</span>
            </div>

            {/* 5. Outline Group */}
            <div className="flex flex-col items-center justify-between h-full px-2">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded" 
                  onClick={onGroupRows} 
                  title="Group Selected Rows into an Outline"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-blue-600" />
                  <span>Group Rows</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded" 
                  onClick={onUngroupRows} 
                  title="Ungroup Rows"
                >
                  <FolderMinus className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Ungroup Rows</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded" 
                  onClick={onToggleOutlineDetails} 
                  title="Show / Hide Group Details"
                >
                  <Eye className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{isOutlineExpanded ? 'Hide Details' : 'Show Details'}</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Outline</span>
            </div>
          </div>
        )}

        {activeTab === 'view' && (
          <div className="flex items-center h-full">
            {/* 1. Window / Freeze Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant={isHeaderFrozen ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2.5 font-medium rounded" 
                  onClick={onToggleFreezeHeader}
                  title="Freeze / Unfreeze Header Row"
                >
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isHeaderFrozen ? 'Header Frozen' : 'Freeze Header'}</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Window</span>
            </div>

            {/* 2. Show / Hide Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1.5 pt-0.5">
                <Button 
                  variant={showGridlines ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium rounded" 
                  onClick={onToggleGridlines}
                  title="Show / Hide Gridlines"
                >
                  <Grid className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Gridlines</span>
                </Button>

                {/* Hidden Columns Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('hiddenColumns')}
                    className="h-7 px-2.5 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-white dark:bg-zinc-900 cursor-pointer"
                    title="Manage Hidden Columns"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>Columns ({hiddenColumns?.size || 0})</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'hiddenColumns' && hiddenColumns && hiddenColumns.size > 0 && (
                    <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 py-1 overflow-hidden">
                      <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">Hidden Columns</span>
                        <button 
                          onClick={() => {
                            onUnhideAllColumns?.();
                            setActiveDropdown(null);
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
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Show / Hide</span>
            </div>

            {/* 3. Row Density Group */}
            <div className="flex flex-col items-center justify-between h-full px-2 border-r border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant={rowDensity === 'compact' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] px-2 font-medium rounded" 
                  onClick={() => onChangeRowDensity?.('compact')}
                  title="Compact Row Density"
                >
                  Compact
                </Button>
                <Button 
                  variant={rowDensity === 'normal' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] px-2 font-medium rounded" 
                  onClick={() => onChangeRowDensity?.('normal')}
                  title="Normal Row Density"
                >
                  Normal
                </Button>
                <Button 
                  variant={rowDensity === 'comfortable' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] px-2 font-medium rounded" 
                  onClick={() => onChangeRowDensity?.('comfortable')}
                  title="Comfortable Row Density"
                >
                  Comfortable
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">Row Density</span>
            </div>

            {/* 4. AutoFit Group */}
            <div className="flex flex-col items-center justify-between h-full px-2">
              <div className="flex items-center gap-1 pt-0.5">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-blue-600 dark:text-blue-400 rounded" 
                  onClick={onAutoFitColumns}
                  title="Auto Fit Column Widths"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Fit Widths</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-medium text-emerald-600 dark:text-emerald-400 rounded" 
                  onClick={onAutoFitRows}
                  title="Auto Fit Row Heights"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Fit Heights</span>
                </Button>
              </div>
              <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide pb-0.5 select-none">AutoFit</span>
            </div>
          </div>
        )}
        </div>

        {/* Subtle Compact Right Scroll Chevron */}
        {canScrollRight && (
          <button
            type="button"
            onClick={handleScrollRight}
            className="absolute right-0 top-0 bottom-0 z-30 w-7 flex items-center justify-center bg-gradient-to-l from-white via-white/95 dark:from-zinc-950 dark:via-zinc-950/95 to-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-opacity cursor-pointer shadow-xs"
            title="Scroll ribbon right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
