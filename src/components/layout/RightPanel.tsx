import { Sparkles } from 'lucide-react';

export function RightPanel() {
  return (
    <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] hidden xl:flex flex-col shrink-0 overflow-hidden shadow-2xl shadow-blue-900/5 relative z-10">
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-2 shrink-0">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">AI Copilot</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-6 h-6 text-blue-500 dark:text-blue-400 opacity-50" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            AI Copilot will appear here after data is imported.
          </p>
        </div>
      </div>
    </aside>
  );
}
