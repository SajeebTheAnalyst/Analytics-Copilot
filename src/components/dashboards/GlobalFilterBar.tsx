import React, { useState, useMemo } from 'react';
import { DashboardFilter, DashboardCrossFilter, Dataset } from '@/types';
import { Button } from '@/components/ui/button';
import { Filter, X, Plus, ChevronDown, MousePointerClick, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isDateColumn } from '@/lib/dateIntelligence';

interface GlobalFilterBarProps {
  filters: DashboardFilter[];
  crossFilters?: DashboardCrossFilter[];
  dataset: Dataset | null;
  onUpdateFilters: (filters: DashboardFilter[]) => void;
  onRemoveCrossFilter?: (widgetId: string, column: string) => void;
  onClearAllCrossFilters?: () => void;
  filteredCount?: number;
  totalCount?: number;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  crossFilters = [],
  dataset,
  onUpdateFilters,
  onRemoveCrossFilter,
  onClearAllCrossFilters,
  filteredCount,
  totalCount
}) => {
  const [, setActiveFilterId] = useState<string | null>(null);

  // Available columns for new filters
  const availableColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.headers.filter(h => !filters.some(f => f.column === h));
  }, [dataset, filters]);

  const handleAddFilter = (column: string) => {
    if (!dataset) return;
    const isDate = isDateColumn(dataset, column);
    const type = dataset.columnTypes?.[column];
    
    const newFilter: DashboardFilter = {
      id: `df-${Date.now()}`,
      datasetId: dataset.id,
      column,
      operator: isDate ? 'between' : type === 'numeric' ? 'greater_than' : 'in',
      value: null,
      values: [],
    };
    onUpdateFilters([...filters, newFilter]);
    setActiveFilterId(newFilter.id);
  };

  const handleRemoveFilter = (id: string) => {
    onUpdateFilters(filters.filter(f => f.id !== id));
  };

  const handleClearAllGlobal = () => {
    onUpdateFilters([]);
  };

  const handleUpdateFilter = (id: string, updates: Partial<DashboardFilter>) => {
    onUpdateFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  if (!dataset) return null;

  const hasGlobalFilters = filters.length > 0;
  const hasCrossFilters = crossFilters.length > 0;

  return (
    <div className="flex flex-col gap-3 mb-6 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-200">
      
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-md text-blue-600 dark:text-blue-400">
            <Filter className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Dashboard Filters</h3>
          {hasCrossFilters && (
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 animate-fadeIn">
              {crossFilters.length} visual {crossFilters.length === 1 ? 'filter' : 'filters'} active
            </span>
          )}
        </div>
        
        {totalCount !== undefined && filteredCount !== undefined && (
          <div className="text-xs text-zinc-500 font-medium">
            Showing <span className="text-zinc-900 dark:text-zinc-100 font-bold">{filteredCount.toLocaleString()}</span> of {totalCount.toLocaleString()} records
          </div>
        )}
      </div>

      {/* 1. Global Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mr-1 flex items-center gap-1">
          <span>Global:</span>
        </span>

        {hasGlobalFilters ? (
          <>
            {filters.map(filter => {
              const isMissing = !dataset.headers.includes(filter.column);
              
              return (
                <div key={filter.id} className={cn(
                  "flex items-center bg-zinc-50 dark:bg-zinc-900 border rounded-lg px-1 shadow-3xs",
                  isMissing ? "border-red-300 dark:border-red-900/50 bg-red-50/20" : "border-zinc-200 dark:border-zinc-800"
                )}>
                  {/* Dropdown to Edit Filter */}
                  <div className="relative group">
                    <Button variant="ghost" size="sm" className="h-7 px-2 py-0 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1 rounded-md">
                      {isMissing ? (
                        <span className="text-red-500 line-through font-semibold">{filter.column} (Missing)</span>
                      ) : (
                        <>
                          <span className="text-zinc-500">{filter.column}</span>
                          <span className="text-zinc-400">:</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-semibold max-w-[150px] truncate">
                            {filter.operator === 'in' && filter.values && filter.values.length > 0
                              ? `${filter.values.length} selected`
                              : filter.operator === 'between'
                              ? `${filter.min || '*'} → ${filter.max || '*'}`
                              : filter.value || 'All'}
                          </span>
                        </>
                      )}
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                    
                    {!isMissing && (
                      <div className="absolute left-0 top-full mt-1 hidden group-hover:block hover:block z-50 w-64 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-2.5">
                        <div className="flex flex-col gap-2">
                          <div className="px-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Edit {filter.column}</div>
                          <select 
                            className="w-full text-xs p-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-100"
                            value={filter.operator || 'equals'}
                            onChange={(e) => handleUpdateFilter(filter.id, { operator: e.target.value as any })}
                          >
                            <option value="equals">Equals</option>
                            <option value="does_not_equal">Does Not Equal</option>
                            <option value="in">In (Multiple)</option>
                            <option value="greater_than">&gt; Greater Than</option>
                            <option value="less_than">&lt; Less Than</option>
                            <option value="between">Between</option>
                          </select>
                          
                          {filter.operator === 'between' ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="text" 
                                placeholder="Min" 
                                className="h-7 text-xs w-full px-2 py-1 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                value={filter.min || ''} 
                                onChange={(e) => handleUpdateFilter(filter.id, { min: e.target.value })}
                              />
                              <input 
                                type="text" 
                                placeholder="Max" 
                                className="h-7 text-xs w-full px-2 py-1 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                value={filter.max || ''} 
                                onChange={(e) => handleUpdateFilter(filter.id, { max: e.target.value })}
                              />
                            </div>
                          ) : filter.operator === 'in' ? (
                            <input 
                              type="text" 
                              placeholder="Comma separated values" 
                              className="h-7 text-xs w-full px-2 py-1 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                              value={(filter.values || []).join(', ')} 
                              onChange={(e) => handleUpdateFilter(filter.id, { values: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            />
                          ) : (
                            <input 
                              type="text" 
                              placeholder="Value" 
                              className="h-7 text-xs w-full px-2 py-1 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                              value={filter.value?.toString() || ''} 
                              onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 text-zinc-400"
                    onClick={() => handleRemoveFilter(filter.id)}
                    title="Remove filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={handleClearAllGlobal}
            >
              Clear Global
            </Button>
          </>
        ) : (
          <span className="text-xs text-zinc-400 italic">None</span>
        )}

        {/* Add Filter Button */}
        <div className="relative group ml-auto">
          <Button variant="outline" size="sm" className="h-7 border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 gap-1 text-xs">
            <Plus className="w-3 h-3" />
            <span>Add Filter</span>
          </Button>
          
          <div className="absolute right-0 top-full mt-1 hidden group-hover:block hover:block z-50 w-48 max-h-64 overflow-y-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg">
            <div className="px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800">Select Column</div>
            <div className="py-1">
              {availableColumns.length > 0 ? (
                availableColumns.map(col => (
                  <button 
                    key={col} 
                    onClick={() => handleAddFilter(col)} 
                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {col}
                  </button>
                ))
              ) : (
                <div className="p-2 text-xs text-zinc-500 text-center">No columns available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual Cross-Filters Row (Section 14) */}
      {hasCrossFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-850/80 animate-fadeIn">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mr-1 flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>Visual Selections:</span>
          </span>

          {crossFilters.map((cf, idx) => (
            <div
              key={`${cf.widgetId}-${cf.column}-${idx}`}
              className="flex items-center gap-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg pl-2 pr-1 py-0.5 shadow-3xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                {cf.column}:
              </span>
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 max-w-[160px] truncate">
                {cf.values.map(v => String(v ?? '(Blank)')).join(', ')}
              </span>
              <button
                type="button"
                onClick={() => onRemoveCrossFilter?.(cf.widgetId, cf.column)}
                className="ml-1 p-1 rounded-md text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                title={`Remove ${cf.column} selection`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] font-bold text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 ml-1 gap-1"
            onClick={onClearAllCrossFilters}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear Selections</span>
          </Button>

          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-auto hidden sm:inline-block italic">
            Tip: Press Esc or click item again to toggle off
          </span>
        </div>
      )}

    </div>
  );
};
