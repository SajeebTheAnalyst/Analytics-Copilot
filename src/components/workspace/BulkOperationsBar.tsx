import React, { useState } from 'react';
import { 
  Layers, Edit3, Trash2, X, AlertCircle, Check, Search, AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/button';

interface BulkOperationsBarProps {
  selectedCellCount: number;
  selectedRowCount: number;
  hasFormulaColumnsInSelection: boolean;
  onApplyBulkValue: (value: string) => void;
  onClearSelectedCells: () => void;
  onDeleteSelectedRows: () => void;
  onOpenFindReplace: () => void;
  onClearSelection: () => void;
}

export function BulkOperationsBar({
  selectedCellCount,
  selectedRowCount,
  hasFormulaColumnsInSelection,
  onApplyBulkValue,
  onClearSelectedCells,
  onDeleteSelectedRows,
  onOpenFindReplace,
  onClearSelection,
}: BulkOperationsBarProps) {
  const [showSetValueModal, setShowSetValueModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [bulkInputValue, setBulkInputValue] = useState<string>('');
  const [warningToast, setWarningToast] = useState<string | null>(null);

  if (selectedCellCount <= 1) return null;

  const handleTriggerBulkValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasFormulaColumnsInSelection) {
      setWarningToast('Formula columns cannot be bulk edited. Formula cells were skipped.');
      setTimeout(() => setWarningToast(null), 3500);
    }
    onApplyBulkValue(bulkInputValue);
    setShowSetValueModal(false);
    setBulkInputValue('');
  };

  const handleTriggerClearCells = () => {
    if (hasFormulaColumnsInSelection) {
      setWarningToast('Formula columns cannot be bulk edited. Formula cells were skipped.');
      setTimeout(() => setWarningToast(null), 3500);
    }
    onClearSelectedCells();
  };

  const handleTriggerDeleteRows = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteRows = () => {
    onDeleteSelectedRows();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white border border-zinc-700/80 rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs">
      {/* Badge Count */}
      <div className="flex items-center gap-2 pr-3 border-r border-zinc-700">
        <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-zinc-100 block">
            {selectedCellCount} cells selected
          </span>
          {selectedRowCount > 1 && (
            <span className="text-[10px] text-zinc-400 block font-mono">
              ({selectedRowCount} rows)
            </span>
          )}
        </div>
      </div>

      {/* Formula Warning Indicator */}
      {hasFormulaColumnsInSelection && (
        <span 
          className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0"
          title="Selection contains formula columns. Formula cells will be protected from bulk editing."
        >
          <AlertCircle className="w-3 h-3" /> Formula cells protected
        </span>
      )}

      {/* Main Action Buttons */}
      {!showSetValueModal && !showDeleteConfirm && (
        <div className="flex items-center gap-2">
          {/* Fill Value Button */}
          <Button
            type="button"
            size="sm"
            onClick={() => setShowSetValueModal(true)}
            className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Set Value
          </Button>

          {/* Clear Cells Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTriggerClearCells}
            className="h-8 text-xs font-semibold border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
            title="Clear selected non-formula cells"
          >
            Clear Cells
          </Button>

          {/* Delete Selected Rows Button */}
          {selectedRowCount > 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTriggerDeleteRows}
              className="h-8 text-xs font-semibold border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-900/60 cursor-pointer gap-1"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              Delete {selectedRowCount} Rows
            </Button>
          )}

          {/* Find & Replace Quick Button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenFindReplace}
            className="h-8 text-xs font-semibold border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 cursor-pointer gap-1"
          >
            <Search className="w-3 h-3 text-indigo-400" />
            Find & Replace
          </Button>

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-1"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Set Value Inline Input Form */}
      {showSetValueModal && (
        <form onSubmit={handleTriggerBulkValue} className="flex items-center gap-2 animate-in fade-in duration-150">
          <input
            type="text"
            value={bulkInputValue}
            onChange={(e) => setBulkInputValue(e.target.value)}
            placeholder="Enter value for selected cells..."
            className="px-3 py-1 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-56"
            autoFocus
          />
          <Button
            type="submit"
            size="sm"
            className="h-7 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
          >
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSetValueModal(false)}
            className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            Cancel
          </Button>
        </form>
      )}

      {/* Delete Rows Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="flex items-center gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 text-red-300 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Delete {selectedRowCount} selected rows?</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
            className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmDeleteRows}
            className="h-7 text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            Delete {selectedRowCount} Rows
          </Button>
        </div>
      )}

      {/* Warning Toast */}
      {warningToast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-black font-bold text-[11px] rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{warningToast}</span>
        </div>
      )}
    </div>
  );
}
