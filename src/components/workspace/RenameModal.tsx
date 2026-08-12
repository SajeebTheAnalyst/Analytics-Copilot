import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Dataset } from '@/types';
import { Edit2, X, AlertCircle } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  dataset: Dataset | null;
  onClose: () => void;
  onSave: (datasetId: string, newName: string) => void;
}

export function RenameModal({ isOpen, dataset, onClose, onSave }: RenameModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataset) {
      setName(dataset.name);
      setError(null);
    }
  }, [dataset, isOpen]);

  if (!isOpen || !dataset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Dataset name cannot be empty');
      return;
    }
    onSave(dataset.id, trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Edit2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Rename Dataset</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Dataset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter dataset name..."
              autoFocus
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {error && (
              <p className="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
