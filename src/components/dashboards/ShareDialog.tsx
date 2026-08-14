import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy, Link as LinkIcon, X } from 'lucide-react';
import { generateDashboardShareUrl, copyShareLinkToClipboard } from '@/lib/dashboardSharing';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  savedViewId?: string;
}

export function ShareDialog({ isOpen, onClose, dashboardId, savedViewId }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = generateDashboardShareUrl(dashboardId, savedViewId);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyShareLinkToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Share View</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        
        <p className="text-sm text-zinc-500">
          Share this direct link to allow others to view this dashboard with the current filters and view applied.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Shareable Link</label>
          <div className="flex gap-2">
            <input value={shareUrl} readOnly className="w-full font-mono text-xs p-2 border border-zinc-300 rounded" />
            <Button onClick={handleCopy} variant="outline" size="icon">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
