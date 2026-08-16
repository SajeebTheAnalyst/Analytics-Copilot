import React, { useState } from 'react';
import { ColumnFilter, FilterOperator, ColumnProfile } from '@/types';
import { Filter, Plus, X, Trash2, Check, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface FilterBuilderProps {
  headers: string[];
  columnTypes: Record<string, ColumnProfile['type']>;
  filters: ColumnFilter[];
  onAddFilter: (filter: ColumnFilter) => void;
  onRemoveFilter: (id: string) => void;
  onClearFilters: () => void;
}

export function FilterBuilder({
  headers,
  columnTypes,
  filters,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
}: FilterBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCol, setSelectedCol] = useState(headers[0] || '');
  const [operator, setOperator] = useState<FilterOperator>('contains');
  const [value, setValue] = useState('');
  const [secondaryValue, setSecondaryValue] = useState('');

  const colType = columnTypes[selectedCol] || 'text';

  // Get available operators for column type
  const getOperatorsForType = (type: ColumnProfile['type']): { label: string; value: FilterOperator }[] => {
    switch (type) {
      case 'numeric':
        return [
          { label: 'Equals (=)', value: 'equals' },
          { label: 'Greater Than (>)', value: 'greater_than' },
          { label: 'Less Than (<)', value: 'less_than' },
          { label: 'Between', value: 'between' },
          { label: 'Is Empty', value: 'is_empty' },
          { label: 'Is Not Empty', value: 'is_not_empty' },
        ];
      case 'date':
        return [
          { label: 'Equals (=)', value: 'equals' },
          { label: 'Before (<)', value: 'before' },
          { label: 'After (>)', value: 'after' },
          { label: 'Between', value: 'between' },
          { label: 'Is Empty', value: 'is_empty' },
          { label: 'Is Not Empty', value: 'is_not_empty' },
        ];
      default: // categorical / text / boolean / unknown
        return [
          { label: 'Contains', value: 'contains' },
          { label: 'Equals (=)', value: 'equals' },
          { label: 'Does Not Equal (≠)', value: 'does_not_equal' },
          { label: 'Starts With', value: 'starts_with' },
          { label: 'Ends With', value: 'ends_with' },
          { label: 'Is Empty', value: 'is_empty' },
          { label: 'Is Not Empty', value: 'is_not_empty' },
        ];
    }
  };

  const availableOperators = getOperatorsForType(colType);

  const handleColumnChange = (col: string) => {
    setSelectedCol(col);
    const newType = columnTypes[col] || 'text';
    const ops = getOperatorsForType(newType);
    setOperator(ops[0].value);
  };

  const handleCreateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCol) return;

    // Check if operator requires value
    const requiresVal = operator !== 'is_empty' && operator !== 'is_not_empty';
    if (requiresVal && !value.trim()) return;

    const newFilter: ColumnFilter = {
      id: `filter-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      column: selectedCol,
      operator,
      value: value.trim(),
      secondaryValue: operator === 'between' ? secondaryValue.trim() : undefined,
    };

    onAddFilter(newFilter);
    setValue('');
    setSecondaryValue('');
    setIsOpen(false);
  };

  const formatFilterChip = (f: ColumnFilter) => {
    const opLabels: Record<FilterOperator, string> = {
      equals: '=',
      does_not_equal: '≠',
      contains: 'contains',
      does_not_contain: 'does not contain',
      starts_with: 'starts with',
      ends_with: 'ends with',
      is_empty: 'is empty',
      is_not_empty: 'is not empty',
      greater_than: '>',
      less_than: '<',
      greater_than_or_equal: '>=',
      less_than_or_equal: '<=',
      between: 'between',
      before: 'before',
      after: 'after',
      on: 'on',
      in: 'in',
      not_in: 'not in',
    };

    if (f.operator === 'is_empty' || f.operator === 'is_not_empty') {
      return `${f.column} ${opLabels[f.operator]}`;
    }

    if (f.operator === 'between') {
      return `${f.column} between ${f.value} and ${f.secondaryValue || '...'}`;
    }

    return `${f.column} ${opLabels[f.operator]} "${f.value}"`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-zinc-50/40 dark:bg-zinc-950/20 border-b border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0 mr-1.5">
        <Filter className="w-3.5 h-3.5 text-blue-500" />
        <span>Active Filters:</span>
      </div>

      {/* Filter Chips */}
      {filters.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-250 dark:border-zinc-800 shadow-3xs group select-none transition-all duration-150"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span className="truncate max-w-[280px]">{formatFilterChip(f)}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(f.id)}
            className="text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors p-0.5 rounded cursor-pointer"
            title="Remove filter"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {/* Add Filter Button / Popover Trigger */}
      <div className="relative inline-block">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "gap-1.5 text-xs h-7.5 px-3 bg-white dark:bg-zinc-900 border-dashed border-zinc-350 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shadow-3xs font-semibold",
            isOpen && "border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/10"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Filter
        </Button>

        {/* Filter Popover */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4.5 z-50 text-xs shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-zinc-150 dark:border-zinc-800">
              <span className="font-bold text-zinc-950 dark:text-zinc-50">Add Column Filter</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFilter} className="space-y-3.5">
              {/* Column Select */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                  Column
                </label>
                <select
                  value={selectedCol}
                  onChange={(e) => handleColumnChange(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h} ({columnTypes[h] || 'text'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator Select */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                  Condition
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as FilterOperator)}
                  className="w-full bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {availableOperators.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value Input(s) */}
              {operator !== 'is_empty' && operator !== 'is_not_empty' && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                    Value {operator === 'between' ? '(From)' : ''}
                  </label>
                  <input
                    type={colType === 'numeric' ? 'number' : colType === 'date' ? 'date' : 'text'}
                    placeholder="Enter target value..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                </div>
              )}

              {operator === 'between' && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                    Value (To)
                  </label>
                  <input
                    type={colType === 'numeric' ? 'number' : colType === 'date' ? 'date' : 'text'}
                    placeholder="Enter secondary value..."
                    value={secondaryValue}
                    onChange={(e) => setSecondaryValue(e.target.value)}
                    className="w-full bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-all active:scale-95 px-3.5 shadow-sm rounded-md">
                  Apply Filter
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Clear All Filters */}
      {filters.length > 0 && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs text-rose-600 dark:text-rose-400 hover:underline hover:text-rose-700 font-bold ml-2 cursor-pointer flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All ({filters.length})
        </button>
      )}
    </div>
  );
}
