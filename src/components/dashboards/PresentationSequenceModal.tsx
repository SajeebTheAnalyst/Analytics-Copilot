import React, { useState } from 'react';
import { 
  Play, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  Bookmark, 
  Sliders, 
  Sparkles,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dashboard, DashboardSavedView } from '@/types';

interface PresentationSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboard: Dashboard;
  onSaveSequence: (sequenceIds: string[], autoPlayInterval?: number) => void;
  onStartPresentation: () => void;
}

export function PresentationSequenceModal({
  isOpen,
  onClose,
  dashboard,
  onSaveSequence,
  onStartPresentation
}: PresentationSequenceModalProps) {
  const savedViews = dashboard.savedViews || [];

  // Initialize sequence list with existing dashboard.presentationSequence or all saved views
  const [sequence, setSequence] = useState<string[]>(() => {
    if (dashboard.presentationSequence && dashboard.presentationSequence.length > 0) {
      // Filter only existing saved views
      const validIds = new Set(savedViews.map(v => v.id));
      const filtered = dashboard.presentationSequence.filter(id => validIds.has(id));
      if (filtered.length > 0) return filtered;
    }
    return savedViews.map(v => v.id);
  });

  const [autoPlayInterval, setAutoPlayInterval] = useState<number>(
    dashboard.presentationAutoPlayInterval || 10
  );

  if (!isOpen) return null;

  const viewMap = new Map<string, DashboardSavedView>(savedViews.map(v => [v.id, v]));
  const unusedViews = savedViews.filter(v => !sequence.includes(v.id));

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setSequence(prev => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= sequence.length - 1) return;
    setSequence(prev => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleRemoveFromSequence = (id: string) => {
    setSequence(prev => prev.filter(item => item !== id));
  };

  const handleAddToSequence = (id: string) => {
    if (!sequence.includes(id)) {
      setSequence(prev => [...prev, id]);
    }
  };

  const handleAddAll = () => {
    setSequence(savedViews.map(v => v.id));
  };

  const handleSave = (startPresenting: boolean = false) => {
    onSaveSequence(sequence, autoPlayInterval);
    if (startPresenting) {
      onStartPresentation();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Presentation Slide Sequence</h2>
              <p className="text-xs text-zinc-500">Organize saved views into an executive slide deck sequence</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 text-xs">
          {savedViews.length === 0 ? (
            <div className="text-center py-8 px-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <Bookmark className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">No Saved Views Found</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
                Create and save a few analytical views first to assemble a multi-slide presentation sequence.
              </p>
            </div>
          ) : (
            <>
              {/* Ordered Sequence List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Slides in Presentation ({sequence.length})
                  </label>
                  {unusedViews.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddAll}
                      className="text-[11px] h-6 text-blue-600 dark:text-blue-400"
                    >
                      Add All Views
                    </Button>
                  )}
                </div>

                {sequence.length === 0 ? (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-zinc-500">
                    No slides selected. Click an available view below to add it.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sequence.map((viewId, index) => {
                      const view = viewMap.get(viewId);
                      if (!view) return null;

                      return (
                        <div 
                          key={viewId}
                          className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 transition-all hover:border-blue-300"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <div className="truncate">
                              <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                {view.name}
                              </div>
                              {view.description && (
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {view.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30"
                              title="Move Slide Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === sequence.length - 1}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30"
                              title="Move Slide Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromSequence(viewId)}
                              className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Remove from Sequence"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Unused Available Views */}
              {unusedViews.length > 0 && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                    Available Saved Views ({unusedViews.length})
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {unusedViews.map(view => (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => handleAddToSequence(view.id)}
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-400 text-left transition-all group"
                      >
                        <div className="truncate pr-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300 block truncate">
                            {view.name}
                          </span>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-Play Duration Settings */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Auto-Play Slide Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 30].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setAutoPlayInterval(sec)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg border text-center transition-all text-xs font-medium",
                        autoPlayInterval === sec
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50"
                      )}
                    >
                      {sec} seconds
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-zinc-600 dark:text-zinc-400"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSave(false)}
              className="text-xs"
            >
              Save Deck
            </Button>

            <Button
              size="sm"
              onClick={() => handleSave(true)}
              disabled={sequence.length === 0}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Presentation</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
