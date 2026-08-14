import React, { useState, useEffect } from 'react';
import { Bookmark, Star, AlertCircle, X, Check, Filter, MousePointerClick, GitBranch, EyeOff, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSavedView } from '@/types';

interface SaveViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, options: { isDefault: boolean; overwriteId?: string; includeLayout: boolean }) => void;
  existingViews: DashboardSavedView[];
  activeView?: DashboardSavedView | null;
  stateSummary: {
    filterCount: number;
    crossFilterCount: number;
    drillCount: number;
    hiddenWidgetCount: number;
    customLayoutCount: number;
  };
  initialName?: string;
  initialDescription?: string;
  initialIsDefault?: boolean;
  mode?: 'create' | 'update' | 'save_as';
}

export function SaveViewDialog({
  isOpen,
  onClose,
  onSave,
  existingViews,
  activeView,
  stateSummary,
  initialName = '',
  initialDescription = '',
  initialIsDefault = false,
  mode = 'create'
}: SaveViewDialogProps) {
  if (!isOpen) return null;

  const [name, setName] = useState(
    initialName || (mode === 'save_as' && activeView ? `${activeView.name} (Copy)` : mode === 'update' && activeView ? activeView.name : '')
  );
  const [description, setDescription] = useState(
    initialDescription || (activeView?.description && mode === 'update' ? activeView.description : '')
  );
  const [isDefault, setIsDefault] = useState(
    mode === 'update' && activeView ? Boolean(activeView.isDefault) : initialIsDefault
  );
  const [includeLayout, setIncludeLayout] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for duplicate names
  const matchingExisting = existingViews.find(v => v.name.trim().toLowerCase() === name.trim().toLowerCase());
  const isDuplicateOfOther = matchingExisting && (mode !== 'update' || matchingExisting.id !== activeView?.id);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e?: React.FormEvent, forceOverwriteId?: string) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Please provide a name for this saved view.');
      return;
    }

    if (isDuplicateOfOther && !forceOverwriteId) {
      // Prompt user about overwrite
      return;
    }

    onSave(trimmed, description.trim(), {
      isDefault,
      overwriteId: forceOverwriteId || (mode === 'update' ? activeView?.id : undefined),
      includeLayout
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/40">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {mode === 'update' ? 'Update Saved View' : mode === 'save_as' ? 'Save View As New' : 'Save Current View'}
              </h2>
              <p className="text-xs text-zinc-500">
                Capture the complete analytical state and filters as a bookmark.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* Captured State Summary Pillbox */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
              Snapshot Contents
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-blue-200/60 dark:border-blue-800/40 text-zinc-700 dark:text-zinc-200 font-medium">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                {stateSummary.filterCount} Global {stateSummary.filterCount === 1 ? 'Filter' : 'Filters'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-purple-200/60 dark:border-purple-800/40 text-zinc-700 dark:text-zinc-200 font-medium">
                <MousePointerClick className="w-3.5 h-3.5 text-purple-500" />
                {stateSummary.crossFilterCount} Cross-{stateSummary.crossFilterCount === 1 ? 'Filter' : 'Filters'}
              </span>
              {stateSummary.drillCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-amber-200/60 dark:border-amber-800/40 text-zinc-700 dark:text-zinc-200 font-medium">
                  <GitBranch className="w-3.5 h-3.5 text-amber-500" />
                  {stateSummary.drillCount} Drill-Down {stateSummary.drillCount === 1 ? 'Path' : 'Paths'}
                </span>
              )}
              {stateSummary.hiddenWidgetCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  {stateSummary.hiddenWidgetCount} Hidden {stateSummary.hiddenWidgetCount === 1 ? 'Widget' : 'Widgets'}
                </span>
              )}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>View Name <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-zinc-400 font-normal">e.g. North Region Q4 Sales</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. Executive Summary - 2025"
              autoFocus
              className="w-full text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duplicate Name Conflict Notice */}
          {isDuplicateOfOther && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-3 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">A view named "{name.trim()}" already exists.</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                    You can overwrite the existing bookmark or choose a different name.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSubmit(undefined, matchingExisting.id)}
                className="text-xs shrink-0 border-amber-300 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/60"
              >
                Overwrite
              </Button>
            </div>
          )}

          {/* Description Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Description <span className="text-zinc-400 font-normal">(Optional)</span></span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about the context or purpose of this analytical view..."
              rows={2}
              className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Options: Default View & Include Layout */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Set as Default Dashboard Landing View
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={includeLayout}
                onChange={(e) => setIncludeLayout(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-zinc-400" />
                Preserve current widget arrangements and positioning
              </span>
            </label>
          </div>

          {errorMessage && (
            <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
          )}

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {mode === 'update' ? 'Update Bookmark' : 'Save View'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
