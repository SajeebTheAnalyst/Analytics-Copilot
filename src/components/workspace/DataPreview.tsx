import { Dataset } from '@/types';
import { Search, Hash, ToggleLeft, Calendar, HelpCircle, CaseSensitive, ArrowUpDown, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

interface DataPreviewProps {
  dataset: Dataset;
}

export function DataPreview({ dataset }: DataPreviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-3.5 h-3.5 text-blue-500"  />;
      case 'boolean': return <ToggleLeft className="w-3.5 h-3.5 text-purple-500"  />;
      case 'date': return <Calendar className="w-3.5 h-3.5 text-emerald-500"  />;
      case 'categorical': return <CaseSensitive className="w-3.5 h-3.5 text-orange-500"  />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-zinc-400"  />;
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let processData = [...dataset.data];

    // Search
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      processData = processData.filter(row => 
        Object.values(row).some(val => String(val ?? '').toLowerCase().includes(lowerSearch))
      );
    }

    // Sort
    if (sortConfig) {
      processData.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return processData;
  }, [dataset.data, debouncedSearchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage) || 1;
  const paginatedData = filteredAndSortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset page on new search
  useMemo(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const typeCounts = useMemo(() => {
    const counts = { numeric: 0, categorical: 0, date: 0, boolean: 0, unknown: 0 };
    Object.values(dataset.columnTypes).forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [dataset.columnTypes]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0c0c0e] overflow-hidden">
      {/* Header Summary */}
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-[#0c0c0e] z-10">
        <div className="flex items-start justify-between max-w-7xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet className={cn("w-6 h-6", dataset.type === 'csv' ? "text-blue-500" : "text-emerald-500")} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                {dataset.name}
                <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  .{dataset.type}
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5"><strong className="text-zinc-700 dark:text-zinc-300">{dataset.rowCount.toLocaleString()}</strong> rows</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                <span className="flex items-center gap-1.5"><strong className="text-zinc-700 dark:text-zinc-300">{dataset.colCount.toLocaleString()}</strong> columns</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                <span>{formatBytes(dataset.size)}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                <span>Imported {formatDistanceToNow(dataset.uploadTime)} ago</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-light text-zinc-800 dark:text-zinc-200">{typeCounts.numeric}</span>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Numeric</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-light text-zinc-800 dark:text-zinc-200">{typeCounts.categorical}</span>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Categorical</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-light text-zinc-800 dark:text-zinc-200">{typeCounts.date}</span>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Date</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Table Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0c0c0e]">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/20">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Table Preview</h3>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search in data..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-72 text-zinc-900 dark:text-zinc-100 shadow-sm transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-900 shadow-sm border-b border-zinc-200 dark:border-zinc-800 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
                <tr>
                  <th className="w-12 px-4 py-3 text-zinc-500 font-medium text-center border-r border-zinc-200 dark:border-zinc-800">#</th>
                  {dataset.headers.map(header => {
                    const isSorted = sortConfig?.key === header;
                    return (
                      <th 
                        key={header} 
                        className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors select-none group"
                        onClick={() => handleSort(header)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-2">
                            {getTypeIcon(dataset.columnTypes[header])}
                            {header}
                          </span>
                          <span className="text-zinc-400">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-4 py-2.5 text-zinc-400 text-center border-r border-zinc-100 dark:border-zinc-800/50 font-mono text-xs">
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </td>
                    {dataset.headers.map(header => (
                      <td key={header} className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300 border-r border-zinc-100 dark:border-zinc-800/50 max-w-[300px] truncate" title={String(row[header] ?? '')}>
                        {row[header] !== null && row[header] !== undefined && row[header] !== "" ? String(row[header]) : <span className="text-zinc-300 dark:text-zinc-700 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={dataset.headers.length + 1} className="px-4 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-3" />
                        <p>No results found for "{searchTerm}"</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] flex items-center justify-between shrink-0 text-sm text-zinc-500">
            <div>
              Showing {filteredAndSortedData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length} records
              {searchTerm && ` (filtered from ${dataset.data.length} total)`}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 w-10 text-center">
                {currentPage} <span className="text-zinc-400 font-normal">/ {totalPages}</span>
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Column Information Sidebar */}
        <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/20">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Column Information</h3>
            <p className="text-xs text-zinc-500 mt-1">Schema and data quality summary</p>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {dataset.headers.map(header => {
              const profile = dataset.columnProfiles[header];
              if (!profile) return null;
              
              const nullPercentage = ((profile.nullCount / dataset.rowCount) * 100).toFixed(1);
              const isHighNull = profile.nullCount / dataset.rowCount > 0.5;

              return (
                <div key={header} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate pr-2">
                      {getTypeIcon(profile.type)}
                      <span className="truncate" title={header}>{header}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded shrink-0">
                      {profile.type}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                      <div className="text-zinc-500 mb-1 flex items-center justify-between">
                        Nulls
                        <span className={cn(
                          "text-[10px] font-medium",
                          isHighNull ? "text-red-500" : "text-emerald-500"
                        )}>{nullPercentage}%</span>
                      </div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {profile.nullCount.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                      <div className="text-zinc-500 mb-1">Unique Values</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {profile.uniqueCount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Example Value</div>
                    <div className="text-sm font-mono bg-zinc-100 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 p-2 rounded-md truncate border border-zinc-200/50 dark:border-zinc-800/50" title={String(profile.exampleValue ?? 'N/A')}>
                      {profile.exampleValue !== null && profile.exampleValue !== undefined && profile.exampleValue !== "" ? String(profile.exampleValue) : <span className="text-zinc-400 italic">null</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
