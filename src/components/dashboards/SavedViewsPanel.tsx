import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bookmark, 
  Star, 
  Search, 
  X, 
  Plus, 
  RotateCcw, 
  Save, 
  Copy, 
  Trash2, 
  Edit3, 
  Check, 
  Filter, 
  MousePointerClick, 
  GitBranch, 
  ArrowRight,
  Clock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSavedView } from '@/types';
import { cn } from '@/lib/utils';

interface SavedViewsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  savedViews: DashboardSavedView[];
  activeViewId: string | null;
  defaultViewId?: string | null;
  hasUnsavedChanges: boolean;
  onLoadView: (view: DashboardSavedView) => void;
  onOpenSaveDialog: (mode?: 'create' | 'update' | 'save_as') => void;
  onQuickUpdateActiveView: () => void;
  onDiscardChanges: () => void;
  onSetDefaultView: (viewId: string) => void;
  onRemoveDefaultView: (viewId: string) => void;
  onRenameView: (viewId: string, newName: string) => void;
  onDuplicateView: (view: DashboardSavedView) => void;
  onDeleteView: (viewId: string) => void;
  dashboardTitle?: string;
}

export function SavedViewsPanel({
  isOpen,
  onClose,
  savedViews = [],
  activeViewId,
  defaultViewId,
  hasUnsavedChanges,
  onLoadView,
  onOpenSaveDialog,
  onQuickUpdateActiveView,
  onDiscardChanges,
  onSetDefaultView,
  onRemoveDefaultView,
  onRenameView,
  onDuplicateView,
  onDeleteView,
  dashboardTitle
}: SavedViewsPanelProps) {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deletingId) setDeletingId(null);
        else if (editingId) setEditingId(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletingId, editingId, onClose]);

  // Active view object
  const activeView = savedViews.find(v => v.id === activeViewId) || null;

  // Filtered & Sorted Views
  const filteredViews = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let list = savedViews.filter(v => 
      v.name.toLowerCase().includes(term) || 
      (v.description && v.description.toLowerCase().includes(term))
    );

    // Sort: Default first, then Active, then most recently updated
    return list.sort((a, b) => {
      const aIsDefault = a.isDefault || a.id === defaultViewId;
      const bIsDefault = b.isDefault || b.id === defaultViewId;
      if (aIsDefault && !bIsDefault) return -1;
      if (!aIsDefault && bIsDefault) return 1;

      if (a.id === activeViewId) return -1;
      if (b.id === activeViewId) return 1;

      return b.updatedAt - a.updatedAt;
    });
  }, [savedViews, searchTerm, defaultViewId, activeViewId]);

  const handleStartRename = (view: DashboardSavedView, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(view.id);
    setEditNameInput(view.name);
  };

  const handleConfirmRename = (viewId: string) => {
    if (editNameInput.trim()) {
      onRenameView(viewId, editNameInput.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-fade-in">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl h-full flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
      >
        {/* Panel Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Saved Views & Bookmarks
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {savedViews.length}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 truncate max-w-[220px]">
                {dashboardTitle || 'Dashboard'} Snapshots
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => onOpenSaveDialog('create')}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              Save View
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Unsaved Changes Banner (if active view has been modified) */}
        {activeView && hasUnsavedChanges && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-3 flex flex-col gap-2 shrink-0 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Active: <strong>{activeView.name} *</strong> (Modified)</span>
              </div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">Unsaved state</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onQuickUpdateActiveView}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white h-7 flex-1 flex items-center justify-center gap-1"
              >
                <Save className="w-3 h-3" />
                Save Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenSaveDialog('save_as')}
                className="text-xs border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-7"
              >
                Save As New
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDiscardChanges}
                className="text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-7"
                title="Discard runtime edits and restore saved snapshot"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Revert
              </Button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-900">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search saved views by name or description..."
              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-7 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Views List Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredViews.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {searchTerm ? 'No matching views found' : 'No saved views yet'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                  {searchTerm 
                    ? `Try a different query or clear the search.` 
                    : `Capture your current filters, drill levels, and analytical cross-selections to quickly restore them later.`}
                </p>
              </div>
              {!searchTerm && (
                <Button
                  size="sm"
                  onClick={() => onOpenSaveDialog('create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Save Current View
                </Button>
              )}
            </div>
          ) : (
            filteredViews.map(view => {
              const isActive = view.id === activeViewId;
              const isDefault = view.isDefault || view.id === defaultViewId;
              const filterCount = (view.state.globalFilters || []).length;
              const crossFilterCount = (view.state.crossFilters || []).length;
              const drillCount = Object.keys(view.state.drillStates || {}).length;
              const hiddenCount = Object.values(view.state.widgetVisibility || {}).filter(v => v === false).length;

              return (
                <div
                  key={view.id}
                  onClick={() => onLoadView(view)}
                  className={cn(
                    "group relative border rounded-xl p-3.5 transition-all cursor-pointer flex flex-col gap-2.5 select-none",
                    isActive
                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700/80 shadow-xs ring-1 ring-blue-500/20"
                      : "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xs"
                  )}
                >
                  {/* Top Row: Title, Default Star, Active Badge, Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === view.id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editNameInput}
                            onChange={(e) => setEditNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmRename(view.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="text-xs font-bold bg-white dark:bg-zinc-950 border border-blue-500 rounded px-2 py-0.5 text-zinc-900 dark:text-zinc-100 focus:outline-none w-full"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleConfirmRename(view.id)}
                            className="h-6 w-6 text-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-6 w-6 text-zinc-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={cn(
                            "text-xs font-bold truncate",
                            isActive ? "text-blue-700 dark:text-blue-300" : "text-zinc-900 dark:text-zinc-100"
                          )}>
                            {view.name}
                          </h4>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-blue-600 text-white rounded font-mono">
                              Active
                            </span>
                          )}
                          {isDefault && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Default
                            </span>
                          )}
                        </div>
                      )}

                      {view.description && (
                        <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                          {view.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Card Controls */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Set / Remove Default */}
                      <button
                        type="button"
                        onClick={() => isDefault ? onRemoveDefaultView(view.id) : onSetDefaultView(view.id)}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          isDefault 
                            ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/40" 
                            : "text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        title={isDefault ? "Remove default landing view" : "Set as default landing view"}
                      >
                        <Star className={cn("w-3.5 h-3.5", isDefault && "fill-amber-500")} />
                      </button>

                      {/* Rename */}
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(view, e)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Rename view"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => onDuplicateView(view)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Duplicate view"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeletingId(view.id)}
                        className="p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete view"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Delete Confirmation Inline */}
                  {deletingId === view.id && (
                    <div 
                      className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg p-2.5 text-xs text-red-900 dark:text-red-200 flex items-center justify-between gap-2 animate-fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Delete "{view.name}"?</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(null)}
                          className="h-6 text-xs px-2 text-zinc-600"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            onDeleteView(view.id);
                            setDeletingId(null);
                          }}
                          className="h-6 text-xs px-2.5 bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {filterCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium border border-blue-200/50 dark:border-blue-900/50">
                        <Filter className="w-3 h-3 text-blue-500" />
                        {filterCount} {filterCount === 1 ? 'filter' : 'filters'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                        No global filters
                      </span>
                    )}

                    {crossFilterCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-medium border border-purple-200/50 dark:border-purple-900/50">
                        <MousePointerClick className="w-3 h-3 text-purple-500" />
                        {crossFilterCount} cross-selection{crossFilterCount > 1 ? 's' : ''}
                      </span>
                    )}

                    {drillCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-medium border border-amber-200/50 dark:border-amber-900/50">
                        <GitBranch className="w-3 h-3 text-amber-500" />
                        {drillCount} drill path{drillCount > 1 ? 's' : ''}
                      </span>
                    )}

                    {hiddenCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                        {hiddenCount} hidden
                      </span>
                    )}

                    <span className="ml-auto text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(view.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Bottom Hover Action Cue */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                    <span className={cn(
                      "font-semibold flex items-center gap-1 transition-colors",
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    )}>
                      {isActive ? 'Current Active View' : 'Click to Load View'}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Instant analytical restoration
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-xs h-7 text-zinc-500"
          >
            Close Panel
          </Button>
        </div>
      </div>
    </div>
  );
}
