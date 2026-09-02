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
  Wrench,
  Play,
  Database,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  BarChart2,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { ViewState, Dataset, RelationshipSuggestion, DashboardPlan, Dashboard, KpiDefinition } from '@/types';
import { executeAnalysis, AnalyzePlan } from '@/lib/analyticsEngine';
import { queryCopilot } from '@/lib/copilotEngine';
import { AnalyticalEvidence, ActionPlan, ActionPlanStep } from '@/lib/copilotAnalyticsEngine';
import { WidgetRenderer } from '../dashboards/WidgetRenderer';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  removeNullsCustom, 
  transformTextCustom, 
  standardizeDatesCustom, 
  castColumnTypeCustom, 
  filterOutliersCustom 
} from '@/lib/dataCleaner';
import { addOrUpdateKpi } from '@/lib/kpiStorage';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewState;
  onViewChange?: (view: ViewState) => void;
  datasets: Dataset[];
  suggestions: RelationshipSuggestion[];
  dashboards?: Dashboard[];
  activeDashboardId?: string | null;
  onBuildDashboard?: (plan: DashboardPlan) => void;
  onUpdateDataset?: (dataset: Dataset) => void;
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
  onBuildDashboard,
  onUpdateDataset,
  onViewChange
}: RightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingPlan, setExecutingPlan] = useState<{ plan: ActionPlan; currentStep: number; status: 'idle' | 'running' | 'completed' | 'error' } | null>(null);
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

  // Resize State
  const [panelWidth, setPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ isResizing: boolean; startX: number; startWidth: number }>({
    isResizing: false,
    startX: 0,
    startWidth: 450
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current.isResizing) return;
      
      const delta = resizeRef.current.startX - e.clientX;
      const newWidth = resizeRef.current.startWidth + delta;
      
      const minWidth = 320;
      const maxWidth = Math.min(800, window.innerWidth * 0.6);
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (resizeRef.current.isResizing) {
        setIsResizing(false);
        resizeRef.current.isResizing = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startWidth: panelWidth
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        currentView,
        datasets: datasets.map(d => ({
          name: d.name,
          id: d.id,
          type: d.type,
          rowCount: d.rowCount,
          columns: d.headers,
          columnTypes: d.headers.map(h => ({ name: h, type: d.columnProfiles?.[h]?.type || 'unknown' })),
          cleaningStatus: d.cleaningStatus,
          issues: (d.issues || []).filter(i => i.status === 'pending').length
        })),
        activeDashboard: activeDashboard ? {
          title: activeDashboard.title,
          widgetsCount: activeDashboard.widgets.length,
          filters: (activeDashboard.filters || []).length
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

  const handleNavigate = (target: string) => {
    if (onViewChange) {
      onViewChange(target as ViewState);
      
      const successMsg: Message = {
        id: Date.now().toString() + Math.random(),
        role: 'assistant',
        text: `✅ **Navigation Successful**\n\nI have switched your workspace to the **${target.replace(/-/g, ' ')}** view. How else can I assist you in this context?`,
        isSystem: true
      };
      setMessages(prev => [...prev, successMsg]);
    }
  };

  const handleCreateKpi = async (ev: AnalyticalEvidence) => {
    if (!ev.kpiCreation || !activeDataset) return;
    
    const k = ev.kpiCreation;
    const newKpi: KpiDefinition = {
      id: `kpi-${Date.now()}`,
      name: k.name,
      description: k.description,
      datasetId: activeDataset.id,
      datasetName: activeDataset.name,
      metricType: 'simple',
      column: k.column,
      aggregation: k.aggregation as any,
      filters: [],
      format: { type: 'number', decimals: 2 },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await addOrUpdateKpi(newKpi);
    
    const successMsg: Message = {
      id: Date.now().toString() + Math.random(),
      role: 'assistant',
      text: `✅ **KPI Created Successfully**\n\nThe new KPI "**${k.name}**" has been added to your library. You can now use it in dashboards and MIS reports.`,
      isSystem: true
    };
    setMessages(prev => [...prev, successMsg]);
  };

  const handleExecuteActionPlan = async (ev: AnalyticalEvidence) => {
    if (!ev.actionPlan) return;
    
    setExecutingPlan({ plan: ev.actionPlan, currentStep: 0, status: 'running' });
    
    const steps = [...ev.actionPlan.steps];
    
    for (let i = 0; i < steps.length; i++) {
      setExecutingPlan(prev => prev ? { ...prev, currentStep: i } : null);
      const step = steps[i];
      
      try {
        // Execute step based on action type
        if (step.action === 'cleaning') {
          const { actionType, column, params } = step.payload;
          const dataset = datasets.find(d => d.id === ev.datasetId);
          if (dataset && onUpdateDataset) {
            let updated = dataset;
            if (actionType === 'date') updated = standardizeDatesCustom(dataset, column, params.dateFormat);
            else if (actionType === 'text') updated = transformTextCustom(dataset, column, params.action);
            onUpdateDataset(updated);
          }
        } else if (step.action === 'kpi_create') {
          const k = step.payload;
          if (activeDataset) {
            const newKpi: KpiDefinition = {
              id: `kpi-${Date.now()}`,
              name: k.name,
              description: `Generated via Action Plan: ${k.name}`,
              datasetId: activeDataset.id,
              datasetName: activeDataset.name,
              metricType: 'simple',
              column: k.column,
              aggregation: k.aggregation,
              filters: [],
              format: { type: 'number', decimals: 2 },
              status: 'active',
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            await addOrUpdateKpi(newKpi);
          }
        } else if (step.action === 'navigation') {
          if (onViewChange) onViewChange(step.payload.target);
        } else if (step.action === 'dashboard_add') {
          if (onBuildDashboard) {
            onBuildDashboard({
              title: step.payload.title,
              datasets: [activeDataset.id],
              kpis: [],
              charts: []
            });
          }
        }
        
        // Brief pause for visual progress
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        setExecutingPlan(prev => prev ? { ...prev, status: 'error' } : null);
        return;
      }
    }
    
    setExecutingPlan(prev => prev ? { ...prev, status: 'completed' } : null);
    
    const finalMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      text: `✅ **Action Plan Completed**\n\nAll steps for "${ev.actionPlan.title}" have been successfully executed using our deterministic analytics engine.`,
      isSystem: true
    };
    setMessages(prev => [...prev, finalMsg]);
  };

  const handleApplyCleaning = (ev: AnalyticalEvidence) => {
    if (!ev.cleaningAction || !onUpdateDataset) return;
    const { actionType, column, params } = ev.cleaningAction;
    const dataset = datasets.find(d => d.id === ev.datasetId);
    if (!dataset) return;

    let updatedDataset = dataset;
    if (actionType === 'nulls') {
      updatedDataset = removeNullsCustom(dataset, column!, params.strategy, params.customText);
    } else if (actionType === 'text') {
      updatedDataset = transformTextCustom(dataset, column!, params.action);
    } else if (actionType === 'date') {
      updatedDataset = standardizeDatesCustom(dataset, column!, params.dateFormat);
    } else if (actionType === 'cast') {
      updatedDataset = castColumnTypeCustom(dataset, column!, params.targetType);
    } else if (actionType === 'outliers') {
      updatedDataset = filterOutliersCustom(dataset, column!, params.threshold);
    }

    onUpdateDataset(updatedDataset);
    
    // Add a success message to the chat
    const successMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      text: `✅ **Operation Successful**\n\nThe cleaning action "${ev.cleaningAction.description}" has been applied to **${dataset.name}**. The change has been recorded in the audit trail and your data integrity score has been updated.`,
      isSystem: true
    };
    setMessages(prev => [...prev, successMsg]);
  };

  const hasDatasets = datasets.length > 0;

  return (
    <>
      <aside 
        className={cn(
          "h-full border-l border-zinc-200/40 dark:border-zinc-800/40 flex flex-col font-sans bg-white/50 dark:bg-[#06080e]/40 backdrop-blur-2xl shrink-0 relative overflow-hidden",
          isOpen ? "opacity-100 shadow-[-12px_0_40px_rgba(0,0,0,0.03)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.4)]" : "w-0 opacity-0 border-l-0"
        )}
        style={{ 
          width: isOpen ? `${panelWidth}px` : '0',
          transition: isResizing ? 'none' : 'width 300ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 250ms ease-in-out'
        }}
      >
        {/* Animated Subtle Premium Glowing Aura */}
        {isOpen && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/70 via-indigo-500/70 to-blue-500/70 bg-[length:200%_100%] animate-[shimmer_3s_infinite_linear] z-[70] opacity-80" />
        )}

        {/* Resize Handle */}
        {isOpen && (
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-[60] group transition-colors",
              isResizing ? "bg-blue-500/30" : "hover:bg-blue-500/10"
            )}
            onMouseDown={handleResizeMouseDown}
          >
            <div className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-12 bg-zinc-400 dark:bg-zinc-600 rounded-full transition-opacity",
              isResizing ? "opacity-100" : "group-hover:opacity-100 opacity-0"
            )} />
          </div>
        )}
      
      {/* Drawer Header */}
        <div className="h-16 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between px-5 shrink-0 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-1 bg-blue-400/30 rounded-xl blur-md -z-10"
              />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                AI Analyst
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold tracking-wider uppercase">Grounded Insights Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl" 
                onClick={() => setMessages([])} 
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl" 
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Unified Premium Information Console (Sub-Header Grid) */}
        {activeDataset && (
          <div className="bg-zinc-50/40 dark:bg-zinc-950/40 border-b border-zinc-200/50 dark:border-zinc-900/60 p-4 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                ACTIVE DATASET CONTEXT
              </span>
              <div className="flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                <ShieldCheck className="w-3 h-3 text-blue-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  GROUNDED
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2.5">
              {/* Card 1: Name */}
              <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 text-center space-y-0.5 min-w-0 transition-colors hover:border-blue-500/30 group">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block truncate group-hover:text-blue-500/70 transition-colors">SOURCE</span>
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-100 block truncate flex items-center justify-center gap-1">
                  {activeDataset.name}
                </span>
              </div>
              
              {/* Card 2: Rows */}
              <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 text-center space-y-0.5 transition-colors hover:border-blue-500/30 group">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block group-hover:text-blue-500/70 transition-colors">RECORDS</span>
                <span className="text-[11px] font-bold font-mono text-zinc-800 dark:text-zinc-100 block">
                  {(activeDataset.rowCount || activeDataset.fullData?.length || 0).toLocaleString()}
                </span>
              </div>
              
              {/* Card 3: Cols */}
              <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 text-center space-y-0.5 transition-colors hover:border-blue-500/30 group">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block group-hover:text-blue-500/70 transition-colors">COLUMNS</span>
                <span className="text-[11px] font-bold font-mono text-zinc-800 dark:text-zinc-100 block">
                  {activeDataset.headers?.length || 0}
                </span>
              </div>
              
              {/* Card 4: Health Score */}
              <div className={cn(
                "p-2.5 rounded-2xl border text-center space-y-0.5 transition-colors group",
                healthScore >= 90 ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:border-emerald-500/40" :
                healthScore >= 70 ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:border-amber-500/40" :
                "bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400 hover:border-rose-500/40"
              )}>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block group-hover:text-current transition-colors">INTEGRITY</span>
                <span className="text-[11px] font-bold font-mono block">
                  {healthScore}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
          {!hasDatasets ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 flex items-center justify-center text-zinc-400 mx-auto border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm">
                  <Bot className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold border-4 border-white dark:border-zinc-950 shadow-lg">
                  !
                </div>
              </div>
              <div className="space-y-2 max-w-xs">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Dataset Context Required</h4>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                  Initialize your analytics workspace by uploading a dataset. AI Analyst requires grounded data to generate deterministic insights.
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-between py-2 space-y-8">
              
              {/* Grounding manifesto card */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="bg-white/40 dark:bg-zinc-950/40 p-5 rounded-2xl text-[12px] text-zinc-800 dark:text-zinc-200 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm space-y-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">AI Analyst Online</p>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                    I have direct access to your loaded datasets. Ask questions about trends, correlations, or request specific visualizations for your dashboard.
                  </p>
                </div>
              </motion.div>

              {/* Suggestions Section */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1 block">
                  Quick Analysis Templates
                </span>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { text: TASK9_QUICK_QUESTIONS[0], icon: TrendingUp, color: 'blue' },
                    { text: TASK9_QUICK_QUESTIONS[2], icon: Activity, color: 'amber' },
                    { text: TASK9_QUICK_QUESTIONS[4], icon: LayoutDashboard, color: 'violet' }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.text)}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
                        e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
                      }}
                      className="text-left group relative p-4 rounded-2xl bg-white/50 dark:bg-[#0c0e16]/60 border border-zinc-200/50 dark:border-zinc-800/40 hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)] active:scale-[0.98] backdrop-blur-md interactive-glow interactive-glow-bg overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-3 z-10 relative">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-350",
                            item.color === 'blue' ? "bg-blue-500/10 text-blue-500 group-hover:bg-blue-600 group-hover:text-white" :
                            item.color === 'amber' ? "bg-amber-500/10 text-amber-500 group-hover:bg-amber-600 group-hover:text-white" :
                            "bg-violet-500/10 text-violet-500 group-hover:bg-violet-600 group-hover:text-white"
                          )}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="text-[12px] font-extrabold text-zinc-700 dark:text-zinc-200 truncate group-hover:translate-x-0.5 transition-transform">{item.text}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-350 group-hover:text-blue-500 transition-colors shrink-0 group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <AnimatePresence mode="popLayout">
                {messages.filter(m => !m.isSystem).map((msg) => {
                  const { plan, inlineChart, insightCard, remainingText } = msg.role === 'assistant' ? parseAssistantMessage(msg.text) : { plan: null, inlineChart: null, insightCard: null, remainingText: msg.text };
                  const ev = msg.evidence;
                  const isExpanded = expandedEvidenceIds[msg.id] !== false;

                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className={cn("flex flex-col w-full", msg.role === 'user' ? "items-end" : "items-start")}
                    >
                      {/* Message Label */}
                      <div className="flex items-center gap-2 mb-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest px-2">
                        {msg.role === 'user' ? (
                          <>
                            <span>Verified Inquiry</span>
                            <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                          </>
                        ) : (
                          <>
                            <Bot className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="text-zinc-600 dark:text-zinc-300">Grounded Analysis</span>
                          </>
                        )}
                      </div>

                      <div className={cn(
                        "rounded-2xl text-[13px] leading-relaxed transition-all duration-200 w-full",
                        msg.role === 'user' 
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4.5 py-2.5 rounded-tr-xs shadow-[0_4px_14px_rgba(37,99,235,0.15)] max-w-[85%] font-medium" 
                          : "bg-white/75 dark:bg-[#0c0e16]/65 text-zinc-800 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/40 p-5 rounded-tl-xs space-y-4 w-full backdrop-blur-md shadow-[0_8px_24px_-4px_rgba(0,0,0,0.02)] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.4)]"
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="flex flex-col gap-4">
                            {remainingText && (
                              <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                                <Markdown>{remainingText}</Markdown>
                              </div>
                            )}

                            {/* Evidence/Grounded Panel */}
                            {ev && !ev.note && (
                              ev.intent === 'NAVIGATION' ||
                              ev.intent === 'ACTION_KPI_CREATE' ||
                              ev.intent === 'MIS' ||
                              ev.intent === 'ACTION_PLAN' ||
                              ev.intent === 'ACTIONABLE_CLEANING' ||
                              ev.intent === 'DATA_QUALITY' ||
                              ev.intent === 'COLUMN' ||
                              (ev.rows && ev.rows.length > 0)
                            ) && (
                              <div className="border border-emerald-500/20 rounded-2xl overflow-hidden bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]">
                                <button
                                  onClick={() => toggleEvidence(msg.id)}
                                  className="w-full px-4 py-3 bg-emerald-500/5 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <span className="flex items-center gap-2 uppercase tracking-wider">
                                    {ev.intent === 'ACTIONABLE_CLEANING' ? (
                                      <>
                                        <Wrench className="w-4 h-4 text-blue-500" />
                                        Action Preview & Confirmation
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck className="w-4 h-4" />
                                        Computation Evidence Attached
                                      </>
                                    )}
                                  </span>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {isExpanded && (
                                  <div className="p-4 space-y-4 text-[11px] border-t border-emerald-500/10">
                                    {ev.intent === 'NAVIGATION' && ev.navigationTarget && (
                                      <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">Switch to {ev.navigationTarget.replace(/-/g, ' ')}</p>
                                            <p className="text-zinc-500 mt-1">I can immediately navigate your workspace to the requested module.</p>
                                          </div>
                                          <div className="bg-violet-500/10 text-violet-600 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-violet-500/20">
                                            Navigation
                                          </div>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          className="w-full h-9 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-500/20"
                                          onClick={() => handleNavigate(ev.navigationTarget!)}
                                        >
                                          <ArrowRight className="w-3.5 h-3.5 mr-2" />
                                          Go to {ev.navigationTarget.replace(/-/g, ' ')}
                                        </Button>
                                      </div>
                                    )}

                                    {ev.intent === 'ACTION_KPI_CREATE' && ev.kpiCreation && (
                                      <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">Create New KPI: {ev.kpiCreation.name}</p>
                                            <p className="text-zinc-500 mt-1">Add this calculation to your global KPI library.</p>
                                          </div>
                                          <div className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-amber-500/20">
                                            KPI Action
                                          </div>
                                        </div>
                                        <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 space-y-2">
                                          <div className="flex justify-between text-[10px]">
                                            <span className="text-zinc-400 uppercase font-bold">Column</span>
                                            <span className="text-zinc-900 dark:text-zinc-100 font-bold">{ev.kpiCreation.column}</span>
                                          </div>
                                          <div className="flex justify-between text-[10px]">
                                            <span className="text-zinc-400 uppercase font-bold">Aggregation</span>
                                            <span className="text-zinc-900 dark:text-zinc-100 font-bold">{ev.kpiCreation.aggregation.toUpperCase()}</span>
                                          </div>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20"
                                          onClick={() => handleCreateKpi(ev)}
                                        >
                                          <PlusCircle className="w-3.5 h-3.5 mr-2" />
                                          Create and Save KPI
                                        </Button>
                                      </div>
                                    )}

                                    {ev.intent === 'MIS' && ev.misDetails && (
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">MIS Report State</p>
                                          <div className="bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-indigo-500/20">
                                            Reporting
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="bg-white/40 dark:bg-zinc-900/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                                            <p className="text-[8px] text-zinc-400 uppercase font-bold">Total Reports</p>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{ev.misDetails.totalReports}</p>
                                          </div>
                                          <div className="bg-white/40 dark:bg-zinc-900/40 p-2 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                                            <p className="text-[8px] text-zinc-400 uppercase font-bold">Last Generated</p>
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{ev.misDetails.lastGenerated || 'Never'}</p>
                                          </div>
                                        </div>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="w-full text-[10px] h-8 rounded-lg"
                                          onClick={() => handleNavigate('mis-report')}
                                        >
                                          Open Reporting View
                                        </Button>
                                      </div>
                                    )}

                                    {ev.intent === 'ACTION_PLAN' && ev.actionPlan && (
                                      <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{ev.actionPlan.title}</p>
                                            <p className="text-zinc-500 mt-1">Proposed deterministic workflow with {ev.actionPlan.steps.length} steps.</p>
                                          </div>
                                          <div className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-blue-500/20">
                                            Orchestrator
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-2 border-l-2 border-zinc-200 dark:border-zinc-800 ml-2 pl-4 py-1">
                                          {ev.actionPlan.steps.map((step, idx) => {
                                            const isActive = executingPlan?.plan.title === ev.actionPlan?.title && executingPlan?.currentStep === idx;
                                            const isDone = executingPlan?.plan.title === ev.actionPlan?.title && executingPlan?.currentStep > idx;
                                            const isPending = !executingPlan || executingPlan.currentStep < idx;

                                            return (
                                              <div key={idx} className="flex items-center gap-3">
                                                <div className={cn(
                                                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                                                  isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                                                  isActive ? "bg-blue-600 border-blue-600 text-white animate-pulse" :
                                                  "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                                                )}>
                                                  {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                                                </div>
                                                <span className={cn(
                                                  "text-xs font-medium",
                                                  isDone ? "text-emerald-600 dark:text-emerald-400" :
                                                  isActive ? "text-blue-600 dark:text-blue-400 font-bold" :
                                                  "text-zinc-500"
                                                )}>
                                                  {step.label}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {!executingPlan || executingPlan.status === 'idle' ? (
                                          <Button 
                                            size="sm" 
                                            className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20"
                                            onClick={() => handleExecuteActionPlan(ev)}
                                          >
                                            <Play className="w-3.5 h-3.5 mr-2" />
                                            Execute Action Plan
                                          </Button>
                                        ) : executingPlan.status === 'running' ? (
                                          <div className="flex items-center justify-center gap-2 p-2 bg-blue-500/10 rounded-xl text-blue-600 font-bold text-xs">
                                            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            Executing Workflow...
                                          </div>
                                        ) : executingPlan.status === 'completed' ? (
                                          <div className="flex items-center justify-center gap-2 p-2 bg-emerald-500/10 rounded-xl text-emerald-600 font-bold text-xs">
                                            <Check className="w-4 h-4" />
                                            Plan Successfully Completed
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-center gap-2 p-2 bg-rose-500/10 rounded-xl text-rose-600 font-bold text-xs">
                                            <AlertTriangle className="w-4 h-4" />
                                            Plan Failed
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {ev.intent === 'ACTIONABLE_CLEANING' && ev.cleaningAction ? (
                                      <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{ev.cleaningAction.description}</p>
                                            <p className="text-zinc-500 mt-1">This operation will modify <strong>{ev.cleaningAction.affectedRowCount.toLocaleString()}</strong> records in <strong>{ev.datasetName}</strong>.</p>
                                          </div>
                                          <div className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border border-blue-500/20">
                                            Preview
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1.5">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Before</p>
                                            <div className="bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 space-y-1">
                                              {ev.cleaningAction.sampleBefore.map((s, i) => (
                                                <div key={i} className="truncate font-mono text-[10px] text-zinc-500">{s || '(null)'}</div>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="space-y-1.5">
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">After</p>
                                            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 space-y-1">
                                              {ev.cleaningAction.sampleAfter.map((s, i) => (
                                                <div key={i} className="truncate font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{s || '(null)'}</div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-2">
                                          <Button 
                                            size="sm" 
                                            className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20"
                                            onClick={() => handleApplyCleaning(ev)}
                                          >
                                            <Check className="w-3.5 h-3.5 mr-2" />
                                            Confirm and Apply
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-9 px-4 rounded-xl text-xs border-zinc-200 dark:border-zinc-800"
                                            onClick={() => toggleEvidence(msg.id)}
                                          >
                                            Dismiss
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-start justify-between gap-2">
                                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{ev.title}</p>
                                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-widest">
                                            Calculated
                                          </span>
                                        </div>
                                        
                                        {ev.rows && ev.rows.length > 0 && (
                                          <div className="overflow-x-auto custom-scrollbar border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl bg-white/40 dark:bg-black/20 backdrop-blur-sm">
                                            <table className="w-full text-left text-[10px] font-mono">
                                              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/50 dark:border-zinc-800/50">
                                                <tr>
                                                  {Object.keys(ev.rows[0]).map((h, i) => (
                                                    <th key={i} className="px-3 py-2">{h}</th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                                {ev.rows.map((row, idx) => (
                                                  <tr key={idx} className="hover:bg-blue-500/5 transition-colors">
                                                    {Object.values(row).map((val: any, vIdx) => (
                                                      <td key={vIdx} className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                                                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                                      </td>
                                                    ))}
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            {(ev?.recommendedWidget || (inlineChart && ev && !ev.note)) && (
                              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/5 to-violet-600/5 dark:from-blue-600/10 dark:to-violet-600/10 border border-blue-500/20 flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Smart Visual</span>
                                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Add this tailored insight to your active dashboard.</p>
                                </div>
                                <Button
                                  size="sm"
                                  className="h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 shrink-0"
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
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap font-bold leading-relaxed">{remainingText}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isLoading && (
                <div className="w-full max-w-[85%] self-start bg-white/40 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-6 space-y-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative h-6 w-6">
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      AI Analyst Analyzing Data...
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="h-full w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold font-mono text-blue-500/60 uppercase">
                      <span>Querying Schema</span>
                      <span>Calculating Metrics</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-5 rounded-2xl text-xs space-y-3 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <p className="font-extrabold text-[10px] uppercase tracking-wider text-red-800 dark:text-red-400">Connection Error</p>
                  </div>
                  <p className="font-medium leading-relaxed">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMsg) {
                        handleSend(lastUserMsg.text, lastUserMsg.isSystem, messages.filter(m => m.id !== lastUserMsg.id));
                      }
                    }}
                    className="h-8 text-[11px] font-bold border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400 w-full rounded-xl"
                  >
                    Retry Last Query
                  </Button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        {hasDatasets && (
          <div className="p-4 bg-zinc-50/40 dark:bg-[#0c0c0e]/30 border-t border-zinc-200/50 dark:border-zinc-900/60 backdrop-blur-sm">
            <div className="relative group">
              {/* Focus Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-[22px] opacity-0 group-focus-within:opacity-20 blur-md transition-opacity duration-500" />
              
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                className="relative flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/60 rounded-[20px] overflow-hidden focus-within:border-blue-500/50 transition-all duration-300 shadow-sm"
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder="Ask a question about your data..."
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(input);
                    }
                  }}
                  disabled={isLoading}
                  className="w-full bg-transparent border-none outline-none px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none min-h-[46px] max-h-[120px] transition-all font-medium leading-relaxed"
                />
                
                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Grounding Engine Active</span>
                  </div>
                  
                  <Button 
                    type="submit" 
                    size="icon" 
                    className={cn(
                      "h-8 px-4 w-auto rounded-xl transition-all duration-300 gap-2",
                      input.trim() && !isLoading 
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    )}
                    disabled={!input.trim() || isLoading}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider">Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </form>
            </div>
            <p className="text-[10px] text-center text-zinc-400 dark:text-zinc-500 mt-3 font-medium">
              Deterministic Analytics Copilot • v2.4.1
            </p>
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
