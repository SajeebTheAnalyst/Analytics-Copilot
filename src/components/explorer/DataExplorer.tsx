import React, { useState, useMemo, useEffect } from 'react';
import { Dataset, ColumnFilter, SortRule, GroupingConfig, QuickMetricConfig, SavedExplorerView, ViewState } from '@/types';
import { filterDataset, sortDataset } from '@/lib/explorerEngine';
import { ExplorerHeader } from './ExplorerHeader';
import { FilterBuilder } from './FilterBuilder';
import { ColumnManagerPopover } from './ColumnManagerPopover';
import { QuickAggregationsBar } from './QuickAggregationsBar';
import { GroupAndAnalyzePanel } from './GroupAndAnalyzePanel';
import { ColumnStatsDrawer } from './ColumnStatsDrawer';
import { SavedViewsModal } from './SavedViewsModal';
import { AiExplanationModal } from './AiExplanationModal';
import { 
  Search, 
  X, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  Hash, 
  ToggleLeft, 
  Calendar, 
  CaseSensitive, 
  HelpCircle,
  FileSpreadsheet,
  Download,
  FilterX,
  Layers,
  Sparkles,
  LayoutDashboard,
  Target
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import { useDatasetStore } from '@/lib/datasetStore';

interface DataExplorerProps {
  dataset?: Dataset | null;
  allDatasets?: Dataset[];
  onSelectDataset?: (id: string) => void;
  onNavigateView: (view: ViewState) => void;
}

export function DataExplorer({
  onNavigateView,
}: DataExplorerProps) {
  const { currentDataset: dataset, allDatasets, setSelectedDatasetId: onSelectDataset } = useDatasetStore();
  // If no active dataset, render Empty State (Section 16)
  if (!dataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/10 dark:bg-[#09090b] h-full relative overflow-hidden">
        {/* Ambient Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-500/30 group">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">Explore Your Business Data</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 mb-6 leading-relaxed">
            Load a dataset to filter, aggregate, group, and query your spreadsheet records.
          </p>
          <Button
            onClick={() => onNavigateView('data-manager')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9.5 text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm rounded-lg cursor-pointer"
          >
            Import Dataset
          </Button>
        </div>
      </div>
    );
  }

  // Raw source records (includes any cleaning transformations applied)
  const sourceData = dataset.fullData && dataset.fullData.length > 0 ? dataset.fullData : dataset.data;

  // View States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [sortRules, setSortRules] = useState<SortRule[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(dataset.headers || []);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Group & Analyze Configuration
  const [groupingConfig, setGroupingConfig] = useState<GroupingConfig | null>(null);

  // Quick Metrics Configuration
  const [quickMetrics, setQuickMetrics] = useState<QuickMetricConfig[]>(() => {
    const numCol = dataset.headers.find(h => dataset.columnTypes[h] === 'numeric') || dataset.headers[0];
    return [
      { id: 'm-1', column: numCol, aggregation: 'sum' }
    ];
  });

  // Modal / Drawer States
  const [selectedColForStats, setSelectedColForStats] = useState<string | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Synchronize visibleColumns if dataset headers change
  useEffect(() => {
    setVisibleColumns(dataset.headers || []);
  }, [dataset.id]);

  // Search Debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters, rowsPerPage]);

  // Filter & Sort Calculation (Memoized for max performance)
  const filteredData = useMemo(() => {
    return filterDataset(sourceData, filters, debouncedSearchTerm, visibleColumns);
  }, [sourceData, filters, debouncedSearchTerm, visibleColumns]);

  const sortedAndFilteredData = useMemo(() => {
    return sortDataset(filteredData, sortRules);
  }, [filteredData, sortRules]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedAndFilteredData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return sortedAndFilteredData.slice(startIdx, startIdx + rowsPerPage);
  }, [sortedAndFilteredData, currentPage, rowsPerPage]);

  // Missing Cells Count Calculation for Analytical Summary
  const missingCellsCount = useMemo(() => {
    let count = 0;
    const cols = visibleColumns.length > 0 ? visibleColumns : dataset.headers;
    for (const row of filteredData) {
      for (const col of cols) {
        const val = row[col];
        if (val === null || val === undefined || val === '') count++;
      }
    }
    return count;
  }, [filteredData, visibleColumns, dataset.headers]);

  // Type Icon helper
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'categorical':
        return <CaseSensitive className="w-3.5 h-3.5 text-orange-500 shrink-0" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />;
    }
  };

  // Sort Handler
  const handleToggleSort = (header: string, isShiftPressed: boolean) => {
    setSortRules(prev => {
      const existingIdx = prev.findIndex(r => r.column === header);

      if (existingIdx >= 0) {
        const currentRule = prev[existingIdx];
        if (currentRule.direction === 'asc') {
          // Toggle to desc
          const updated = [...prev];
          updated[existingIdx] = { column: header, direction: 'desc' };
          return updated;
        } else {
          // Remove sort rule
          return prev.filter(r => r.column !== header);
        }
      } else {
        // Add sort rule
        const newRule: SortRule = { column: header, direction: 'asc' };
        return isShiftPressed ? [...prev, newRule] : [newRule];
      }
    });
  };

  // Export CSV Handler
  const handleExportFilteredCSV = () => {
    const csv = Papa.unparse(sortedAndFilteredData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dataset.name}_explorer_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load Saved View Handler
  const handleLoadSavedView = (view: SavedExplorerView) => {
    if (view.filters) setFilters(view.filters);
    if (view.sortRules) setSortRules(view.sortRules);
    if (view.visibleColumns) setVisibleColumns(view.visibleColumns);
    if (view.groupingConfig !== undefined) setGroupingConfig(view.groupingConfig);
    if (view.quickMetrics) setQuickMetrics(view.quickMetrics);
  };

  const handleOpenStats = (header: string) => {
    setSelectedColForStats(header);
    setIsStatsOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0c0c0e]">
      {/* 1. Explorer Header */}
      <ExplorerHeader
        dataset={dataset}
        filteredRowCount={sortedAndFilteredData.length}
        activeFiltersCount={filters.length}
        onNavigateView={onNavigateView}
        onOpenSavedViews={() => setIsSavedViewsOpen(true)}
        onOpenAiExplanation={() => setIsAiModalOpen(true)}
        onSelectDataset={onSelectDataset}
        allDatasets={allDatasets}
      />

      {/* 2. Analytical Summary Bar */}
      <div className="bg-zinc-50 dark:bg-zinc-950 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0 select-none">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="font-semibold text-zinc-950 dark:text-zinc-100 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
            Dataset Vol: <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[11px] font-bold text-zinc-800 dark:text-zinc-200">{dataset.rowCount.toLocaleString()} Rows</span>
          </span>
          <span className="text-zinc-300 dark:text-zinc-800">|</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500/80" />
            Filtered Vol: <span className="font-mono bg-blue-50 dark:bg-blue-950/45 px-1.5 py-0.5 rounded text-[11px] font-extrabold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">{sortedAndFilteredData.length.toLocaleString()} Rows</span>
          </span>
          <span className="text-zinc-300 dark:text-zinc-800">|</span>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            Fields Visible: <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[11px] font-bold text-zinc-800 dark:text-zinc-200">{visibleColumns.length} / {dataset.headers.length}</span>
          </span>
          <span className="text-zinc-300 dark:text-zinc-800">|</span>
          <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            Nulls: <span className="font-mono bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/20">{missingCellsCount.toLocaleString()}</span>
          </span>
        </div>

        {/* Action Connectors */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigateView('kpi-builder')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Target className="w-4 h-4" />
            Create KPI
          </button>
          <span className="text-zinc-300 dark:text-zinc-800">/</span>
          <button
            type="button"
            onClick={() => onNavigateView('dashboards')}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Build Dashboard
          </button>
        </div>
      </div>

      {/* 3. Group & Analyze Collapsible Panel */}
      <GroupAndAnalyzePanel
        data={filteredData}
        dataset={dataset}
        groupingConfig={groupingConfig}
        onChangeGrouping={setGroupingConfig}
        columnFormats={dataset.columnFormats}
      />

      {/* 4. Quick Aggregation Metrics Summary Bar */}
      <QuickAggregationsBar
        data={filteredData}
        headers={dataset.headers}
        columnTypes={dataset.columnTypes}
        quickMetrics={quickMetrics}
        onAddMetric={(m) => setQuickMetrics(prev => [...prev, m])}
        onRemoveMetric={(id) => setQuickMetrics(prev => prev.filter(m => m.id !== id))}
      />

      {/* 5. Filter Builder & Search Control Toolbar */}
      <FilterBuilder
        headers={dataset.headers}
        columnTypes={dataset.columnTypes}
        filters={filters}
        onAddFilter={(f) => setFilters(prev => [...prev, f])}
        onRemoveFilter={(id) => setFilters(prev => prev.filter(f => f.id !== id))}
        onClearFilters={() => setFilters([])}
      />

      {/* 6. Main Data Grid Toolbar & Table Container */}
      <div className="flex-1 flex flex-col min-h-0 relative bg-white dark:bg-[#0c0c0e]">
        {/* Table Header Bar */}
        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between shrink-0 gap-4 backdrop-blur-xs">
          {/* Global Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 text-zinc-900 dark:text-zinc-100 shadow-3xs transition-all placeholder:text-zinc-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Column Manager */}
            <ColumnManagerPopover
              allHeaders={dataset.headers}
              visibleColumns={visibleColumns}
              onToggleColumn={(col) => {
                setVisibleColumns(prev => 
                  prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
                );
              }}
              onSelectAll={() => setVisibleColumns(dataset.headers)}
              onDeselectAll={() => setVisibleColumns([])}
              onReset={() => setVisibleColumns(dataset.headers)}
            />

            {/* Export Filtered CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFilteredCSV}
              className="gap-1.5 text-xs h-8 bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-850 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shadow-3xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Export Filtered</span>
            </Button>
          </div>
        </div>

        {/* Table Body Area */}
        <div className="overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap table-fixed">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-950 shadow-3xs border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="w-14 px-3 py-3 text-zinc-400 font-extrabold text-center border-r border-zinc-200 dark:border-zinc-800 select-none bg-zinc-100/50 dark:bg-zinc-900/30 text-[10px]">
                  #
                </th>
                {visibleColumns.map((header) => {
                  const sortRuleIdx = sortRules.findIndex((r) => r.column === header);
                  const isSorted = sortRuleIdx >= 0;
                  const sortDirection = isSorted ? sortRules[sortRuleIdx].direction : null;

                  return (
                    <th
                       key={header}
                       className="px-4 py-3 font-extrabold text-zinc-900 dark:text-zinc-100 border-r border-zinc-250 dark:border-zinc-800/85 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all select-none group min-w-[150px] max-w-[320px]"
                       onClick={(e) => handleToggleSort(header, e.shiftKey)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate">
                          {getTypeIcon(dataset.columnTypes[header])}
                          <span className="truncate tracking-tight font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200">{header}</span>
                        </span>

                        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
                          {isSorted && (
                            <span className="text-[9px] font-extrabold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900/30 px-1.5 rounded">
                              {sortRules.length > 1 ? sortRuleIdx + 1 : ''}
                            </span>
                          )}
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}

                          {/* Stats Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenStats(header);
                            }}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-blue-500 transition-colors cursor-pointer"
                            title="Inspect column stats"
                          >
                            <BarChart3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/55 dark:divide-zinc-800/40">
              {paginatedData.map((row, idx) => {
                const globalRowIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                return (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/25 dark:hover:bg-blue-950/10 transition-colors"
                  >
                    <td className="px-3 py-2 text-zinc-400 text-center border-r border-zinc-200 dark:border-zinc-800 font-mono text-[10px] bg-zinc-50/50 dark:bg-zinc-900/10">
                      {globalRowIndex}
                    </td>
                    {visibleColumns.map((header) => {
                      const val = row[header];
                      const isNull = val === null || val === undefined || val === '';
                      return (
                        <td
                          key={header}
                          className="px-4 py-2 text-zinc-850 dark:text-zinc-250 border-r border-zinc-200 dark:border-zinc-800/60 max-w-[320px] truncate font-sans text-xs tracking-tight"
                          title={String(val ?? '')}
                        >
                          {isNull ? (
                            <span className="text-zinc-350 dark:text-zinc-700 italic font-mono text-[11px] font-medium">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Section 16 — Zero Rows Matching Filters Empty State */}
              {sortedAndFilteredData.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-4 py-16 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                        <FilterX className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          No records match your current filters.
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          Try adjusting your active column filters or search term to reveal data.
                        </p>
                      </div>
                      {filters.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFilters([])}
                          className="text-xs gap-1.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        >
                          <X className="w-3.5 h-3.5 text-rose-500" />
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-3 text-xs text-zinc-500 font-medium">
          <div>
            Showing{' '}
            <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px] font-bold">
              {sortedAndFilteredData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px] font-bold">
              {Math.min(currentPage * rowsPerPage, sortedAndFilteredData.length)}
            </strong>{' '}
            of <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px] font-bold">{sortedAndFilteredData.length.toLocaleString()}</strong> filtered rows
            {sourceData.length !== sortedAndFilteredData.length && (
              <span className="text-zinc-400 dark:text-zinc-500 ml-1.5 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                filtered from {sourceData.length.toLocaleString()} total
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Page Size Selector (25, 50, 100, 250) */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-450 text-xs">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/15 cursor-pointer shadow-3xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="w-7.5 h-7.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer shadow-3xs"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-350" />
              </Button>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 px-2.5 font-mono text-xs">
                {currentPage} <span className="text-zinc-400 font-normal">/</span> {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="w-7.5 h-7.5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer shadow-3xs"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4 text-zinc-700 dark:text-zinc-350" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Column Statistics Drawer */}
      <ColumnStatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        filteredData={filteredData}
        totalDatasetRowCount={dataset.rowCount}
        selectedColumn={selectedColForStats || dataset.headers[0]}
        columnTypes={dataset.columnTypes}
        allHeaders={dataset.headers}
        onSelectColumn={setSelectedColForStats}
        isFilteredActive={filters.length > 0 || debouncedSearchTerm !== ''}
      />

      {/* Saved Views Modal */}
      <SavedViewsModal
        isOpen={isSavedViewsOpen}
        onClose={() => setIsSavedViewsOpen(false)}
        datasetId={dataset.id}
        datasetName={dataset.name}
        currentFilters={filters}
        currentSortRules={sortRules}
        currentVisibleColumns={visibleColumns}
        currentGroupingConfig={groupingConfig}
        currentQuickMetrics={quickMetrics}
        onLoadView={handleLoadSavedView}
      />

      {/* AI Explanation Modal */}
      <AiExplanationModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        dataset={dataset}
        filteredRows={filteredData}
        filters={filters}
        groupingConfig={groupingConfig}
        quickMetrics={quickMetrics}
      />
    </div>
  );
}
