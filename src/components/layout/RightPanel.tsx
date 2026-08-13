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
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside 
        className={cn(
          "fixed top-0 right-0 h-full w-[500px] max-w-full bg-white dark:bg-[#09090b] border-l border-zinc-200/80 dark:border-zinc-850/80 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out font-sans",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        
        {/* Drawer Header */}
        <div className="h-14 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between px-4 shrink-0 bg-zinc-50/25 dark:bg-zinc-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 tracking-wider uppercase">AI Copilot Analyst</h3>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold tracking-widest uppercase">GROUNDED COMPLIANCE ENGINE v2</p>
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

        {/* Unified Premium Information Console (Sub-Header Grid) */}
        {activeDataset && (
          <div className="bg-zinc-50/50 dark:bg-zinc-950/30 border-b border-zinc-200/50 dark:border-zinc-900/60 p-3.5 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                DATA CONTEXT ATTACHED
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/15 px-2 py-0.5 rounded">
                GROUNDING ACTIVE
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {/* Card 1: Name */}
              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-850/50 text-center space-y-0.5 min-w-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block truncate">SOURCE</span>
                <span className="text-[11px] font-black text-zinc-800 dark:text-zinc-100 block truncate flex items-center justify-center gap-1">
                  <Database className="w-3 h-3 text-blue-500 shrink-0" />
                  {activeDataset.name}
                </span>
              </div>
              
              {/* Card 2: Rows */}
              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-850/50 text-center space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block">RECORDS</span>
                <span className="text-[11px] font-black font-mono text-zinc-800 dark:text-zinc-100 block">
                  {(activeDataset.rowCount || activeDataset.fullData?.length || 0).toLocaleString()}
                </span>
              </div>
              
              {/* Card 3: Cols */}
              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-850/50 text-center space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block">COLUMNS</span>
                <span className="text-[11px] font-black font-mono text-zinc-800 dark:text-zinc-100 block">
                  {activeDataset.headers?.length || 0}
                </span>
              </div>
              
              {/* Card 4: Health Score */}
              <div className={cn(
                "p-2 rounded-xl border text-center space-y-0.5",
                healthScore >= 90 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-450" :
                healthScore >= 70 ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-450" :
                "bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-455"
              )}>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block">INTEGRITY</span>
                <span className="text-[11px] font-black font-mono block">
                  {healthScore}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
          {!hasDatasets ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mx-auto border border-zinc-200/50 dark:border-zinc-800/50">
                  <Bot className="w-8 h-8" />
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-white dark:border-zinc-950">
                  !
                </span>
              </div>
              <div className="space-y-1 max-w-xs">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">No Dataset Loaded</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Please upload or import a dataset in the workspace to initialize the AI Copilot and query mathematical evidence.
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-between py-2 space-y-6 animate-in fade-in duration-300">
              
              {/* Grounding manifesto card */}
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-900/60 leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">Deterministic Co-Pilot Online</p>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                    This assistant integrates raw computations with advanced natural language synthesis. Ask questions about KPIs, trends, and formatting. Every numeric metric is validated prior to interpretation.
                  </p>
                </div>
              </div>

              {/* Bento-like Quick Questions Grid */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest ml-1 block">
                  Suggested Entry Points
                </span>
                
                <div className="space-y-4">
                  {/* Category A: Trend Analysis */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-500 ml-1">
                      📈 Trends & Explorations
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[TASK9_QUICK_QUESTIONS[0], TASK9_QUICK_QUESTIONS[1], TASK9_QUICK_QUESTIONS[3]].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="text-left text-xs bg-white dark:bg-zinc-900/55 border border-zinc-200/60 dark:border-zinc-850/60 hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 text-zinc-700 dark:text-zinc-300 px-3 py-2.5 rounded-lg transition-all flex items-center justify-between group shadow-3xs"
                        >
                          <span className="truncate pr-2 font-medium">{prompt}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category B: Data Quality */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-500 ml-1">
                      🧼 Integrity & Governance
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[TASK9_QUICK_QUESTIONS[2], TASK9_QUICK_QUESTIONS[6]].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="text-left text-xs bg-white dark:bg-zinc-900/55 border border-zinc-200/60 dark:border-zinc-850/60 hover:border-amber-500/50 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 text-zinc-700 dark:text-zinc-300 px-3 py-2.5 rounded-lg transition-all flex items-center justify-between group shadow-3xs"
                        >
                          <span className="truncate pr-2 font-medium">{prompt}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category C: Executive Synthesis */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-500 ml-1">
                      📊 Executive Reports
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[TASK9_QUICK_QUESTIONS[4], TASK9_QUICK_QUESTIONS[5]].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="text-left text-xs bg-white dark:bg-zinc-900/55 border border-zinc-200/60 dark:border-zinc-850/60 hover:border-violet-50/50 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 text-zinc-700 dark:text-zinc-300 px-3 py-2.5 rounded-lg transition-all flex items-center justify-between group shadow-3xs"
                        >
                          <span className="truncate pr-2 font-medium">{prompt}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-violet-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {messages.filter(m => !m.isSystem).map((msg) => {
                const { plan, inlineChart, insightCard, remainingText } = msg.role === 'assistant' ? parseAssistantMessage(msg.text) : { plan: null, inlineChart: null, insightCard: null, remainingText: msg.text };
                const ev = msg.evidence;
                const isExpanded = expandedEvidenceIds[msg.id] !== false; // Default to expanded for maximum calculated context visibility

                return (
                  <div key={msg.id} className={cn("flex flex-col w-full", msg.role === 'user' ? "items-end" : "items-start")}>
                    
                    {/* Role Indicator with metadata */}
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest px-1">
                      {msg.role === 'user' ? (
                        <>
                          <span>User Query</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-800" />
                          <span>Synced Context</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="font-semibold text-zinc-600 dark:text-zinc-300">AI Co-Pilot Analyst</span>
                          <span className="w-1 h-1 rounded-full bg-blue-500/50" />
                          <span className="text-emerald-600 dark:text-emerald-450 font-extrabold">Evidence Grounded</span>
                        </>
                      )}
                    </div>

                    <div className={cn(
                      "rounded-2xl text-xs leading-relaxed transition-all shadow-3xs max-w-[92%]",
                      msg.role === 'user' 
                        ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-150 border border-zinc-200/40 dark:border-zinc-800/40 px-4 py-2.5 rounded-tr-xs" 
                        : "bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-900/80 p-5 rounded-tl-xs space-y-4"
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="flex flex-col gap-3.5">
                          {remainingText && (
                            <div className="markdown-body prose prose-xs dark:prose-invert">
                              <Markdown>{remainingText}</Markdown>
                            </div>
                          )}

                          {/* Analysis Evidence Panel */}
                          {ev && (
                            <div className="mt-1 border-l-2 border-emerald-500/80 border border-zinc-200 dark:border-zinc-850 rounded-r-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/30">
                              <button
                                onClick={() => toggleEvidence(msg.id)}
                                className="w-full px-3 py-2 bg-zinc-100/50 dark:bg-zinc-900/40 flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-150 dark:hover:bg-zinc-900/70 transition-colors"
                              >
                                <span className="flex items-center gap-1.5 uppercase tracking-wider font-extrabold text-[10px]">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  Compliance Evidence ({ev.intent || 'VERIFIED'})
                                </span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                              </button>

                              {isExpanded && (
                                <div className="p-3 space-y-3 text-[11px] border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/50">
                                  <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-900 pb-2">
                                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{ev.title}</p>
                                    <span className="text-[9px] shrink-0 uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black px-1.5 py-0.5 rounded border border-emerald-500/20">
                                      VERIFIED AT COMPUTATION
                                    </span>
                                  </div>
                                  
                                  {ev.rows && ev.rows.length > 0 && (
                                    <div className="space-y-1.5">
                                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">DETERMINISTIC DATASTREAM COHORT</span>
                                      <div className="overflow-x-auto custom-scrollbar border border-zinc-200 dark:border-zinc-850 rounded-lg">
                                        <table className="w-full text-left text-[10px] font-mono">
                                          <thead className="bg-zinc-50 dark:bg-zinc-900 font-bold text-zinc-500 dark:text-zinc-400">
                                            <tr>
                                              {Object.keys(ev.rows[0]).map((h, i) => (
                                                <th key={i} className="px-2.5 py-2 border-b border-zinc-200 dark:border-zinc-800">{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {ev.rows.map((row, idx) => (
                                              <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                                                {Object.values(row).map((val: any, vIdx) => (
                                                  <td key={vIdx} className="px-2.5 py-1.5 text-zinc-800 dark:text-zinc-300">
                                                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Warning & Governance Alert Box */}
                                  {((ev.qualityDetails && (ev.qualityDetails.healthScore < 90 || ev.qualityDetails.duplicateCount > 0 || ev.qualityDetails.pendingIssuesCount > 0)) || (ev.intent as string) === 'error') && (
                                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-800 dark:text-amber-400 space-y-1">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span>DATA GOVERNANCE WARNING</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                                        {ev.qualityDetails?.healthScore < 90 && `Dataset has a suboptimal health score of ${ev.qualityDetails.healthScore}%. `}
                                        {ev.qualityDetails?.duplicateCount > 0 && `Detected ${ev.qualityDetails.duplicateCount} duplicate records that may distort calculations. `}
                                        {ev.qualityDetails?.pendingIssuesCount > 0 && `${ev.qualityDetails.pendingIssuesCount} issues require immediate review.`}
                                      </p>
                                    </div>
                                  )}

                                  {ev.qualityDetails && (
                                    <div className="space-y-1.5">
                                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">QUALITY AUDIT STATS</span>
                                      <div className="grid grid-cols-4 gap-2 text-center">
                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40">
                                          <span className="text-[8px] font-bold text-zinc-400 uppercase block">HEALTH</span>
                                          <strong className="text-emerald-600 dark:text-emerald-450 font-mono text-[11px] block mt-0.5">{ev.qualityDetails.healthScore}%</strong>
                                        </div>
                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40">
                                          <span className="text-[8px] font-bold text-zinc-400 uppercase block">MISSING</span>
                                          <strong className="text-zinc-700 dark:text-zinc-300 font-mono text-[11px] block mt-0.5">{ev.qualityDetails.missingPercent}%</strong>
                                        </div>
                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40">
                                          <span className="text-[8px] font-bold text-zinc-400 uppercase block">DUPLICATES</span>
                                          <strong className="text-zinc-700 dark:text-zinc-300 font-mono text-[11px] block mt-0.5">{ev.qualityDetails.duplicateCount}</strong>
                                        </div>
                                        <div className="p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200/40 dark:border-zinc-800/40">
                                          <span className="text-[8px] font-bold text-zinc-400 uppercase block">PENDING</span>
                                          <strong className="text-zinc-700 dark:text-zinc-300 font-mono text-[11px] block mt-0.5">{ev.qualityDetails.pendingIssuesCount}</strong>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {ev.kpiDetails && (
                                    <div className="space-y-1.5">
                                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">KPI CALCULATION RESOLUTION</span>
                                      <div className="grid grid-cols-1 gap-1">
                                        {ev.kpiDetails.map((k, i) => (
                                          <div key={i} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg flex items-center justify-between border border-zinc-200/30 dark:border-zinc-800/30">
                                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{k.name}</span>
                                            <span className="font-mono text-blue-600 dark:text-blue-450 font-black text-xs bg-blue-500/10 px-2 py-0.5 rounded">{k.formattedValue}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-[9px] text-zinc-400 font-bold tracking-wider uppercase">
                                    <span>Grounding Level: Strict Schema Match</span>
                                    <span>Engine: AC-Kernel 4.2</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* "Add to Dashboard" Contextual Visual Action Button */}
                          {(ev?.recommendedWidget || inlineChart) && (
                            <div className="mt-2.5 p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200/40 dark:border-blue-900/30 flex items-center justify-between gap-3 shadow-3xs">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-450 block">VISUAL BINDING RECOMMENDED</span>
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium leading-normal">Deploy this localized cohort chart straight to your dashboard workspace.</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] font-bold bg-white text-blue-600 hover:bg-blue-50 dark:bg-zinc-900 dark:text-blue-400 dark:hover:bg-blue-950/45 border-blue-200 dark:border-blue-800 shadow-3xs shrink-0"
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
                                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                                Add Widget
                              </Button>
                            </div>
                          )}

                          {plan && (
                            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-3xs">
                              <div className="p-3 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50">
                                <LayoutDashboard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Proposed Dashboard Plan</h4>
                              </div>
                              <div className="p-3.5 space-y-3">
                                <div>
                                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">TARGET LAYOUT TITLE</span>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{plan.title}</p>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 shadow-xs font-bold"
                                  onClick={() => {
                                    onBuildDashboard?.(plan);
                                    onClose();
                                  }}
                                >
                                  <Check className="w-3.5 h-3.5 mr-1.5" />
                                  Construct & Load Dashboard
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap font-medium">{remainingText}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="w-full max-w-[92%] self-start bg-white dark:bg-[#0c0c0e] rounded-2xl border border-zinc-200/60 dark:border-zinc-900/80 p-5 shadow-3xs space-y-4 animate-pulse">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className="w-5 h-5 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                      <Sparkles className="w-2.5 h-2.5 text-blue-500 absolute" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      AI ANALYST ENGINE PROCESSING
                    </span>
                  </div>
                  
                  {/* Step indicators of the deterministic math engine */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        <span>Querying analytical schema context...</span>
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-450 font-bold uppercase text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-800 shrink-0" />
                        <span>Applying mathematical transformations...</span>
                      </span>
                      <span className="text-zinc-400 font-bold uppercase text-[9px]">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-800 shrink-0" />
                        <span>Synthesizing visual representation...</span>
                      </span>
                      <span className="text-zinc-400 font-bold uppercase text-[9px]">
                        Queue
                      </span>
                    </div>
                  </div>
                  
                  {/* Micro progress bar */}
                  <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-[shimmer_1.5s_infinite_linear]" style={{ width: '45%' }} />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-4 rounded-xl text-xs space-y-1 shadow-3xs">
                  <p className="font-extrabold text-[10px] uppercase tracking-wider text-red-800 dark:text-red-400">Connection Error</p>
                  <p className="font-medium leading-relaxed">{error}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        {hasDatasets && (
          <div className="p-3.5 bg-zinc-50/50 dark:bg-[#0c0c0e]/30 border-t border-zinc-200/50 dark:border-zinc-900/60">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex items-center gap-2 bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-850/60 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask a question about metrics, trends, or segments..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50 font-medium"
              />
              <Button 
                type="submit" 
                size="icon" 
                className={cn(
                  "h-8 w-8 shrink-0 rounded-lg transition-all",
                  input.trim() && !isLoading ? "bg-blue-600 hover:bg-blue-700 text-white shadow-xs" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                )}
                disabled={!input.trim() || isLoading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </aside>

      {/* Add Widget Pre-fill Confirmation Dialog */}
      {widgetModalConfig?.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-panel glass-card border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
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
