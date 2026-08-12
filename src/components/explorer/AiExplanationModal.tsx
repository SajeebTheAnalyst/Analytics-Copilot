import React, { useState } from 'react';
import { Dataset, ColumnFilter, GroupingConfig, QuickMetricConfig } from '@/types';
import { compileAiContext } from '@/lib/explorerEngine';
import { queryCopilot } from '@/lib/copilotEngine';
import { Sparkles, Bot, Send, X, Table, Filter, Layers, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import Markdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface AiExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  filteredRows: Record<string, any>[];
  filters: ColumnFilter[];
  groupingConfig: GroupingConfig | null;
  quickMetrics: QuickMetricConfig[];
}

export function AiExplanationModal({
  isOpen,
  onClose,
  dataset,
  filteredRows,
  filters,
  groupingConfig,
  quickMetrics,
}: AiExplanationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);

  if (!isOpen) return null;

  const aiContext = compileAiContext(dataset, filteredRows, filters, groupingConfig);

  const handleGenerateAnalysis = async (customPrompt?: string) => {
    setIsLoading(true);
    try {
      const userMessage = customPrompt || prompt || `Explain the trends, distribution, and insights from this filtered view of ${dataset.name}.`;

      const metadata = {
        dataset: aiContext.datasetName,
        totalRows: aiContext.totalRows,
        filteredRows: aiContext.filteredRowsCount,
        filters: aiContext.activeFilters,
        grouping: aiContext.grouping,
      };

      const res = await queryCopilot(userMessage, [], metadata, [dataset]);
      setAnalysisText(res.text);
    } catch (e) {
      setAnalysisText("Failed to generate AI analysis. Please verify your connection or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">AI View Analyst</h3>
              <p className="text-xs text-zinc-500">Automated insights on active filtered subset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Analytical Context Summary Strip */}
        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex flex-wrap items-center gap-3 text-xs text-blue-900 dark:text-blue-300 font-mono">
          <span className="flex items-center gap-1">
            <Table className="w-3.5 h-3.5 text-blue-500" />
            {dataset.name} ({filteredRows.length.toLocaleString()} rows)
          </span>
          {filters.length > 0 && (
            <span className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              {filters.length} Filter{filters.length > 1 ? 's' : ''} Active
            </span>
          )}
          {groupingConfig && (
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              Grouped by {groupingConfig.groupByColumn}
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {!analysisText && !isLoading && (
            <div className="text-center py-8 space-y-3">
              <Bot className="w-10 h-10 text-blue-500 mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Ready to Analyze Current View</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                The AI Analyst will evaluate your active filters, grouping distributions, and statistics to generate an executive summary.
              </p>
              <Button
                onClick={() => handleGenerateAnalysis()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate AI Explanation
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500 font-mono">Analyzing filtered analytical view...</p>
            </div>
          )}

          {analysisText && !isLoading && (
            <div className="prose dark:prose-invert text-xs max-w-none space-y-2 leading-relaxed">
              <Markdown>{analysisText}</Markdown>
            </div>
          )}
        </div>

        {/* Custom Query Input */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) handleGenerateAnalysis(prompt.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask a specific question about this view..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !prompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Ask
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
