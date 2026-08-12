import { Sparkles, Network, ArrowRight } from 'lucide-react';
import { ViewState } from '@/types';
import { Button } from '../ui/button';

interface RightPanelProps {
  currentView: ViewState;
  suggestionsCount: number;
  pendingCount: number;
}

export function RightPanel({ currentView, suggestionsCount, pendingCount }: RightPanelProps) {
  return (
    <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] hidden xl:flex flex-col shrink-0 overflow-hidden shadow-2xl shadow-blue-900/5 relative z-10">
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-2 shrink-0">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">AI Copilot</span>
      </div>
      <div className="flex-1 flex flex-col p-6">
        {currentView === 'relationships' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30 text-sm text-blue-900 dark:text-blue-100 leading-relaxed shadow-sm">
              <p>
                I found <strong className="font-bold">{suggestionsCount}</strong> possible relationships between your datasets.
              </p>
              {pendingCount > 0 ? (
                <p className="mt-2">
                  Please review the <strong className="font-bold">{pendingCount}</strong> pending relationships before continuing.
                </p>
              ) : (
                <p className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  All suggestions have been reviewed!
                </p>
              )}
            </div>
            
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-4 px-1">
                <Network className="w-4 h-4" />
                <span>Click on a dotted connection line to review it.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-blue-500 dark:text-blue-400 opacity-50" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                AI Copilot will appear here after data is imported.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
