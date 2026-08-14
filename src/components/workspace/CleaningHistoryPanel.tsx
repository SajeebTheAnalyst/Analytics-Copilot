import React from 'react';
import { History, RotateCcw, X, CheckCircle2, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { CleaningHistoryItem } from '@/lib/manualCleaningEngine';
import { formatDistanceToNow } from 'date-fns';

interface CleaningHistoryPanelProps {
  history: CleaningHistoryItem[];
  onUndoLastAction: () => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function CleaningHistoryPanel({
  history,
  onUndoLastAction,
  onClose,
  embedded = false,
}: CleaningHistoryPanelProps) {
  return (
    <div className={embedded ? "space-y-4" : "p-5 space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl text-xs text-zinc-900 dark:text-zinc-100 max-w-md w-full"}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          <h3 className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50">Cleaning History</h3>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {history.length} action{history.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onUndoLastAction}
              className="h-7 text-[11px] font-bold border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 gap-1 cursor-pointer"
              title="Revert the most recent cleaning operation"
            >
              <RotateCcw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              Undo Last
            </Button>
          )}

          {!embedded && onClose && (
            <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History Items List */}
      {history.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400">
          <Wrench className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-zinc-500" />
          <p className="font-bold text-xs text-zinc-600 dark:text-zinc-300">No Cleaning Actions Yet</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Bulk operations, whitespace trims, and merges on the working copy will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {history.slice().reverse().map((item, idx) => (
            <div 
              key={item.id} 
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {item.actionName}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    — {item.target}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono pl-5">
                  <span>{item.cellsAffected} cells affected</span>
                  <span>•</span>
                  <span>{item.rowsAffected} rows affected</span>
                </div>
              </div>

              <span className="text-[10px] text-zinc-400 whitespace-nowrap shrink-0">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
