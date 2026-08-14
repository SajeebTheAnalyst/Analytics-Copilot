import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  Bookmark, 
  AlertTriangle, 
  ExternalLink, 
  Save, 
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dashboard, DashboardSavedView } from '@/types';
import { generateDashboardShareUrl, copyShareLinkToClipboard } from '@/lib/dashboardSharing';

interface ShareViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dashboard: Dashboard;
  activeSavedView: DashboardSavedView | null;
  hasUnsavedChanges: boolean;
  onSaveAsViewAndShare: () => void;
  onUpdateActiveViewAndShare: () => void;
}

export function ShareViewDialog({
  isOpen,
  onClose,
  dashboard,
  activeSavedView,
  hasUnsavedChanges,
  onSaveAsViewAndShare,
  onUpdateActiveViewAndShare
}: ShareViewDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = generateDashboardShareUrl(dashboard.id, activeSavedView?.id);

  const handleCopy = async () => {
    const success = await copyShareLinkToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Share Analytical View</h2>
              <p className="text-xs text-zinc-500">Generate a direct link to this dashboard and active bookmark</p>
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
        <div className="p-6 space-y-4 text-xs">
          {/* Target Summary Card */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                {dashboard.title}
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                <Bookmark className="w-3 h-3 text-blue-500" />
                <span>
                  {activeSavedView ? `View: "${activeSavedView.name}"` : 'Default Baseline View'}
                </span>
              </div>
            </div>
            {activeSavedView?.isDefault && (
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full font-semibold">
                Default View
              </span>
            )}
          </div>

          {/* Unsaved Changes Alert & Options */}
          {hasUnsavedChanges && (
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="font-bold text-xs">Current state has unsaved analytical filters or drills</div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Sharing the current link will load the last saved state of "{activeSavedView?.name}". To share your recent filter changes, save or update your bookmark first.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {activeSavedView && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUpdateActiveViewAndShare();
                    }}
                    className="text-xs h-7 bg-white dark:bg-zinc-900 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Update "{activeSavedView.name}" & Share
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onSaveAsViewAndShare();
                  }}
                  className="text-xs h-7 bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Save as New View & Share
                </Button>
              </div>
            </div>
          )}

          {/* Share URL Input & Copy Button */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Shareable Direct Link
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 focus:outline-none select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <LinkIcon className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <Button
                onClick={handleCopy}
                className={cn(
                  "text-xs px-3.5 h-9 font-semibold text-white transition-all shrink-0",
                  copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Anyone accessing this workspace URL will open this dashboard with all active filters, drills, and visual settings pre-applied.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end bg-zinc-50/50 dark:bg-zinc-900/50">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-xs text-zinc-600 dark:text-zinc-400"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
