import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Network, ArrowRight, Send, Loader2, Trash2, LayoutDashboard, Check, TrendingUp, TrendingDown, Minus, AlertTriangle, PieChart } from 'lucide-react';
import { ViewState, Dataset, RelationshipSuggestion, DashboardPlan, Dashboard } from '@/types';
import { executeAnalysis, AnalyzePlan } from '@/lib/analyticsEngine';
import { queryCopilot } from '@/lib/copilotEngine';
import { WidgetRenderer } from '../dashboards/WidgetRenderer';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';

interface RightPanelProps {
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

export function RightPanel({ currentView, datasets, suggestions, dashboards = [], activeDashboardId, onBuildDashboard }: RightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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
      // Hide intermediate analysis planning messages
      if (analyzePlan) {
        aiMessage.isSystem = true;
      }
      
      newHistory = [...newHistory, aiMessage];
      setMessages(newHistory);

      if (analyzePlan) {
        // Execute the local analysis
        const result = executeAnalysis(datasets, analyzePlan);
        const resultText = `[System Analytics Engine Result]:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
        
        // Feed it back to the AI
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
    <aside className="w-96 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] hidden xl:flex flex-col shrink-0 overflow-hidden shadow-2xl shadow-blue-900/5 relative z-10">
      {/* Header */}
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Analytics Copilot</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">Your AI-powered data assistant</span>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => setMessages([])} title="Clear conversation">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {!hasDatasets ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-blue-500 dark:text-blue-400 opacity-50" />
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[200px] mx-auto">
                AI Copilot will appear here after data is imported.
              </p>
            </div>
          </div>
        ) : showInitialState ? (
          <div className="flex-1 flex flex-col justify-end gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-sm text-sm text-zinc-800 dark:text-zinc-200 shadow-sm border border-zinc-200/50 dark:border-zinc-800/50">
                <p className="mb-2 font-medium">Your datasets are ready.</p>
                <p>I've reviewed the available dataset structure and relationships.</p>
                <p className="mt-2 font-medium">What would you like to explore?</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Suggested</span>
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-sm bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-700 dark:text-zinc-300 p-3 rounded-xl transition-all flex items-center justify-between group shadow-sm"
                >
                  <span className="line-clamp-1 pr-2">{prompt}</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.filter(m => !m.isSystem).map((msg) => {
              const { plan, inlineChart, insightCard, remainingText } = msg.role === 'assistant' ? parseAssistantMessage(msg.text) : { plan: null, inlineChart: null, insightCard: null, remainingText: msg.text };

              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[90%]", msg.role === 'user' ? "self-end" : "self-start")}>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-br-sm" 
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-sm border border-zinc-200/50 dark:border-zinc-800/50"
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="flex flex-col gap-3">
                        {remainingText && (
                          <div className="markdown-body prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800">
                            <Markdown>{remainingText}</Markdown>
                          </div>
                        )}
                        {insightCard && (
                          <div className="mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{insightCard.title}</span>
                              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{insightCard.value}</span>
                            </div>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              insightCard.trend === 'up' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                              insightCard.trend === 'down' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                              "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                            )}>
                              {insightCard.trend === 'up' ? <TrendingUp className="w-5 h-5" /> : 
                               insightCard.trend === 'down' ? <TrendingDown className="w-5 h-5" /> : 
                               <Minus className="w-5 h-5" />}
                            </div>
                          </div>
                        )}
                        {inlineChart && (
                          <div className="mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm h-64 flex flex-col">
                            <h4 className="font-semibold text-sm mb-4 text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              <PieChart className="w-4 h-4 text-blue-500" />
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
                          <div className="mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50">
                              <LayoutDashboard className="w-4 h-4 text-blue-500" />
                              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Dashboard Plan</h4>
                            </div>
                            <div className="p-3 space-y-3">
                              <div>
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</span>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">{plan.title}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">KPIs</span>
                                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">{plan.kpis.length} metrics</p>
                                </div>
                                <div>
                                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Charts</span>
                                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5">{plan.charts.length} charts</p>
                                </div>
                              </div>
                              <div className="pt-2 flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => onBuildDashboard?.(plan)}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Build Dashboard
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {(() => {
                          const msgIndex = messages.findIndex(m => m.id === msg.id);
                          if (msgIndex > 1) {
                            const prevSysMsg = messages[msgIndex - 1];
                            const prevPlanMsg = messages[msgIndex - 2];
                            if (prevSysMsg?.isSystem && prevPlanMsg?.isSystem) {
                              const { analyzePlan } = parseAssistantMessage(prevPlanMsg.text);
                              if (analyzePlan) {
                                return (
                                  <details className="mt-2 text-xs border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-950">
                                    <summary className="p-2 cursor-pointer font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-2">
                                      <Sparkles className="w-3 h-3" />
                                      View Analysis Trace
                                    </summary>
                                    <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 whitespace-pre-wrap font-mono text-[10px] text-zinc-500 overflow-x-auto max-h-48 overflow-y-auto">
                                      <div className="mb-2"><strong>Dataset:</strong> {analyzePlan.datasetId}</div>
                                      <div className="mb-2"><strong>Type:</strong> {analyzePlan.type}</div>
                                      {analyzePlan.metrics && <div className="mb-2"><strong>Metrics:</strong> {JSON.stringify(analyzePlan.metrics)}</div>}
                                      {analyzePlan.dimensions && <div className="mb-2"><strong>Dimensions:</strong> {JSON.stringify(analyzePlan.dimensions)}</div>}
                                      <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-400">
                                        {prevSysMsg.text.substring(0, 500)}{prevSysMsg.text.length > 500 ? '...' : ''}
                                      </div>
                                    </div>
                                  </details>
                                );
                              }
                            }
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{remainingText}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex flex-col self-start max-w-[85%]">
                <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-sm border border-zinc-200/50 dark:border-zinc-800/50 flex items-center gap-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm">
                <p className="font-semibold mb-1">Connection Error</p>
                <p>{error}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {hasDatasets && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e]">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask Copilot..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50"
            />
            <Button 
              type="submit" 
              size="icon" 
              className={cn(
                "h-8 w-8 shrink-0 rounded-lg transition-all",
                input.trim() && !isLoading ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
              )}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-[10px] text-zinc-400 text-center mt-2 font-medium">
            AI can make mistakes. Verify important information.
          </div>
        </div>
      )}
    </aside>
  );
}
