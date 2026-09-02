import React from 'react';
import { Button } from '../ui/button';
import { Dataset } from '@/types';
import { Trash2, X, AlertTriangle, Layers, Database } from 'lucide-react';

interface DeleteDatasetModalProps {
  isOpen: boolean;
  dataset: Dataset | null;
  onClose: () => void;
  onConfirmDelete: (datasetId: string) => void;
}

export function DeleteDatasetModal({ isOpen, dataset, onClose, onConfirmDelete }: DeleteDatasetModalProps) {
  if (!isOpen || !dataset) return null;

  const handleDelete = () => {
    onConfirmDelete(dataset.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="pointer-events-auto bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-none">Delete Dataset</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Permanent deletion confirmation</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{dataset.name}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                {dataset.filename} {dataset.sheetName ? `(${dataset.sheetName})` : ''} • {dataset.rowCount.toLocaleString()} rows
              </p>
            </div>
          </div>

          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
            <p className="font-medium">
              Are you sure you want to permanently delete this dataset?
            </p>
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 text-[11px] space-y-1">
              <span className="font-bold block flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Cascading cleanup will remove:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 font-medium text-[10px]">
                <li>Dataset headers, schema, and working data rows</li>
                <li>Associated relationship models & suggestions</li>
                <li>KPI metrics tied specifically to this dataset</li>
                <li>MIS report configurations and related dashboard widgets</li>
              </ul>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
              This action cannot be undone. Other datasets and workspace data will remain unaffected.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button type="button" variant="outline" size="sm" className="text-xs h-8.5 font-semibold" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8.5 px-4 font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Dataset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
