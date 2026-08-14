import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Sparkles, Send, Bot, User, Wrench, ShieldCheck, RefreshCw, X, 
  AlertTriangle, CheckCircle2, ChevronRight, HelpCircle, Layers, FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Dataset } from '@/types';
import { DatasetQualityReport } from '@/lib/qualityScanner';
import { CleaningActionType, CleaningHistoryItem } from '@/lib/manualCleaningEngine';
import { 
  CleaningCopilotMessage, 
  CleaningRecommendation, 
  buildCleaningCopilotContext, 
  queryCleaningCopilot 
} from '@/lib/cleaningCopilotEngine';
import Markdown from 'react-markdown';

interface AICleaningCopilotPanelProps {
  dataset: Dataset;
  workingData?: Record<string, any>[];
  workingHeaders?: string[];
  qualityReport: DatasetQualityReport;
  workingFormulas?: Record<string, string>;
  cleaningHistory?: CleaningHistoryItem[];
  onOpenFixModal: (actionType: CleaningActionType, column?: string, variations?: string[]) => void;
  onClose?: () => void;
  embedded?: boolean;
}

const STARTER_PROMPTS = [
  "What is wrong with this dataset?",
  "How should I clean this data?",
  "Is this data ready for an MIS report?",
  "Which columns need cleaning?",
  "Are my dates consistent?",
  "Clean the Location column"
];

export function AICleaningCopilotPanel({
  dataset,
  workingData,
  workingHeaders,
  qualityReport,
  workingFormulas,
  cleaningHistory,
  onOpenFixModal,
  onClose,
  embedded = false,
}: AICleaningCopilotPanelProps) {
  const [messages, setMessages] = useState<CleaningCopilotMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `Hello! I am your **AI Data Cleaning Copilot** for **${dataset.name}**.\n\nI analyze your active working data using grounded Phase 8I quality heuristics and recommend deterministic Phase 8J cleaning actions.\n\nAsk me anything about defects, column health, or MIS readiness!`,
      timestamp: new Date(),
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Grounded context memoized
  const context = useMemo(() => {
    return buildCleaningCopilotContext(
      dataset,
      workingData,
      workingHeaders,
      qualityReport,
      workingFormulas,
      cleaningHistory
    );
  }, [dataset, workingData, workingHeaders, qualityReport, workingFormulas, cleaningHistory]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMessage: CleaningCopilotMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const assistantResponse = await queryCleaningCopilot(textToSend, messages, context);
      setMessages(prev => [...prev, assistantResponse]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **AI Copilot Encountered an Issue**: ${err.message || 'Unable to connect to AI server.'}\n\nPlease try again or use the manual cleaning toolbar actions.`,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-xs text-zinc-900 dark:text-zinc-100",
      embedded ? "h-full w-full" : "max-w-2xl w-full h-[620px] max-h-[85vh]"
    )}>
      
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-indigo-900/10 dark:from-blue-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50">AI Data Cleaning Copilot</h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Grounded
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Read-only analyst recommending Phase 8J deterministic cleaning actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
              Quality Score
            </div>
            <div className={cn(
              "text-xs font-mono font-extrabold",
              qualityReport.overallScore >= 85 ? "text-emerald-600 dark:text-emerald-400" :
              qualityReport.overallScore >= 70 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {qualityReport.overallScore}/100
            </div>
          </div>

          {!embedded && onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Starter Prompts */}
      <div className="px-4 py-2.5 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 shrink-0 mr-1">
          Quick Prompts:
        </span>
        {STARTER_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSendMessage(prompt)}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-start gap-3 text-xs max-w-[92%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "p-1.5 rounded-xl shrink-0 text-white shadow-xs",
              msg.role === 'user' 
                ? "bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900" 
                : "bg-gradient-to-br from-blue-600 to-indigo-600"
            )}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble Content */}
            <div className="space-y-3 flex-1 min-w-0">
              <div className={cn(
                "p-3.5 rounded-2xl border leading-relaxed",
                msg.role === 'user'
                  ? "bg-blue-600 text-white border-blue-500 rounded-tr-none font-medium"
                  : "bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 rounded-tl-none text-zinc-800 dark:text-zinc-200"
              )}>
                
                {msg.errorNote && (
                  <div className="mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{msg.errorNote}</span>
                  </div>
                )}

                <div className="prose dark:prose-invert max-w-none text-xs space-y-2">
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>

              {/* Action Recommendations List (If present in message) */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="space-y-2 pl-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    <span>Recommended Deterministic Phase 8J Actions:</span>
                  </div>

                  {msg.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {rec.title}
                            </span>
                            {rec.column && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                                {rec.column}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            {rec.explanation}
                          </p>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenFixModal(rec.actionType, rec.column, rec.variations)}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shrink-0 shadow-xs gap-1"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Review Cleaning Action</span>
                        </Button>
                      </div>

                      {/* Variations preview if applicable */}
                      {rec.variations && rec.variations.length > 0 && (
                        <div className="pt-1.5 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-zinc-500">Affected Values:</span>
                          {rec.variations.slice(0, 6).map((v, vIdx) => (
                            <span
                              key={vIdx}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-300"
                            >
                              {v || '<blank>'}
                            </span>
                          ))}
                          {rec.variations.length > 6 && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              +{rec.variations.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-zinc-500 pl-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white animate-spin">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <span className="italic font-medium">Analyzing dataset evidence & compiling recommendations...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Read-Only Safety Disclaimer Banner */}
      <div className="px-4 py-1.5 bg-amber-50/80 dark:bg-amber-950/30 border-t border-amber-200/60 dark:border-amber-900/40 text-[10px] text-amber-800 dark:text-amber-300 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Read-Only Safety Guardrail</strong>: AI Copilot recommends operations. Actual changes execute via deterministic Phase 8J engine only after your review.
          </span>
        </div>

        {messages.length > 1 && (
          <button
            onClick={() => setMessages([messages[0]])}
            className="text-[10px] font-bold underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer shrink-0 ml-2"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask AI Copilot (e.g. 'What is wrong with Location?', 'Can I use this for MIS report?')..."
            className="flex-1 h-9 px-3 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium"
          />

          <Button
            type="button"
            size="sm"
            disabled={!inputQuery.trim() || isLoading}
            onClick={() => handleSendMessage()}
            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer rounded-xl gap-1 shrink-0"
          >
            <span>Ask AI</span>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

    </div>
  );
}
