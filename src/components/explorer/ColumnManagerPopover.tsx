import React, { useState } from 'react';
import { Columns3, Search, Check, RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ColumnManagerPopoverProps {
  allHeaders: string[];
  visibleColumns: string[];
  onToggleColumn: (header: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onReset: () => void;
}

export function ColumnManagerPopover({
  allHeaders,
  visibleColumns,
  onToggleColumn,
  onSelectAll,
  onDeselectAll,
  onReset,
}: ColumnManagerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHeaders = allHeaders.filter((h) =>
    h.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const visibleSet = new Set(visibleColumns);

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "gap-1.5 text-xs h-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          isOpen && "border-blue-500 text-blue-600 dark:text-blue-400"
        )}
      >
        <Columns3 className="w-3.5 h-3.5 text-blue-500" />
        <span>Columns</span>
        <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
          {visibleColumns.length}/{allHeaders.length}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 z-50 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Column Visibility</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onReset}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                title="Reset visibility"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Column Input */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Bulk Toggle Buttons */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 py-1 mb-1 border-b border-zinc-100 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={onSelectAll}
              className="hover:text-blue-600 dark:hover:text-blue-400 font-medium"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              className="hover:text-rose-600 dark:hover:text-rose-400 font-medium"
            >
              Deselect All
            </button>
          </div>

          {/* Column Checklist */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 py-1">
            {filteredHeaders.map((header) => {
              const isChecked = visibleSet.has(header);
              return (
                <label
                  key={header}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer text-zinc-800 dark:text-zinc-200 select-none"
                >
                  <span className="truncate pr-2 font-medium">{header}</span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleColumn(header)}
                    className="w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
                  />
                </label>
              );
            })}

            {filteredHeaders.length === 0 && (
              <p className="text-center py-4 text-zinc-400">No columns found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
