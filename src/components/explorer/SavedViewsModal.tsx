import React, { useState, useEffect } from 'react';
import { SavedExplorerView, ColumnFilter, SortRule, GroupingConfig, QuickMetricConfig } from '@/types';
import { get, set } from 'idb-keyval';
import { Bookmark, Plus, Edit2, Trash2, Check, X, FolderOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface SavedViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetId: string;
  datasetName: string;
  currentFilters: ColumnFilter[];
  currentSortRules: SortRule[];
  currentVisibleColumns: string[];
  currentGroupingConfig: GroupingConfig | null;
  currentQuickMetrics: QuickMetricConfig[];
  onLoadView: (view: SavedExplorerView) => void;
}

export function SavedViewsModal({
  isOpen,
  onClose,
  datasetId,
  datasetName,
  currentFilters,
  currentSortRules,
  currentVisibleColumns,
  currentGroupingConfig,
  currentQuickMetrics,
  onLoadView,
}: SavedViewsModalProps) {
  const [savedViews, setSavedViews] = useState<SavedExplorerView[]>([]);
  const [newViewName, setNewViewName] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  // Load saved views from IndexedDB
  useEffect(() => {
    async function loadViews() {
      try {
        const stored = await get('ac_saved_views');
        if (stored && Array.isArray(stored)) {
          setSavedViews(stored);
        }
      } catch (e) {
        console.error('Failed to load saved views from IndexedDB', e);
      }
    }
    if (isOpen) {
      loadViews();
    }
  }, [isOpen]);

  // Persist views helper
  const saveViewsToStorage = async (views: SavedExplorerView[]) => {
    setSavedViews(views);
    try {
      await set('ac_saved_views', views);
    } catch (e) {
      console.error('Failed to save views to IndexedDB', e);
    }
  };

  const handleSaveCurrentView = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;

    const newView: SavedExplorerView = {
      id: `view-${Date.now()}`,
      datasetId,
      name: newViewName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filters: currentFilters,
      sortRules: currentSortRules,
      visibleColumns: currentVisibleColumns,
      groupingConfig: currentGroupingConfig,
      quickMetrics: currentQuickMetrics,
    };

    const updated = [newView, ...savedViews];
    saveViewsToStorage(updated);
    setNewViewName('');
  };

  const handleRenameView = (id: string) => {
    if (!editedName.trim()) return;
    const updated = savedViews.map((v) =>
      v.id === id ? { ...v, name: editedName.trim(), updatedAt: Date.now() } : v
    );
    saveViewsToStorage(updated);
    setEditingViewId(null);
    setEditedName('');
  };

  const handleDeleteView = (id: string) => {
    const updated = savedViews.filter((v) => v.id !== id);
    saveViewsToStorage(updated);
  };

  if (!isOpen) return null;

  // Filter views for current active dataset
  const datasetSavedViews = savedViews.filter((v) => v.datasetId === datasetId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Saved Analytical Views</h3>
              <p className="text-xs text-zinc-500">Preset view configurations for {datasetName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Save Current View Form */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 shrink-0">
          <form onSubmit={handleSaveCurrentView} className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Save Current View State
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Q1 High Revenue Orders View..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newViewName.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Save View
              </Button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Saves active filters ({currentFilters.length}), column visibility ({currentVisibleColumns.length} cols), sorting, and metrics.
            </p>
          </form>
        </div>

        {/* Saved Views List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {datasetSavedViews.map((view) => (
            <div
              key={view.id}
              className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between hover:border-purple-400 dark:hover:border-purple-800 transition-colors group"
            >
              {editingViewId === view.id ? (
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-xs"
                    autoFocus
                  />
                  <button
                    onClick={() => handleRenameView(view.id)}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingViewId(null)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {view.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                    <span>{view.filters.length} Filter{view.filters.length !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{view.visibleColumns.length} Visible Cols</span>
                    {view.groupingConfig && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">Grouped by {view.groupingConfig.groupByColumn}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onLoadView(view);
                    onClose();
                  }}
                  className="h-7 text-xs gap-1 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/60 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                >
                  <FolderOpen className="w-3 h-3" />
                  Load
                </Button>

                <button
                  onClick={() => {
                    setEditingViewId(view.id);
                    setEditedName(view.name);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                  title="Rename View"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteView(view.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-500 rounded"
                  title="Delete View"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {datasetSavedViews.length === 0 && (
            <div className="text-center py-8 text-zinc-400 text-xs">
              <Bookmark className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p>No saved views for this dataset yet.</p>
              <p className="text-[11px] text-zinc-500 mt-1">Configure your filters and click "Save View" above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
