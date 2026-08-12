import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Send, 
  Trash2, 
  LayoutDashboard, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  PieChart,
  X,
  Bot
} from 'lucide-react';
import { ViewState, Dataset, RelationshipSuggestion, DashboardPlan, Dashboard } from '@/types';
import { executeAnalysis, AnalyzePlan } from '@/lib/analyticsEngine';
import { queryCopilot } from '@/lib/copilotEngine';
import { WidgetRenderer } from '../dashboards/WidgetRenderer';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewState;
  datasets: Dataset[];
  suggestions: RelationshipSuggestion[];
  dashboards?: Dashboard[];
  activeDashboardId?: string | null;
  onBuildDashboard?: (plan: DashboardPlan) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isSystem?: boolean;
}

const SUGGESTED_PROMPTS = [
  "How did sales perform last month?",
  "Build a sales dashboard.",
  "Which dataset should I analyze first?",
  "Give me an executive summary."
];

function parseAssistantMessage(text: string) {
  const codeBlocks = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)];
  let plan: DashboardPlan | null = null;
  let inlineChart: any | null = null;
  let insightCard: any | null = null;
  let analyzePlan: AnalyzePlan | null = null;
  let remainingText = text;

  for (const match of codeBlocks) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed._dashboardPlan) {
        plan = parsed._dashboardPlan;
        remainingText = remainingText.replace(match[0], '').trim();
      }
      if (parsed._inlineChart) {
        inlineChart = parsed._inlineChart;
        remainingText = remainingText.replace(match[0], '').trim();
      }
      if (parsed._insightCard) {
        insightCard = parsed._insightCard;
        remainingText = remainingText.replace(match[0], '').trim();
      }
      if (parsed._analyzePlan) {
        analyzePlan = parsed._analyzePlan;
        remainingText = remainingText.replace(match[0], '').trim();
      }
    } catch (e) {
      // Ignore parse errors for partial/invalid blocks
    }
  }

  return { plan, inlineChart, insightCard, analyzePlan, remainingText };
}

export function RightPanel({ 
  isOpen,
  onClose,
  currentView, 
  datasets, 
  suggestions, 
  dashboards = [], 
  activeDashboardId, 
  onBuildDashboard 
}: RightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change or drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 100);
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const suggestionsCount = suggestions.length;
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  const handleSend = async (text: string, isSystem = false, currentHistory?: Message[]) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString() + Math.random(), role: 'user', text, isSystem };
    const baseHistory = currentHistory || messages;
    let newHistory = [...baseHistory, userMessage];
    
    if (!isSystem) {
      setMessages(newHistory);
      setInput('');
      setIsLoading(true);
      setError(null);
    } else {
      setMessages(newHistory);
    }

    try {
      const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
      const metadata = {
        datasets: datasets.map(d => ({
          name: d.name,
          type: d.type,
          rowCount: d.rowCount,
          columns: d.headers,
          columnTypes: d.headers.map(h => ({ name: h, type: d.columnProfiles[h]?.type || 'unknown' })),
          cleaningStatus: d.cleaningStatus,
          detectedIssues: (d.issues || []).filter(i => i.status === 'pending').map(i => ({
            type: i.type,
            title: i.title,
            risk: i.riskLevel,
            affectedRows: i.affectedRowCount
          }))
        })),
        relationships: {
          totalDetected: suggestionsCount,
          pendingReview: pendingCount,
          approved: suggestions.filter(s => s.status === 'accepted').map(s => `${s.sourceDatasetId}.${s.sourceColumn} -> ${s.targetDatasetId}.${s.targetColumn} (${s.type})`)
        },
        dashboards: dashboards.map(d => ({
          id: d.id,
          title: d.title,
          widgetsCount: d.widgets.length
        })),
        activeDashboard: activeDashboard ? {
          title: activeDashboard.title,
          widgets: activeDashboard.widgets.map(w => ({
            title: w.title,
            type: w.type,
            datasetId: w.datasetId,
            aggregation: w.aggregation,
            xAxisColumn: w.xAxisColumn,
            yAxisColumn: w.yAxisColumn
          }))
        } : null
      };

      const result = await queryCopilot(
        text,
        baseHistory.map(m => ({ role: m.role, text: m.text })),
        metadata,
        datasets
      );

      const aiText = result.text;
      const { analyzePlan } = parseAssistantMessage(aiText);

      const aiMessage: Message = { id: Date.now().toString() + Math.random(), role: 'assistant', text: aiText };
      if (analyzePlan) {
        aiMessage.isSystem = true;
      }
      
      newHistory = [...newHistory, aiMessage];
      setMessages(newHistory);

      if (analyzePlan) {
        const result = executeAnalysis(datasets, analyzePlan);
        const resultText = `[System Analytics Engine Result]:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
        await handleSend(resultText, true, newHistory);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the AI.');
    } finally {
      if (!isSystem) {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    }
  };

  const hasDatasets = datasets.length > 0;
  const showInitialState = hasDatasets && messages.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-white dark:bg-[#0c0c0e] border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 overflow-hidden">
        
        {/* Drawer Header */}
        <div className="h-13 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-50/80 dark:bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">AI Analytics Copilot</h3>
              <p className="text-[10px] text-zinc-400 font-medium">Contextual Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" 
                onClick={() => setMessages([])} 
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" 
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
          {!hasDatasets ? (
            <div className="flex-1 flex items-center justify-center text-center p-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400">
                  <Bot className="w-5 h-5" />
                </div>
                <p className="text-xs text-zinc-500 max-w-[220px] mx-auto leading-relaxed">
                  Import a dataset to begin asking AI questions and building dynamic insights.
                </p>
              </div>
            </div>
          ) : showInitialState ? (
            <div className="flex-1 flex flex-col justify-end gap-5 animate-in fade-in duration-300">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3.5 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800/80 leading-relaxed">
                  <p className="font-semibold mb-1 text-zinc-900 dark:text-zinc-100">Dataset Loaded & Context Synced</p>
                  <p>I have indexed column statistics and table schemas across your active workspace.</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Suggested Prompts</span>
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="text-left text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-zinc-700 dark:text-zinc-300 p-2.5 rounded-md transition-all flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.filter(m => !m.isSystem).map((msg) => {
                const { plan, inlineChart, insightCard, remainingText } = msg.role === 'assistant' ? parseAssistantMessage(msg.text) : { plan: null, inlineChart: null, insightCard: null, remainingText: msg.text };

                return (
                  <div key={msg.id} className={cn("flex flex-col max-w-[92%]", msg.role === 'user' ? "self-end" : "self-start")}>
                    <div className={cn(
                      "p-3 rounded-md text-xs leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white" 
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800/60"
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="flex flex-col gap-3">
                          {remainingText && (
                            <div className="markdown-body prose prose-xs dark:prose-invert">
                              <Markdown>{remainingText}</Markdown>
                            </div>
                          )}
                          {insightCard && (
                            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-3 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">{insightCard.title}</span>
                                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{insightCard.value}</span>
                              </div>
                              <div className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center",
                                insightCard.trend === 'up' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" :
                                insightCard.trend === 'down' ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" :
                                "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                              )}>
                                {insightCard.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                                 insightCard.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : 
                                 <Minus className="w-4 h-4" />}
                              </div>
                            </div>
                          )}
                          {inlineChart && (
                            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md p-3 h-56 flex flex-col">
                              <h4 className="font-semibold text-xs mb-2 text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <PieChart className="w-3.5 h-3.5 text-blue-500" />
                                {inlineChart.title}
                              </h4>
                              <div className="flex-1 min-h-0">
                                <WidgetRenderer 
                                  widget={{ id: 'inline', ...inlineChart }}
                                  datasets={datasets}
                                  relationships={suggestions.filter(s => s.status === 'accepted')}
                                  filters={dashboards.find(d => d.id === activeDashboardId)?.filters || []}
                                />
                              </div>
                            </div>
                          )}
                          {plan && (
                            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
                              <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50">
                                <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" />
                                <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Proposed Dashboard Plan</h4>
                              </div>
                              <div className="p-3 space-y-2">
                                <div>
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Title</span>
                                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{plan.title}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                                  <div>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Metrics</span>
                                    <span>{plan.kpis.length} KPIs</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Charts</span>
                                    <span>{plan.charts.length} Widgets</span>
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 mt-1"
                                  onClick={() => {
                                    onBuildDashboard?.(plan);
                                    onClose();
                                  }}
                                >
                                  <Check className="w-3.5 h-3.5 mr-1.5" />
                                  Build Dashboard
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{remainingText}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex flex-col self-start max-w-[85%]">
                  <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-md border border-zinc-200/50 dark:border-zinc-800/50 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11px] text-zinc-400">Analyzing dataset...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-md text-xs">
                  <p className="font-semibold mb-0.5">Connection Error</p>
                  <p>{error}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        {hasDatasets && (
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e]">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-md p-1 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask AI Copilot..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50"
              />
              <Button 
                type="submit" 
                size="icon" 
                className={cn(
                  "h-7 w-7 shrink-0 rounded transition-all",
                  input.trim() && !isLoading ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                )}
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
