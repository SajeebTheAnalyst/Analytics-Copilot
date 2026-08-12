import React, { useState, useRef, useEffect } from 'react';
import { calculateDatasetHealth } from '@/lib/profiler';
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
  Bot,
  Database,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  BarChart2,
  FileText,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { ViewState, Dataset, RelationshipSuggestion, DashboardPlan, Dashboard } from '@/types';
import { executeAnalysis, AnalyzePlan } from '@/lib/analyticsEngine';
import { queryCopilot } from '@/lib/copilotEngine';
import { AnalyticalEvidence } from '@/lib/copilotAnalyticsEngine';
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
  evidence?: AnalyticalEvidence | null;
  isSystem?: boolean;
}

const TASK9_QUICK_QUESTIONS = [
  "What are the key trends in this dataset?",
  "Which region generated the most revenue?",
  "What are the biggest data quality issues?",
  "Which products are most profitable?",
  "Explain the current dashboard.",
  "What should management pay attention to?",
  "Which KPIs need attention?"
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
      // Ignore parse errors
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
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Record<string, boolean>>({});

  // Widget Modal State for "Add to Dashboard"
  const [widgetModalConfig, setWidgetModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    type: 'bar' | 'line' | 'pie' | 'kpi' | 'table';
    datasetId: string;
    xAxisColumn: string;
    yAxisColumn: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeDataset = datasets[0] || null;

  // Compute dataset health score for context header
  const healthScore = React.useMemo(() => {
    if (!activeDataset) return 100;
    return calculateDatasetHealth(activeDataset).score;
  }, [activeDataset]);

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

  const toggleEvidence = (id: string) => {
    setExpandedEvidenceIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
          columnTypes: d.headers.map(h => ({ name: h, type: d.columnProfiles?.[h]?.type || 'unknown' })),
          cleaningStatus: d.cleaningStatus
        })),
        activeDashboard: activeDashboard ? {
          title: activeDashboard.title,
          widgetsCount: activeDashboard.widgets.length
        } : null
      };

      const result = await queryCopilot(
        text,
        baseHistory.map(m => ({ role: m.role, text: m.text })),
        metadata,
        datasets,
        dashboards,
        activeDashboardId
      );

      const aiMessage: Message = { 
        id: Date.now().toString() + Math.random(), 
        role: 'assistant', 
        text: result.text,
        evidence: result.evidence
      };
      
      newHistory = [...newHistory, aiMessage];
      setMessages(newHistory);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to the AI Analyst.');
    } finally {
      if (!isSystem) {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    }
  };

  const handleConfirmAddWidget = () => {
    if (!widgetModalConfig || !onBuildDashboard || !activeDataset) return;

    const plan: DashboardPlan = {
      title: `${widgetModalConfig.title} Dashboard`,
      datasets: [activeDataset.name],
      kpis: [],
      charts: [
        {
          title: widgetModalConfig.title,
          type: widgetModalConfig.type as any,
          datasetId: widgetModalConfig.datasetId,
          xAxisColumn: widgetModalConfig.xAxisColumn,
          yAxisColumn: widgetModalConfig.yAxisColumn,
          aggregation: widgetModalConfig.aggregation
        }
      ]
    };

    onBuildDashboard(plan);
    setWidgetModalConfig(null);
    onClose();
  };

  const hasDatasets = datasets.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside className="fixed top-0 right-0 h-full w-[440px] max-w-full bg-white dark:bg-[#0c0c0e] border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 overflow-hidden font-sans">
        
        {/* Drawer Header */}
        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 bg-zinc-50/90 dark:bg-zinc-950/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">AI Analyst</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Ask questions about your data and analysis.</p>
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

        {/* Compact Context Header Bar */}
        {activeDataset && (
          <div className="bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 flex items-center justify-between gap-2 text-[11px] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                <Database className="w-3 h-3 text-blue-500 shrink-0" />
                {activeDataset.name}
              </span>
              <span className="text-zinc-400">|</span>
              <span className="text-zinc-600 dark:text-zinc-400 shrink-0">
                {(activeDataset.rowCount || activeDataset.fullData?.length || 0).toLocaleString()} rows
              </span>
              <span className="text-zinc-400">|</span>
              <span className="text-zinc-600 dark:text-zinc-400 shrink-0">
                {activeDataset.headers?.length || 0} cols
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-medium text-zinc-400">Health:</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                healthScore >= 90 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" :
                healthScore >= 70 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" :
                "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
              )}>
                {healthScore}%
              </span>
            </div>
          </div>
        )}

        {/* Chat Messages Area */}
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
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-end gap-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 border border-blue-200/50 dark:border-blue-900/30 leading-relaxed">
                  <p className="font-semibold mb-0.5 text-blue-900 dark:text-blue-300">Context Synced & Ready</p>
                  <p className="text-zinc-600 dark:text-zinc-400">Ask any question about metrics, trends, quality, or KPIs. All numeric calculations are deterministically computed first.</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Quick Questions</span>
                {TASK9_QUICK_QUESTIONS.map((prompt, i) => (
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
                const ev = msg.evidence;
                const isExpanded = expandedEvidenceIds[msg.id];

                return (
                  <div key={msg.id} className={cn("flex flex-col max-w-[95%]", msg.role === 'user' ? "self-end" : "self-start")}>
                    <div className={cn(
                      "p-3 rounded-lg text-xs leading-relaxed shadow-2xs",
                      msg.role === 'user' 
                        ? "bg-blue-600 text-white" 
                        : "bg-zinc-50 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800"
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="flex flex-col gap-3">
                          {remainingText && (
                            <div className="markdown-body prose prose-xs dark:prose-invert">
                              <Markdown>{remainingText}</Markdown>
                            </div>
                          )}

                          {/* Analysis Evidence Panel */}
                          {ev && (
                            <div className="mt-1 border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-950">
                              <button
                                onClick={() => toggleEvidence(msg.id)}
                                className="w-full px-2.5 py-1.5 bg-zinc-100/80 dark:bg-zinc-900/80 flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                                  Analysis Evidence ({ev.intent})
                                </span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {isExpanded && (
                                <div className="p-2.5 space-y-2 text-[11px] border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{ev.title}</p>
                                  
                                  {ev.rows && ev.rows.length > 0 && (
                                    <div className="overflow-x-auto custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded">
                                      <table className="w-full text-left text-[10px]">
                                        <thead className="bg-zinc-100 dark:bg-zinc-900 font-semibold text-zinc-600 dark:text-zinc-400">
                                          <tr>
                                            {Object.keys(ev.rows[0]).map((h, i) => (
                                              <th key={i} className="px-2 py-1 border-b border-zinc-200 dark:border-zinc-800">{h}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {ev.rows.map((row, idx) => (
                                            <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-800/50">
                                              {Object.values(row).map((val: any, vIdx) => (
                                                <td key={vIdx} className="px-2 py-1 text-zinc-800 dark:text-zinc-200">
                                                  {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {ev.qualityDetails && (
                                    <div className="grid grid-cols-2 gap-2 p-2 bg-zinc-100 dark:bg-zinc-900 rounded">
                                      <div><span className="text-zinc-400">Health:</span> <strong className="text-emerald-600">{ev.qualityDetails.healthScore}%</strong></div>
                                      <div><span className="text-zinc-400">Missing %:</span> <strong>{ev.qualityDetails.missingPercent}%</strong></div>
                                      <div><span className="text-zinc-400">Duplicates:</span> <strong>{ev.qualityDetails.duplicateCount}</strong></div>
                                      <div><span className="text-zinc-400">Pending Issues:</span> <strong>{ev.qualityDetails.pendingIssuesCount}</strong></div>
                                    </div>
                                  )}

                                  {ev.kpiDetails && (
                                    <div className="space-y-1">
                                      {ev.kpiDetails.map((k, i) => (
                                        <div key={i} className="p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded flex items-center justify-between">
                                          <span className="font-semibold">{k.name}</span>
                                          <span className="font-mono text-blue-600 dark:text-blue-400">{k.formattedValue}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* "Add to Dashboard" Action Button */}
                          {(ev?.recommendedWidget || inlineChart) && (
                            <div className="mt-1 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                              <span className="text-[10px] text-zinc-500 font-medium">Recommended Visualization</span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800"
                                onClick={() => {
                                  const rec = ev?.recommendedWidget || inlineChart;
                                  setWidgetModalConfig({
                                    isOpen: true,
                                    title: rec.title || 'Calculated Metric',
                                    type: rec.type || 'bar',
                                    datasetId: rec.datasetId || activeDataset?.id || '',
                                    xAxisColumn: rec.xAxisColumn || activeDataset?.headers[0] || '',
                                    yAxisColumn: rec.yAxisColumn || activeDataset?.headers[1] || '',
                                    aggregation: rec.aggregation || 'sum'
                                  });
                                }}
                              >
                                <PlusCircle className="w-3 h-3 mr-1" />
                                Add to Dashboard
                              </Button>
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
                    <span className="text-[11px] text-zinc-500">Calculating deterministic evidence & generating response...</span>
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
                placeholder="Ask a question about your data..."
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

      {/* Add Widget Pre-fill Confirmation Dialog */}
      {widgetModalConfig?.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" />
                Confirm Add Widget to Dashboard
              </h3>
              <button onClick={() => setWidgetModalConfig(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Widget Title</label>
                <input 
                  type="text" 
                  value={widgetModalConfig.title}
                  onChange={(e) => setWidgetModalConfig({ ...widgetModalConfig, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Chart Type</label>
                  <select 
                    value={widgetModalConfig.type}
                    onChange={(e) => setWidgetModalConfig({ ...widgetModalConfig, type: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="table">Table</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Aggregation</label>
                  <select 
                    value={widgetModalConfig.aggregation}
                    onChange={(e) => setWidgetModalConfig({ ...widgetModalConfig, aggregation: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="sum">SUM</option>
                    <option value="avg">AVG</option>
                    <option value="count">COUNT</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">X Axis (Dimension)</label>
                  <input 
                    type="text" 
                    value={widgetModalConfig.xAxisColumn}
                    onChange={(e) => setWidgetModalConfig({ ...widgetModalConfig, xAxisColumn: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Y Axis (Metric)</label>
                  <input 
                    type="text" 
                    value={widgetModalConfig.yAxisColumn}
                    onChange={(e) => setWidgetModalConfig({ ...widgetModalConfig, yAxisColumn: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setWidgetModalConfig(null)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmAddWidget} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                Confirm & Add to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
