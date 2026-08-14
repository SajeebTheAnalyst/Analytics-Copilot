import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dataset } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Search, Plus, Trash2, Undo, Redo, Save, RotateCcw, 
  ArrowUp, ArrowDown, Edit2, Table as TableIcon, LayoutPanelLeft,
  X, Columns, Check
} from 'lucide-react';

interface DataEditingStudioProps {
  dataset: Dataset;
  onSave: (updatedDataset: Dataset) => void;
}

interface HistoryState {
  data: Record<string, any>[];
  headers: string[];
}

export function DataEditingStudio({ dataset, onSave }: DataEditingStudioProps) {
  const [workingData, setWorkingData] = useState<Record<string, any>[]>([]);
  const [workingHeaders, setWorkingHeaders] = useState<string[]>([]);
  const [originalData, setOriginalData] = useState<Record<string, any>[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  
  const [viewMode, setViewMode] = useState<'working' | 'original'>('working');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const rowsPerPage = 100;

  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colKey: string; value: string } | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Initialize state when dataset changes
  useEffect(() => {
    // We deep clone just the array to break reference, objects inside are shared but we will replace them on edit
    const initialData = [...(dataset.fullData || [])];
    const initialHeaders = [...(dataset.headers || [])];
    setWorkingData(initialData);
    setWorkingHeaders(initialHeaders);
    setOriginalData(dataset.originalData || []);
    setOriginalHeaders(dataset.headers || []); // Original headers assume dataset.headers is the source of truth if not changed
    setPast([]);
    setFuture([]);
    setViewMode('working');
    setSearchQuery('');
    setSortConfig(null);
    setPage(1);
    setEditingCell(null);
  }, [dataset.id, dataset.fullData, dataset.headers, dataset.originalData]);

  const hasChanges = past.length > 0;

  const pushHistory = (newData: Record<string, any>[], newHeaders: string[]) => {
    setPast(prev => [...prev, { data: workingData, headers: workingHeaders }].slice(-50)); // Max 50 history steps
    setFuture([]);
    setWorkingData(newData);
    setWorkingHeaders(newHeaders);
  };

  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    setFuture(prev => [{ data: workingData, headers: workingHeaders }, ...prev]);
    setPast(newPast);
    setWorkingData(previous.data);
    setWorkingHeaders(previous.headers);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast(prev => [...prev, { data: workingData, headers: workingHeaders }]);
    setFuture(newFuture);
    setWorkingData(next.data);
    setWorkingHeaders(next.headers);
  };

  const handleCellEdit = (realRowIndex: number, colKey: string, newValue: string) => {
    const newData = [...workingData];
    const newRow = { ...newData[realRowIndex], [colKey]: newValue };
    newData[realRowIndex] = newRow;
    pushHistory(newData, workingHeaders);
    setEditingCell(null);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    workingHeaders.forEach(h => (newRow[h] = ''));
    pushHistory([newRow, ...workingData], workingHeaders);
    setPage(1); // Jump to page 1 to see the new row
  };

  const handleDeleteRow = (realRowIndex: number) => {
    const newData = [...workingData];
    newData.splice(realRowIndex, 1);
    pushHistory(newData, workingHeaders);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim() || workingHeaders.includes(newColumnName.trim())) return;
    const name = newColumnName.trim();
    const newHeaders = [...workingHeaders, name];
    const newData = workingData.map(row => ({ ...row, [name]: '' }));
    pushHistory(newData, newHeaders);
    setNewColumnName('');
    setShowAddColumn(false);
  };

  const handleDeleteColumn = (colKey: string) => {
    if (!confirm(`Are you sure you want to delete the column "${colKey}"?`)) return;
    const newHeaders = workingHeaders.filter(h => h !== colKey);
    // Don't strictly need to delete from data objects, but cleaner if we do
    const newData = workingData.map(row => {
      const newRow = { ...row };
      delete newRow[colKey];
      return newRow;
    });
    pushHistory(newData, newHeaders);
  };

  const handleRenameColumn = (oldKey: string) => {
    const newKey = prompt(`Enter new name for column "${oldKey}":`, oldKey);
    if (!newKey || newKey === oldKey || workingHeaders.includes(newKey)) return;
    
    const newHeaders = workingHeaders.map(h => h === oldKey ? newKey : h);
    const newData = workingData.map(row => {
      const newRow = { ...row };
      newRow[newKey] = newRow[oldKey];
      delete newRow[oldKey];
      return newRow;
    });
    pushHistory(newData, newHeaders);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSave = () => {
    // Generate new top 100 preview
    const previewData = workingData.slice(0, 100).map(row => {
      const newRow = { ...row };
      for (const key of Object.keys(newRow)) {
        if (newRow[key] instanceof Date) {
          newRow[key] = newRow[key].toISOString();
        }
      }
      return newRow;
    });

    onSave({
      ...dataset,
      headers: workingHeaders,
      fullData: workingData,
      data: previewData,
      rowCount: workingData.length,
      colCount: workingHeaders.length,
    });
  };

  const handleRevert = () => {
    if (confirm("Revert all unsaved changes and restore original dataset?")) {
      setWorkingData([...dataset.originalData]);
      // Assuming original headers were the same as the current ones before edit, 
      // ideally we should have originalHeaders in Dataset type, but for now we fallback to original dataset headers.
      // We stored original headers in state on mount, let's use that.
      setWorkingHeaders([...originalHeaders]);
      setPast([]);
      setFuture([]);
      setViewMode('working');
    }
  };

  // Derived data
  const currentData = viewMode === 'working' ? workingData : originalData;
  const currentHeaders = viewMode === 'working' ? workingHeaders : originalHeaders;

  const filteredAndSortedData = useMemo(() => {
    let result = currentData.map((row, index) => ({ row, originalIndex: index }));
    
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(({ row }) => 
        currentHeaders.some(h => String(row[h] || '').toLowerCase().includes(q))
      );
    }
    
    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a.row[sortConfig.key];
        const valB = b.row[sortConfig.key];
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        return sortConfig.direction === 'asc' ? 1 : -1;
      });
    }

    return result;
  }, [currentData, currentHeaders, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedData.length / rowsPerPage));
  const paginatedData = filteredAndSortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="glass-panel glass-card rounded-xl flex flex-col mb-6" style={{ minHeight: '500px' }}>
      {/* HEADER & TABS */}
      <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/30 dark:bg-black/20 flex flex-col gap-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-xs lg:text-sm text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <LayoutPanelLeft className="w-4 h-4 text-indigo-500" />
              Data Editing Studio
            </h3>
            
            <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
              <button
                onClick={() => setViewMode('working')}
                className={cn(
                  "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                  viewMode === 'working' 
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                Working Data {hasChanges && <span className="ml-1 text-amber-500">•</span>}
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={cn(
                  "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                  viewMode === 'original' 
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                Source Data
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mr-2 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50">
                {past.length} unsaved change{past.length > 1 ? 's' : ''}
              </span>
            )}
            
            <Button
              variant="outline"
              size="sm"
              disabled={!hasChanges}
              onClick={handleRevert}
              className="h-7 text-[11px] px-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/30"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Revert
            </Button>
            
            <Button
              variant="default"
              size="sm"
              disabled={!hasChanges}
              onClick={handleSave}
              className="h-7 text-[11px] px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Save className="w-3 h-3 mr-1" /> Save Changes
            </Button>
          </div>
        </div>

        {/* TOOLBAR */}
        {viewMode === 'working' && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search dataset..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="h-7 pl-8 pr-3 w-48 text-[11px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

              <Button variant="outline" size="sm" onClick={handleAddRow} className="h-7 text-[11px] px-2 shadow-2xs">
                <Plus className="w-3 h-3 mr-1" /> Row
              </Button>

              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowAddColumn(true)} className="h-7 text-[11px] px-2 shadow-2xs">
                  <Columns className="w-3 h-3 mr-1" /> Column
                </Button>
                {showAddColumn && (
                  <div className="absolute top-full mt-1 left-0 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg p-2 z-50 flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Column name"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                      className="flex-1 h-7 text-[11px] px-2 border rounded-sm dark:border-zinc-700 bg-transparent"
                    />
                    <Button size="icon" variant="ghost" onClick={handleAddColumn} className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"><Check className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setShowAddColumn(false)} className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><X className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

              <Button variant="ghost" size="icon" onClick={undo} disabled={past.length === 0} className="h-7 w-7 text-zinc-500">
                <Undo className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redo} disabled={future.length === 0} className="h-7 w-7 text-zinc-500">
                <Redo className="w-3.5 h-3.5" />
              </Button>
            </div>
            
            <div className="text-[10px] text-zinc-500 font-mono">
              {filteredAndSortedData.length.toLocaleString()} rows
            </div>
          </div>
        )}
      </div>

      {/* DATA GRID */}
      <div className="flex-1 overflow-auto custom-scrollbar relative bg-white/40 dark:bg-zinc-950/40" style={{ minHeight: '350px' }}>
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
          <thead className="sticky top-0 z-20">
            <tr className="bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[10px] font-extrabold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest select-none shadow-sm">
              <th className="py-2 px-3 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 bg-zinc-100 dark:bg-zinc-900 z-30 shadow-[1px_0_0_0_#e4e4e7] dark:shadow-[1px_0_0_0_#27272a] text-center w-12">#</th>
              {currentHeaders.map(header => (
                <th key={header} className="py-2 px-4 group hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-1 cursor-pointer flex-1"
                      onClick={() => handleSort(header)}
                    >
                      {header}
                      {sortConfig?.key === header && (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </div>
                    {viewMode === 'working' && (
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 ml-2">
                        <button onClick={() => handleRenameColumn(header)} className="p-1 hover:text-blue-500 rounded"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteColumn(header)} className="p-1 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {viewMode === 'working' && <th className="py-2 px-3 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800 font-mono text-[11px]">
            {paginatedData.map(({ row, originalIndex }, displayIndex) => {
              const rowIndex = (page - 1) * rowsPerPage + displayIndex;
              return (
                <tr key={originalIndex} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 transition-colors group">
                  <td className="py-1.5 px-3 border-r border-zinc-200/50 dark:border-zinc-800 sticky left-0 bg-white/90 dark:bg-zinc-950/90 text-zinc-400 font-bold text-center z-10 shadow-[1px_0_0_0_#e4e4e7] dark:shadow-[1px_0_0_0_#27272a]">
                    {originalIndex + 1}
                  </td>
                  {currentHeaders.map((header) => {
                    const isEditing = editingCell?.rowIndex === originalIndex && editingCell?.colKey === header;
                    let val = row[header];
                    if (val instanceof Date) val = val.toISOString();
                    else if (val === null || val === undefined) val = '';
                    else if (typeof val === 'object') val = JSON.stringify(val);
                    const strVal = String(val);

                    return (
                      <td 
                        key={header} 
                        className={cn(
                          "py-1.5 px-4 text-zinc-800 dark:text-zinc-300 max-w-xs truncate border-transparent border",
                          viewMode === 'working' && !isEditing && "hover:border-blue-300 dark:hover:border-blue-700/50 cursor-text"
                        )}
                        onDoubleClick={() => {
                          if (viewMode === 'working') {
                            setEditingCell({ rowIndex: originalIndex, colKey: header, value: strVal });
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={strVal}
                            className="w-full h-full bg-blue-50 dark:bg-blue-950/30 border-blue-500 outline-none text-[11px] font-mono px-1 py-0.5 rounded-sm text-zinc-900 dark:text-zinc-100"
                            onBlur={(e) => handleCellEdit(originalIndex, header, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellEdit(originalIndex, header, e.currentTarget.value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          strVal === '' ? <span className="text-zinc-300 dark:text-zinc-600 italic">null</span> : strVal
                        )}
                      </td>
                    );
                  })}
                  {viewMode === 'working' && (
                    <td className="py-1.5 px-3">
                      <button 
                        onClick={() => handleDeleteRow(originalIndex)}
                        className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 rounded transition-opacity"
                        title="Delete Row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={currentHeaders.length + (viewMode === 'working' ? 2 : 1)} className="py-12 text-center text-zinc-500">
                  {searchQuery ? "No records match your search." : "No records available."}
                  {viewMode === 'working' && !searchQuery && (
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={handleAddRow}>+ Add First Row</Button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOOTER */}
      <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-black/20 flex items-center justify-between rounded-b-xl">
        <div className="text-[10px] text-zinc-500 font-medium">
          Showing {filteredAndSortedData.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to {Math.min(page * rowsPerPage, filteredAndSortedData.length)} of {filteredAndSortedData.length.toLocaleString()} rows
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="h-6 text-[10px] px-2 shadow-2xs"
          >
            Previous
          </Button>
          <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="h-6 text-[10px] px-2 shadow-2xs"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
