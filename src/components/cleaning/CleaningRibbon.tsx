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
  ChevronDown, Grid, Lock, EyeOff
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
  // Cleaning actions
  onCleanData?: () => void;
  onQualityAudit?: () => void;
  onAICopilot?: () => void;
  onTrimWhitespace?: () => void;
  onStandardizeCapitalization?: () => void;
  onMergeVariations?: () => void;
  onFillMissing?: () => void;
  onClearCells?: () => void;
  onRemoveDuplicates?: () => void;
  onRemoveEmptyRows?: () => void;
  onSplitColumn?: () => void;
  onExtractDate?: () => void;
  onExtractTime?: () => void;
  onChangeDataType?: () => void;
  onRenameColumn?: () => void;
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
  onStandardizeCapitalization,
  onMergeVariations,
  onFillMissing,
  onClearCells,
  onRemoveDuplicates,
  onRemoveEmptyRows,
  onSplitColumn,
  onExtractDate,
  onExtractTime,
  onChangeDataType,
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

  // Unified Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<'fontSize' | 'textColor' | 'bgColor' | 'numberFormat' | 'styles' | 'condFormat' | 'hiddenColumns' | null>(null);

  const toggleDropdown = (dropdownName: 'fontSize' | 'textColor' | 'bgColor' | 'numberFormat' | 'styles' | 'condFormat' | 'hiddenColumns') => {
    setActiveDropdown(prev => prev === dropdownName ? null : dropdownName);
  };

  // Close any open dropdowns when clicking outside of any dropdown container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideDropdown = target.closest('.dropdown-container');
      if (!isInsideDropdown) {
        setActiveDropdown(null);
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
      <div className="flex items-center px-3 pt-1 gap-1 overflow-x-auto no-scrollbar border-b border-zinc-200/60 dark:border-zinc-800/60">
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
                  ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 border-zinc-200 dark:border-zinc-800 border-b-white dark:border-b-zinc-950 -mb-[1px] z-10 shadow-2xs font-bold"
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
      <div className="bg-white dark:bg-zinc-950 px-3 py-1.5 flex items-center gap-4 min-h-[56px] h-[56px] text-xs relative z-40 overflow-visible">
        {activeTab === 'home' && (
          <div className="flex items-center gap-3">
            {/* 1. Clipboard Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy} title="Copy Selection">
                  <Copy className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCut} title="Cut Selection">
                  <Scissors className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPaste} title="Paste Clipboard">
                  <ClipboardPaste className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Clipboard</span>
            </div>

            {/* 2. Font Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 font-bold" onClick={onToggleBold} title="Bold">
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 italic" onClick={onToggleItalic} title="Italic">
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 underline" onClick={onToggleUnderline} title="Underline">
                  <Underline className="h-3.5 w-3.5" />
                </Button>

                {/* Font Size Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('fontSize')}
                    className="h-7 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-mono hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
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
                    className="h-7 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-bold text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
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
                          className="w-full text-left px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            onSetTextColor?.(c.value);
                            setActiveDropdown(null);
                          }}
                        >
                          <span className="w-3 h-3 rounded-full border border-zinc-300" style={{ backgroundColor: c.value || '#18181b' }} />
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
                    className="h-7 px-1.5 flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-bold text-amber-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
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
                          className="w-full text-left px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] flex items-center gap-2 cursor-pointer"
                          onClick={() => {
                            onSetBgColor?.(c.value);
                            setActiveDropdown(null);
                          }}
                        >
                          <span className="w-3 h-3 rounded border border-zinc-300" style={{ backgroundColor: c.value || '#ffffff' }} />
                          <span className="truncate">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Font</span>
            </div>

            {/* 3. Alignment Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSetAlignment?.('left')} title="Align Left">
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSetAlignment?.('center')} title="Center">
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSetAlignment?.('right')} title="Align Right">
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[10px] px-1.5 font-bold" onClick={onToggleWrapText} title="Wrap Text">
                  Wrap
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Alignment</span>
            </div>

            {/* 4. Number Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('numberFormat')}
                    className="h-7 px-2 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                    title="Number Format"
                  >
                    <Hash className="w-3 h-3 text-blue-600" />
                    <span>Number Format</span>
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  </button>
                  {activeDropdown === 'numberFormat' && (
                    <div className="absolute left-0 mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-xl z-50 py-1">
                      {numberFormats.map(fmt => (
                        <button
                          key={fmt.value}
                          className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] cursor-pointer"
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
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Number</span>
            </div>

            {/* 5. Styles Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                {/* Cell Styles Dropdown */}
                <div className="dropdown-container relative">
                  <button 
                    onClick={() => toggleDropdown('styles')}
                    className="h-7 px-2 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                    title="Cell Styles & MIS Presets"
                  >
                    <Layers className="w-3 h-3 text-indigo-600" />
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
                    className="h-7 px-2 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                    title="Conditional Formatting"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
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
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Styles</span>
            </div>

            {/* 6. Rows & Columns Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onAddRow} title="Add Row">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Row</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onAddColumn} title="Add Column">
                  <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                  <span>Col</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" 
                  onClick={onDeleteRow} 
                  disabled={!canDeleteRow}
                  title="Delete Selected Row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAutoFitColumns} title="Auto Fit Column Width">
                  <Maximize2 className="h-3.5 w-3.5 text-zinc-600" />
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Rows & Columns</span>
            </div>

            {/* 7. Editing Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onSave} disabled={!isDirty} title="Save Changes (Ctrl+S)">
                  <Save className="h-3.5 w-3.5 text-blue-600" />
                  <span>Save</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onDiscard} disabled={!isDirty} title="Discard Changes">
                  <RotateCcw className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Discard</span>
                </Button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFindReplace} title="Find & Replace (Ctrl+F)">
                  <Search className="h-4 w-4 text-indigo-500" />
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Editing</span>
            </div>

            {/* 8. Report Group */}
            <div className="flex flex-col items-center pr-1">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold text-indigo-600" onClick={onFormatAsReport} title="Format as Professional MIS Report">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Report</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrintPreview} title="Print Preview">
                  <Printer className="h-3.5 w-3.5 text-zinc-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold text-emerald-600" onClick={onExportExcel} title="Export Cleaned Excel">
                  <Download className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Report</span>
            </div>
          </div>
        )}

        {activeTab === 'cleaning' && (
          <div className="flex items-center gap-3">
            {/* 1. Text Cleaning Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onTrimWhitespace} title="Trim Whitespace">
                  <Scissors className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Trim</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onStandardizeCapitalization} title="Standardize Capitalization">
                  <CaseSensitive className="h-3.5 w-3.5 text-blue-600" />
                  <span>Capitalize</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onFindReplace} title="Find & Replace">
                  <Replace className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Find & Replace</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onMergeVariations} title="Merge Categorical Variations">
                  <ListTree className="h-3.5 w-3.5 text-purple-600" />
                  <span>Merge Var</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Text Cleaning</span>
            </div>

            {/* 2. Missing & Values Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onFillMissing} title="Fill Missing Values">
                  <Sparkle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Fill Missing</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onClearCells} title="Clear Cell Values">
                  <Eraser className="h-3.5 w-3.5" />
                  <span>Clear Cells</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Missing & Values</span>
            </div>

            {/* 3. Row Cleaning Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onRemoveDuplicates} title="Remove Duplicate Rows">
                  <CopyX className="h-3.5 w-3.5 text-orange-600" />
                  <span>Duplicates</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onRemoveEmptyRows} title="Remove Empty Rows">
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  <span>Empty Rows</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Row Cleaning</span>
            </div>

            {/* 4. Column Cleaning Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onDeleteColumns} title="Delete Columns">
                  <Columns3 className="h-3.5 w-3.5" />
                  <span>Delete Cols</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onRenameColumn} title="Rename Column">
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Rename Col</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Column Cleaning</span>
            </div>

            {/* 5. Transform Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onSplitColumn} title="Split Column">
                  <SplitSquareVertical className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Split</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onExtractDate} title="Extract Date">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Date</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onExtractTime} title="Extract Time">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Time</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 px-2 font-bold" onClick={onChangeDataType} title="Change Data Type">
                  <Database className="h-3.5 w-3.5 text-amber-600" />
                  <span>Data Type</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Transform</span>
            </div>

            {/* 6. Quality Group */}
            <div className="flex flex-col items-center pr-1">
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 px-2 font-bold" onClick={onQualityAudit} title="Open Quality Audit Scanner">
                  <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                  <span>Quality Audit</span>
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 px-2 font-bold text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20" onClick={onAICopilot} title="AI Data Cleaning Copilot">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Copilot</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Quality</span>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="flex items-center px-2 py-1 text-xs text-zinc-400 italic">
            Data tools and features will appear here.
          </div>
        )}

        {activeTab === 'view' && (
          <div className="flex items-center gap-3">
            {/* 1. Window / Freeze Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button 
                  variant={isHeaderFrozen ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-bold" 
                  onClick={onToggleFreezeHeader}
                  title="Freeze / Unfreeze Header Row"
                >
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isHeaderFrozen ? 'Header Frozen' : 'Freeze Header'}</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Window</span>
            </div>

            {/* 2. Show / Hide Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button 
                  variant={showGridlines ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-bold" 
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
                    className="h-7 px-2 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                    title="Manage Hidden Columns"
                  >
                    <EyeOff className="w-3 h-3 text-amber-600" />
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
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Show / Hide</span>
            </div>

            {/* 3. Row Density Group */}
            <div className="flex flex-col items-center border-r border-zinc-200 dark:border-zinc-800 pr-3">
              <div className="flex items-center gap-1">
                <Button 
                  variant={rowDensity === 'compact' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] px-2 font-bold" 
                  onClick={() => onChangeRowDensity?.('compact')}
                  title="Compact Row Density"
                >
                  Compact
                </Button>
                <Button 
                  variant={rowDensity === 'normal' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] px-2 font-bold" 
                  onClick={() => onChangeRowDensity?.('normal')}
                  title="Normal Row Density"
                >
                  Normal
                </Button>
                <Button 
                  variant={rowDensity === 'comfortable' ? "secondary" : "ghost"} 
                  size="sm" 
                  className="h-7 text-[11px] px-2 font-bold" 
                  onClick={() => onChangeRowDensity?.('comfortable')}
                  title="Comfortable Row Density"
                >
                  Comfortable
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Row Density</span>
            </div>

            {/* 4. AutoFit Group */}
            <div className="flex flex-col items-center pr-1">
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-bold text-blue-600" 
                  onClick={onAutoFitColumns}
                  title="Auto Fit Column Widths"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Fit Widths</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[11px] gap-1 px-2 font-bold text-emerald-600" 
                  onClick={onAutoFitRows}
                  title="Auto Fit Row Heights"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Fit Heights</span>
                </Button>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium mt-0.5">AutoFit</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
