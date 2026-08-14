import React, { useState, useMemo } from 'react';
import { Dataset, DrillPathStep, DashboardFilter, DashboardCrossFilter } from '@/types';
import { 
  X, Table as TableIcon, Download, Search, ChevronLeft, ChevronRight, 
  ArrowUpDown, Filter, Layers, Database, FileSpreadsheet, Check, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DrillThroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  widgetTitle?: string;
  dataset: Dataset | null;
  records?: Record<string, any>[];
  filteredRecords?: Record<string, any>[];
  totalRecordsCount?: number;
  drillPath?: DrillPathStep[];
  globalFilters?: DashboardFilter[];
  crossFilters?: DashboardCrossFilter[];
}

export function DrillThroughModal({
  isOpen,
  onClose,
  title,
  widgetTitle,
  dataset,
  records: rawRecords,
  filteredRecords,
  totalRecordsCount,
  drillPath = [],
  globalFilters = [],
  crossFilters = []
}: DrillThroughModalProps) {
  if (!isOpen) return null;

  const records = rawRecords || filteredRecords || [];
  const displayTitle = title || widgetTitle || 'Granular Detail Records';

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<string>('all');
  const [copiedNotification, setCopiedNotification] = useState(false);

  const headers = dataset?.headers || (records.length > 0 ? Object.keys(records[0]) : []);

  // Filter records by search term
  const searchedRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();

    return records.filter(row => {
      if (selectedColumnFilter !== 'all' && row[selectedColumnFilter] !== undefined) {
        return String(row[selectedColumnFilter]).toLowerCase().includes(term);
      }
      return Object.values(row).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      );
    });
  }, [records, searchTerm, selectedColumnFilter]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (!sortCol) return searchedRecords;
    return [...searchedRecords].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      return sortDir === 'asc' 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [searchedRecords, sortCol, sortDir]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  // Calculate numeric columns summary
  const numericMetrics = useMemo(() => {
    if (!dataset || records.length === 0) return [];
    const numCols = Object.entries(dataset.columnTypes || {})
      .filter(([_, type]) => type === 'numeric')
      .map(([col]) => col)
      .slice(0, 4);

    return numCols.map(col => {
      let sum = 0;
      let count = 0;
      let min = Infinity;
      let max = -Infinity;

      for (const r of records) {
        const val = Number(r[col]);
        if (!isNaN(val) && val !== null) {
          sum += val;
          count++;
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }

      return {
        column: col,
        sum,
        avg: count > 0 ? sum / count : 0,
        min: count > 0 ? min : 0,
        max: count > 0 ? max : 0
      };
    });
  }, [dataset, records]);

  // Export to CSV
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headerRow = headers.join(',');
    const rows = sortedRecords.map(r => 
      headers.map(h => {
        let val = r[h];
        if (val === null || val === undefined) return '""';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `drill_through_${dataset?.name || 'export'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (records.length === 0) return;
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sortedRecords, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `drill_through_${dataset?.name || 'export'}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const actualTotal = totalRecordsCount || dataset?.rowCount || (dataset?.fullData || []).length || records.length;
  const pctOfTotal = actualTotal > 0 
    ? ((records.length / actualTotal) * 100).toFixed(1) 
    : '100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-fade-in">
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-3xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Drill-Through Detail Records
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 rounded-md">
                  {displayTitle}
                </span>
              </div>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                <span>Dataset: <strong>{dataset?.name || 'Active Dataset'}</strong></span>
                <span>•</span>
                <span>Showing <strong>{records.length.toLocaleString()}</strong> filtered rows ({pctOfTotal}% of total {actualTotal.toLocaleString()})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="text-xs h-8 px-3 bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 font-semibold shadow-3xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportJSON}
              className="text-xs h-8 px-3 bg-white dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 font-semibold shadow-3xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              JSON
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DRILL CONTEXT & FILTER TAGS BAR */}
        {(drillPath.length > 0 || globalFilters.length > 0 || crossFilters.length > 0) && (
          <div className="px-6 py-2.5 bg-zinc-100/60 dark:bg-zinc-900/30 border-b border-zinc-200/80 dark:border-zinc-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" /> Context:
            </span>

            {/* Drill Path Steps */}
            {drillPath.map((step, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium text-[11px]"
              >
                <Layers className="w-3 h-3 text-blue-500" />
                <span>{step.column}:</span>
                <strong className="text-blue-900 dark:text-blue-100">{step.label}</strong>
              </span>
            ))}

            {/* Cross Filters */}
            {crossFilters.map((cf, idx) => (
              <span 
                key={`cf-${idx}`} 
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 font-medium text-[11px]"
              >
                <span>Visual Filter: {cf.column} = </span>
                <strong className="text-indigo-900 dark:text-indigo-100">{cf.values.join(', ')}</strong>
              </span>
            ))}

            {/* Global Filters */}
            {globalFilters.map((gf, idx) => (
              <span 
                key={`gf-${idx}`} 
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-[11px]"
              >
                <span>Global: {gf.column} {gf.operator || '='} </span>
                <strong className="text-zinc-900 dark:text-zinc-100">{String(gf.value)}</strong>
              </span>
            ))}
          </div>
        )}

        {/* SUMMARY STATS BAR */}
        {numericMetrics.length > 0 && (
          <div className="px-6 py-2.5 border-b border-zinc-100 dark:border-zinc-850 bg-white dark:bg-zinc-950/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {numericMetrics.map(metric => (
              <div key={metric.column} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block truncate" title={metric.column}>
                  {metric.column}
                </span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">
                    Σ {metric.sum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Avg: {metric.avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEARCH & CONTROLS TOOLBAR */}
        <div className="px-6 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search matching records..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-250 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={selectedColumnFilter}
              onChange={(e) => {
                setSelectedColumnFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Columns</option>
              {headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-250 dark:border-zinc-800 rounded-md px-2 py-1 text-zinc-900 dark:text-zinc-100"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sortedRecords.length} results)
            </span>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="flex-1 overflow-auto bg-zinc-50/20 dark:bg-zinc-950/20 relative">
          {paginatedRecords.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
              <TableIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No matching records</span>
              <p className="text-[11px] text-zinc-400 mt-0.5">Try refining your search filter above.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 shadow-3xs">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center font-mono text-zinc-400">#</th>
                  {headers.map(col => {
                    const isSorted = sortCol === col;
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="py-2.5 px-3.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/80 cursor-pointer transition-colors whitespace-nowrap select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{col}</span>
                          <ArrowUpDown className={cn(
                            "w-3 h-3 text-zinc-400 transition-opacity",
                            isSorted ? "opacity-100 text-blue-600 dark:text-blue-400 font-bold" : "opacity-30 hover:opacity-100"
                          )} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {paginatedRecords.map((row, idx) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors text-zinc-800 dark:text-zinc-200"
                    >
                      <td className="py-2 px-3 text-center font-mono text-[10px] text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/30">
                        {absoluteIndex}
                      </td>
                      {headers.map(col => {
                        const val = row[col];
                        const isNum = typeof val === 'number';
                        return (
                          <td
                            key={col}
                            className={cn(
                              "py-2 px-3.5 whitespace-nowrap max-w-xs truncate",
                              isNum ? "font-mono text-zinc-900 dark:text-zinc-100" : ""
                            )}
                          >
                            {val === null || val === undefined || val === '' ? (
                              <span className="text-zinc-400 italic font-mono text-[10px]">(Blank)</span>
                            ) : isNum ? (
                              val.toLocaleString()
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL FOOTER & PAGINATION */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length} records
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2.5 bg-white dark:bg-zinc-900 text-xs font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-2 font-mono">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-2.5 bg-white dark:bg-zinc-900 text-xs font-semibold"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
