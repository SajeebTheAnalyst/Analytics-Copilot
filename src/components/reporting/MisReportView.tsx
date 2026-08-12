import React, { useState, useEffect, useMemo } from 'react';
import { Dataset, Dashboard, KpiDefinition, ColumnFilter } from '@/types';
import { getSavedKpis, seedInitialKpisForDataset } from '@/lib/kpiStorage';
import { generateMisReportData, MisExecutiveReportData } from '@/lib/misEngine';
import { getSavedMisReports, saveMisReport, deleteMisReport, MisReportConfig } from '@/lib/misReportStorage';
import { 
  FileText, Printer, Download, RefreshCw, Sparkles, Filter, Check, X, 
  Layers, ShieldCheck, TrendingUp, TrendingDown, AlertCircle, Calendar, 
  Building, User, History, Plus, Trash2, Copy, BarChart3, Bot, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import Markdown from 'react-markdown';

interface MisReportViewProps {
  datasets: Dataset[];
  dashboards: Dashboard[];
}

export function MisReportView({ datasets, dashboards }: MisReportViewProps) {
  // Active Selections & Config
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedDashboardId, setSelectedDashboardId] = useState<string>('none');
  const [topN, setTopN] = useState<number>(10);
  const [dateColumnOverride, setDateColumnOverride] = useState<string>('');

  // Report Branding Metadata
  const [reportTitle, setReportTitle] = useState<string>('MIS Executive Management Report');
  const [reportSubtitle, setReportSubtitle] = useState<string>('Management summary generated from active analytical data.');
  const [preparedBy, setPreparedBy] = useState<string>('Executive MIS Analyst');
  const [organization, setOrganization] = useState<string>('Corporate Management');

  // Filters & Saved State
  const [reportFilters, setReportFilters] = useState<ColumnFilter[]>([]);
  const [savedKpis, setSavedKpis] = useState<KpiDefinition[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<MisReportConfig[]>([]);

  // UI States
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Initial Load & Dataset Fallback
  useEffect(() => {
    if (datasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  // Load Saved KPIs & Saved MIS Configurations
  useEffect(() => {
    async function loadInitialData() {
      if (datasets.length > 0) {
        const primary = datasets.find(d => d.id === selectedDatasetId) || datasets[0];
        const kpis = await seedInitialKpisForDataset(primary);
        setSavedKpis(kpis);
      }
      const configs = await getSavedMisReports();
      setSavedConfigs(configs);
    }
    loadInitialData();
  }, [selectedDatasetId, datasets]);

  // Active Dataset reference
  const primaryDataset = useMemo(() => {
    return datasets.find(d => d.id === selectedDatasetId) || datasets[0] || null;
  }, [datasets, selectedDatasetId]);

  // Handle Dashboard Import ("Generate Report from Dashboard")
  const handleSelectDashboard = (dashId: string) => {
    setSelectedDashboardId(dashId);
    if (dashId !== 'none') {
      const targetDash = dashboards.find(d => d.id === dashId);
      if (targetDash) {
        if (targetDash.datasetId) {
          setSelectedDatasetId(targetDash.datasetId);
        }
        const normalizedFilters: ColumnFilter[] = (targetDash.filters || []).map(f => ({
          id: f.id,
          column: f.column,
          operator: f.operator || 'equals',
          value: String(f.value ?? '')
        }));
        setReportFilters(normalizedFilters);
        setReportTitle(`MIS Executive Report — ${targetDash.title}`);
      }
    }
  };

  // Generate Real Report Calculations
  const reportData: MisExecutiveReportData | null = useMemo(() => {
    if (!primaryDataset) return null;
    return generateMisReportData(
      primaryDataset,
      datasets,
      savedKpis,
      reportFilters,
      topN,
      dateColumnOverride || undefined
    );
  }, [primaryDataset, datasets, savedKpis, reportFilters, topN, dateColumnOverride]);

  // Handle Save Toast feedback
  const triggerSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Persist Current Snapshot to IndexedDB
  const handleSaveSnapshot = async () => {
    if (!primaryDataset) return;
    const config: MisReportConfig = {
      id: `mis-${Date.now()}`,
      title: reportTitle,
      subtitle: reportSubtitle,
      preparedBy,
      organization,
      datasetId: primaryDataset.id,
      dashboardId: selectedDashboardId !== 'none' ? selectedDashboardId : undefined,
      filters: reportFilters,
      topN,
      dateColumn: dateColumnOverride || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updated = await saveMisReport(config);
    setSavedConfigs(updated);
    triggerSaveToast();
  };

  // Load Saved Snapshot Configuration
  const handleLoadSnapshot = (config: MisReportConfig) => {
    setReportTitle(config.title);
    setReportSubtitle(config.subtitle);
    if (config.preparedBy) setPreparedBy(config.preparedBy);
    if (config.organization) setOrganization(config.organization);
    setSelectedDatasetId(config.datasetId);
    if (config.dashboardId) setSelectedDashboardId(config.dashboardId);
    setReportFilters(config.filters || []);
    setTopN(config.topN || 10);
    if (config.dateColumn) setDateColumnOverride(config.dateColumn);
    setIsHistoryOpen(false);
    triggerSaveToast();
  };

  // Delete Saved Snapshot
  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await deleteMisReport(id);
    setSavedConfigs(updated);
  };

  // Filter Handler
  const handleGlobalFilterChange = (column: string, value: string | null) => {
    if (value === null || value === 'all' || value === '') {
      setReportFilters(prev => prev.filter(f => f.column !== column));
    } else {
      setReportFilters(prev => {
        const existingIdx = prev.findIndex(f => f.column === column);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], value };
          return updated;
        } else {
          return [...prev, { id: `rf-${Date.now()}`, column, operator: 'equals', value }];
        }
      });
    }
  };

  // Clear All Report Filters
  const handleClearFilters = () => {
    setReportFilters([]);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Generate AI Executive Summary via /api/chat
  const handleGenerateAiSummary = async () => {
    if (!reportData) return;
    setIsAiLoading(true);
    setAiSummaryError(null);

    // Build structured context payload (WITHOUT raw dataset rows)
    const contextPayload = {
      reportTitle,
      datasetName: reportData.datasetName,
      totalDatasetRows: reportData.datasetRowCount,
      filteredRowsEvaluated: reportData.filteredRowCount,
      reportFilters: reportData.activeFilterSummaryText,
      executiveKpis: {
        totalRevenue: reportData.executiveKpis.totalRevenue.formatted,
        totalProfit: reportData.executiveKpis.totalProfit.formatted,
        totalOrders: reportData.executiveKpis.totalOrders.formatted,
        uniqueCustomers: reportData.executiveKpis.uniqueCustomers.formatted,
        profitMargin: reportData.executiveKpis.profitMargin.formatted,
        avgOrderValue: reportData.executiveKpis.avgOrderValue.formatted
      },
      topCategoriesByRevenue: reportData.rankings.topProductsByRevenue.slice(0, 5).map(p => ({
        name: p.name,
        revenue: p.formattedPrimary,
        profit: p.formattedSecondary
      })),
      topRegionsByRevenue: reportData.rankings.topRegionsByRevenue.slice(0, 5).map(r => ({
        name: r.name,
        revenue: r.formattedPrimary
      })),
      trendSummary: reportData.trendAnalysis.hasDateField ? {
        periodsTracked: reportData.trendAnalysis.trendData.length,
        latestPeriod: reportData.trendAnalysis.trendData[reportData.trendAnalysis.trendData.length - 1]?.period,
        latestRevenue: reportData.trendAnalysis.trendData[reportData.trendAnalysis.trendData.length - 1]?.formattedRevenue
      } : 'No date dimension',
      varianceSummary: reportData.varianceAnalysis.hasVarianceData ? reportData.varianceAnalysis.items.map(v => ({
        metric: v.metricName,
        current: v.formattedCurrent,
        previous: v.formattedPrevious,
        variancePercent: v.formattedPercent
      })) : 'Single period',
      dataQuality: {
        healthScore: `${reportData.dataQuality.healthScore}%`,
        missingCells: reportData.dataQuality.missingValuesCount,
        cleaningOperationsApplied: reportData.dataQuality.cleaningLogsCount
      },
      calculatedInsights: reportData.managementInsights
    };

    const userPrompt = `Please generate a formal, high-level C-Suite Executive Summary for the MIS Report "${reportTitle}".
Format your response using structured markdown with the following four numbered sections:

1. **Executive Summary**: A concise executive narrative synthesizing operational performance and dataset health.
2. **Key Findings & Drivers**: 3-4 bullet points analyzing primary revenue drivers, margins, and top regional/category benchmarks based strictly on calculated metrics.
3. **Risks & Attention Areas**: Operational or data quality vulnerabilities requiring leadership oversight.
4. **Strategic Management Recommendations**: 3 concrete, actionable next steps for the leadership team.

Analytical Context:
${JSON.stringify(contextPayload, null, 2)}`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userPrompt,
          metadata: { misReport: contextPayload },
          history: []
        })
      });

      if (!response.ok) {
        throw new Error('AI Engine service responded with an error');
      }

      const data = await response.json();
      if (data.text) {
        setAiSummaryText(data.text);
      } else {
        throw new Error('Received empty response from AI service');
      }
    } catch (err: any) {
      console.warn('API call failed, generating deterministic executive summary:', err);
      // Fallback structured briefing
      const fallback = `### 1. Executive Summary
The **${reportTitle}** evaluates **${reportData.datasetName}** comprising **${reportData.filteredRowCount.toLocaleString()}** analyzed record transactions. Primary revenue reached **${reportData.executiveKpis.totalRevenue.formatted}** with an overall profit margin of **${reportData.executiveKpis.profitMargin.formatted}**. Dataset health stands at **${reportData.dataQuality.healthScore}%**.

### 2. Key Findings & Drivers
${reportData.managementInsights.map(i => `- ${i}`).join('\n')}

### 3. Risks & Attention Areas
- **Data Completeness**: Dataset contains **${reportData.dataQuality.missingValuesCount.toLocaleString()}** null/missing cell values requiring ongoing profiling.
- **Concentration Risk**: The top performing category represents a significant share of gross revenue.

### 4. Strategic Management Recommendations
1. **Capitalize on Regional Leaders**: Expand distribution in top-performing sales regions.
2. **Optimize Low Margin Product Lines**: Review cost structures for bottom-tier profit margin categories.
3. **Automate Weekly MIS Snapshots**: Archive weekly report snapshots to track period-over-period variance trends.`;

      setAiSummaryText(fallback);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Filterable Categorical Columns for Filter Bar
  const categoricalCols = primaryDataset ? Object.entries(primaryDataset.columnProfiles || {})
    .filter(([_, prof]) => prof.type === 'categorical' || prof.type === 'boolean' || prof.type === 'date' || prof.uniqueCount <= 30)
    .map(([col]) => col) : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      
      {/* CONTROL & ACTION HEADER (Hidden during Print) */}
      <div className="no-print glass-panel border-b-0 p-4 sm:p-6 shrink-0 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  MIS Executive Report
                  {saveToast && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-fade-in">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500">Management summary generated from the active dataset.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigExpanded(!isConfigExpanded)}
              className="text-xs text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
            >
              <Layers className="w-3.5 h-3.5 mr-1 text-zinc-500" />
              {isConfigExpanded ? 'Hide Controls' : 'Report Settings'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="text-xs text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
            >
              <History className="w-3.5 h-3.5 mr-1 text-blue-600" />
              History ({savedConfigs.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSnapshot}
              className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Save Snapshot
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-zinc-600" />
              Print / PDF
            </Button>

            <Button
              size="sm"
              onClick={handleGenerateAiSummary}
              disabled={isAiLoading || !reportData}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5"
            >
              {isAiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Ask AI Executive Briefing</span>
            </Button>

          </div>

        </div>

        {/* EXPANDABLE CONFIGURATION AREA (COMPACT) */}
        {isConfigExpanded && (
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-zinc-50/50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
            
            {/* Dataset Selector */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Target Dataset:</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.rowCount.toLocaleString()} rows)</option>
                ))}
              </select>
            </div>

            {/* Dashboard Selector */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Import Dashboard Context:</label>
              <select
                value={selectedDashboardId}
                onChange={(e) => handleSelectDashboard(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="none">None (Standard Dataset Mode)</option>
                {dashboards.map(d => (
                  <option key={d.id} value={d.id}>Dashboard: {d.title}</option>
                ))}
              </select>
            </div>

            {/* Top N limit */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Top/Bottom N Limit:</label>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>Top 5 / Bottom 5</option>
                <option value={10}>Top 10 / Bottom 10</option>
                <option value={20}>Top 20 / Bottom 20</option>
              </select>
            </div>

            {/* Custom Report Title */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Custom Report Header Title:</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Custom Subtitle */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Custom Subtitle:</label>
              <input
                type="text"
                value={reportSubtitle}
                onChange={(e) => setReportSubtitle(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Organization */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Organization Name:</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Prepared By */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Prepared By:</label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Date Column Override */}
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Date Column Target:</label>
              <select
                value={dateColumnOverride}
                onChange={(e) => setDateColumnOverride(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Auto Detect Date Column</option>
                {primaryDataset?.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

          </div>
        )}

      </div>

      {/* REPORT FILTERS BAR (Distinct from Dashboard & Explorer) */}
      {primaryDataset && (
        <div className="no-print glass-panel border-t-0 border-r-0 border-l-0 px-6 py-2.5 flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            Report Filters:
          </span>

          {categoricalCols.length === 0 ? (
            <span className="text-xs text-zinc-400 italic">No filterable columns in dataset.</span>
          ) : (
            categoricalCols.slice(0, 5).map(col => {
              const sourceRows = primaryDataset.fullData || primaryDataset.data || [];
              const uniqueVals = Array.from(new Set(sourceRows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== ''))).slice(0, 40);
              const activeFilter = reportFilters.find(f => f.column === col);

              return (
                <div key={col} className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{col}:</label>
                  <select
                    value={activeFilter?.value ?? 'all'}
                    onChange={(e) => handleGlobalFilterChange(col, e.target.value)}
                    className={cn(
                      "text-xs border rounded-md px-2 py-0.5 font-medium transition-all focus:outline-none focus:ring-1 focus:ring-blue-500",
                      activeFilter 
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300" 
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    <option value="all">All</option>
                    {uniqueVals.map(val => (
                      <option key={String(val)} value={String(val)}>{String(val)}</option>
                    ))}
                  </select>
                </div>
              );
            })
          )}

          {reportFilters.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {reportFilters.length} Active Filter{reportFilters.length > 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {/* REPORT SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
        {!reportData ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 max-w-lg mx-auto my-12">
            <FileText className="w-10 h-10 text-zinc-400 mb-3" />
            <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">No Dataset Selected</h3>
            <p className="text-xs text-zinc-500 mt-1">Please import or select a dataset to assemble an MIS Executive Report.</p>
          </div>
        ) : (

          /* FORMAL CORPORATE DOCUMENT PAPER CANVAS */
          <div className="printable-report max-w-5xl mx-auto glass-panel glass-card p-8 sm:p-12 shadow-xl text-zinc-900 dark:text-zinc-100 space-y-10 mb-12">
            
            {/* CORPORATE REPORT HEADER & METADATA BANNER */}
            <div className="border-b-2 border-zinc-900 dark:border-zinc-100 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2.5 py-0.5 rounded">
                    {organization} • MIS Executive Report
                  </span>
                  {selectedDashboardId !== 'none' && (
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                      Dashboard Imported
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 text-zinc-900 dark:text-zinc-100">
                  {reportTitle}
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{reportSubtitle}</p>
              </div>

              {/* Header Details Table */}
              <div className="text-xs space-y-1 font-mono text-zinc-600 dark:text-zinc-400 md:text-right shrink-0 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
                <div><strong className="text-zinc-900 dark:text-zinc-200">Dataset:</strong> {reportData.datasetName}</div>
                <div><strong className="text-zinc-900 dark:text-zinc-200">Records Evaluated:</strong> {reportData.filteredRowCount.toLocaleString()} / {reportData.datasetRowCount.toLocaleString()}</div>
                <div><strong className="text-zinc-900 dark:text-zinc-200">Generated:</strong> {reportData.reportDate}</div>
                <div><strong className="text-zinc-900 dark:text-zinc-200">Prepared By:</strong> {preparedBy}</div>
                <div><strong className="text-zinc-900 dark:text-zinc-200">Health Score:</strong> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{reportData.dataQuality.healthScore}%</span></div>
              </div>
            </div>

            {/* REPORT FILTERS BANNER (If Active) */}
            {reportData.activeFilterSummaryText.length > 0 && (
              <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 rounded-lg flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>Active Report Filters:</strong> {reportData.activeFilterSummaryText.join(' | ')}</span>
                </div>
                <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-semibold">
                  {reportData.filteredRowCount.toLocaleString()} rows selected
                </span>
              </div>
            )}

            {/* SECTION 1: EXECUTIVE SUMMARY KPI GRID */}
            <div className="report-section space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  1. Executive Summary & Key Performance Indicators
                </h2>
                <span className="text-[11px] text-zinc-400 font-mono">Central KPI Engine Output</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.values(reportData.executiveKpis).map((kpi, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 truncate">{kpi.label}</span>
                    <div>
                      <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate">{kpi.formatted}</p>
                      {kpi.warning ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5">{kpi.warning}</p>
                      ) : (
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: SAVED KPI PERFORMANCE TABLE */}
            <div className="report-section space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  2. KPI Performance & Audit Verification Table
                </h2>
                <span className="text-[11px] text-zinc-400 font-mono">{reportData.kpiPerformanceTable.length} Defined KPIs</span>
              </div>

              {reportData.kpiPerformanceTable.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-4 border border-dashed rounded-lg text-center">
                  No saved KPI definitions found for this dataset. Use the Centralized KPI Builder to register custom metric formulas.
                </p>
              ) : (
                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[10px] tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="p-3">KPI Name</th>
                        <th className="p-3">Current Value</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Rows Evaluated</th>
                        <th className="p-3">Formula Summary</th>
                        <th className="p-3">Audit / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono">
                      {reportData.kpiPerformanceTable.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                          <td className="p-3 font-semibold font-sans text-zinc-900 dark:text-zinc-100">{item.name}</td>
                          <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{item.formattedResult}</td>
                          <td className="p-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans",
                              item.status === 'active' ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" :
                              item.status === 'needs_attention' ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400" :
                              "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                            )}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right text-zinc-600 dark:text-zinc-400">{item.rowCountEvaluated.toLocaleString()}</td>
                          <td className="p-3 text-zinc-500 font-sans text-[11px]">{item.formulaSummary}</td>
                          <td className="p-3 text-zinc-500 font-sans text-[11px]">
                            {item.warning ? <span className="text-amber-600 dark:text-amber-400">{item.warning}</span> : <span className="text-emerald-600 dark:text-emerald-400">Verified</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 3: PERFORMANCE ANALYSIS OVERVIEW */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  3. Performance Overview Analysis
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Revenue Overview */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Revenue Performance</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Total Revenue:</span>
                      <strong className="text-base text-zinc-900 dark:text-zinc-100">{reportData.performanceOverview.revenue.formattedTotal}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Average Sales / Row:</span>
                      <strong className="text-sm text-zinc-900 dark:text-zinc-100">{reportData.performanceOverview.revenue.formattedAvg}</strong>
                    </div>
                  </div>
                  {reportData.performanceOverview.revenue.topCategory && (
                    <div className="text-xs pt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                      <strong>Leading Category:</strong> {reportData.performanceOverview.revenue.topCategory.name} ({reportData.performanceOverview.revenue.topCategory.sharePercent.toFixed(1)}% of sales)
                    </div>
                  )}
                </div>

                {/* Profit Overview */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Profit & Margin Performance</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Gross Profit:</span>
                      <strong className="text-base text-zinc-900 dark:text-zinc-100">{reportData.performanceOverview.profit.formattedTotal}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Net Profit Margin:</span>
                      <strong className="text-base text-emerald-600 dark:text-emerald-400">{reportData.performanceOverview.profit.marginPercent.toFixed(1)}%</strong>
                    </div>
                  </div>
                  <div className="text-xs pt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                    <strong>Profit Efficiency:</strong> Average profit per transaction is {reportData.performanceOverview.profit.formattedAvg}.
                  </div>
                </div>

                {/* Order Overview */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Order Volume & Transactions</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Total Order Volume:</span>
                      <strong className="text-base text-zinc-900 dark:text-zinc-100">{reportData.performanceOverview.orders.totalOrders.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Avg Line Items / Order:</span>
                      <strong className="text-base text-zinc-900 dark:text-zinc-100">{reportData.performanceOverview.orders.avgItemsPerOrder.toFixed(1)}</strong>
                    </div>
                  </div>
                </div>

                {/* Customer Overview */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Customer Base Metrics</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Unique Customer Entities:</span>
                      <strong className="text-base text-zinc-900 dark:text-zinc-100">{reportData.performanceOverview.customers.distinctCount.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-sans">Avg Spend / Customer:</span>
                      <strong className="text-base text-zinc-900 dark:text-zinc-100">${reportData.performanceOverview.customers.avgSpendPerCustomer.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: TOP / BOTTOM RANKINGS */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  4. Top & Bottom Management Ranking Tables
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Top Products by Revenue */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Top {topN} Products by Revenue
                  </h3>
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-100 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500 border-b">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {reportData.rankings.topProductsByRevenue.map(item => (
                          <tr key={item.rank} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                            <td className="p-2 text-center font-bold text-zinc-400">{item.rank}</td>
                            <td className="p-2 font-sans font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">{item.name}</td>
                            <td className="p-2 text-right font-bold text-zinc-900 dark:text-zinc-100">{item.formattedPrimary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Regions by Revenue */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Top {topN} Regions by Revenue
                  </h3>
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-100 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500 border-b">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">Region</th>
                          <th className="p-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {reportData.rankings.topRegionsByRevenue.map(item => (
                          <tr key={item.rank} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                            <td className="p-2 text-center font-bold text-zinc-400">{item.rank}</td>
                            <td className="p-2 font-sans font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">{item.name}</td>
                            <td className="p-2 text-right font-bold text-zinc-900 dark:text-zinc-100">{item.formattedPrimary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Products by Profit */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Top {topN} Products by Profit
                  </h3>
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-100 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500 border-b">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {reportData.rankings.topProductsByProfit.map(item => (
                          <tr key={item.rank} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                            <td className="p-2 text-center font-bold text-zinc-400">{item.rank}</td>
                            <td className="p-2 font-sans font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">{item.name}</td>
                            <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{item.formattedPrimary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Products by Profit */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Bottom {topN} Products by Profit
                  </h3>
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-100 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500 border-b">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {reportData.rankings.bottomProductsByProfit.map(item => (
                          <tr key={item.rank} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                            <td className="p-2 text-center font-bold text-zinc-400">{item.rank}</td>
                            <td className="p-2 font-sans font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">{item.name}</td>
                            <td className="p-2 text-right font-bold text-amber-600 dark:text-amber-400">{item.formattedPrimary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 5: TREND ANALYSIS */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  5. Time-Series Trend Analysis
                </h2>
                {reportData.trendAnalysis.hasDateField && (
                  <span className="text-[11px] font-mono text-zinc-400">Date Column: {reportData.trendAnalysis.dateColumnName}</span>
                )}
              </div>

              {!reportData.trendAnalysis.hasDateField ? (
                <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 text-center text-xs text-zinc-500 italic space-y-1">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">Trend analysis unavailable because no valid date field is available.</p>
                  <p className="text-[11px]">To enable time-based trends, select or upload a dataset containing a valid date or timestamp column.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Recharts Area Chart */}
                  <div className="h-64 w-full bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.trendAnalysis.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                        <XAxis dataKey="period" stroke="#888888" fontSize={11} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                          formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                        />
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
                        <Area type="monotone" dataKey="profit" name="Profit" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Monthly Trend Table */}
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-100 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500 border-b">
                        <tr>
                          <th className="p-2.5">Period</th>
                          <th className="p-2.5 text-right">Revenue</th>
                          <th className="p-2.5 text-right">Profit</th>
                          <th className="p-2.5 text-right">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {reportData.trendAnalysis.trendData.map(item => (
                          <tr key={item.period} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                            <td className="p-2.5 font-bold font-sans text-zinc-900 dark:text-zinc-100">{item.period}</td>
                            <td className="p-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">{item.formattedRevenue}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{item.formattedProfit}</td>
                            <td className="p-2.5 text-right text-zinc-500">{item.orders.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 6: VARIANCE / CHANGE ANALYSIS */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  6. Period-Over-Period Variance & Change Analysis
                </h2>
              </div>

              {!reportData.varianceAnalysis.hasVarianceData ? (
                <div className="p-4 border border-dashed rounded-lg text-xs text-zinc-500 italic text-center">
                  {reportData.varianceAnalysis.message || "Variance analysis requires at least 2 distinct date periods."}
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-100 dark:bg-zinc-900 text-[10px] uppercase text-zinc-500 border-b">
                      <tr>
                        <th className="p-3 font-sans">Metric</th>
                        <th className="p-3 text-center">Current Period</th>
                        <th className="p-3 text-center">Previous Period</th>
                        <th className="p-3 text-right">Current Value</th>
                        <th className="p-3 text-right">Previous Value</th>
                        <th className="p-3 text-right">Variance</th>
                        <th className="p-3 text-right">Variance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {reportData.varianceAnalysis.items.map(item => (
                        <tr key={item.metricName} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                          <td className="p-3 font-semibold font-sans text-zinc-900 dark:text-zinc-100">{item.metricName}</td>
                          <td className="p-3 text-center text-zinc-600 dark:text-zinc-400">{reportData.varianceAnalysis.currentPeriodLabel}</td>
                          <td className="p-3 text-center text-zinc-600 dark:text-zinc-400">{reportData.varianceAnalysis.previousPeriodLabel}</td>
                          <td className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100">{item.formattedCurrent}</td>
                          <td className="p-3 text-right text-zinc-500">{item.formattedPrevious}</td>
                          <td className={cn("p-3 text-right font-bold", item.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                            {item.formattedVariance}
                          </td>
                          <td className="p-3 text-right">
                            <span className={cn(
                              "px-2 py-0.5 rounded font-bold text-[10px]",
                              item.isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                            )}>
                              {item.formattedPercent}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 7: DATA QUALITY & GOVERNANCE */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  7. Data Quality & Integrity Governance Audit
                </h2>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  Health Score: {reportData.dataQuality.healthScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-sans block">Total Dataset Rows:</span>
                  <strong className="text-sm text-zinc-900 dark:text-zinc-100">{reportData.dataQuality.totalRows.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-sans block">Missing Value Cells:</span>
                  <strong className="text-sm text-amber-600 dark:text-amber-400">{reportData.dataQuality.missingValuesCount.toLocaleString()} ({reportData.dataQuality.missingValuesPercent.toFixed(1)}%)</strong>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-sans block">Duplicate Row Flags:</span>
                  <strong className="text-sm text-zinc-900 dark:text-zinc-100">{reportData.dataQuality.duplicateRowsCount.toLocaleString()}</strong>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 font-sans block">Cleaning Operations Applied:</span>
                  <strong className="text-sm text-emerald-600 dark:text-emerald-400">{reportData.dataQuality.cleaningLogsCount}</strong>
                </div>
              </div>

              {/* Quality Disclaimer */}
              <div className="p-3 rounded-lg bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                {reportData.dataQuality.disclaimer}
              </div>
            </div>

            {/* SECTION 8: KEY MANAGEMENT INSIGHTS */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  8. Key Management Insights (Calculated Data Statements)
                </h2>
              </div>

              <div className="space-y-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                {reportData.managementInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 9: AI EXECUTIVE SUMMARY */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  9. AI Analyst Executive Briefing
                </h2>
                <span className="text-[10px] text-zinc-400 font-mono">Gemini AI Model Generation</span>
              </div>

              {isAiLoading ? (
                <div className="p-8 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">Generating AI Executive Commentary...</p>
                  <p className="text-[11px] text-zinc-400">Evaluating structured analytical metrics & variances</p>
                </div>
              ) : aiSummaryText ? (
                <div className="p-6 rounded-xl bg-blue-50/30 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 text-xs sm:text-sm space-y-4">
                  <div className="prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                    <Markdown>{aiSummaryText}</Markdown>
                  </div>
                  <p className="text-[10px] text-zinc-400 italic pt-2 border-t border-blue-200/40 dark:border-blue-900/40">
                    AI Analyst Executive Briefing generated from calculated metrics. Does not override source calculations.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center space-y-3 text-center">
                  <Bot className="w-8 h-8 text-blue-500" />
                  <div>
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Synthesize Executive Narrative with Gemini AI</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5 max-w-md">
                      Generate a formal C-Suite executive narrative, key drivers analysis, risks, and strategic recommendations based on the calculated report data.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleGenerateAiSummary}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate AI Executive Briefing
                  </Button>
                </div>
              )}
            </div>

            {/* SECTION 10: REPORT FOOTER & NOTES */}
            <div className="report-section pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 font-mono gap-2">
              <div>
                Report Title: {reportTitle} • Dataset: {reportData.datasetName}
              </div>
              <div>
                Confidential • Internal Corporate Management Information System (MIS)
              </div>
            </div>

          </div>
        )}
      </div>

      {/* REPORT HISTORY DRAWER / MODAL */}
      {isHistoryOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Saved MIS Report History ({savedConfigs.length})
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(false)} className="rounded-full h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {savedConfigs.length === 0 ? (
              <p className="text-xs text-zinc-500 p-6 text-center italic">No saved report snapshots yet. Click "Save Snapshot" to archive a report configuration.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {savedConfigs.map((cfg) => (
                  <div
                    key={cfg.id}
                    onClick={() => handleLoadSnapshot(cfg)}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600">{cfg.title}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {new Date(cfg.createdAt).toLocaleDateString()} • {cfg.filters?.length || 0} Filters • Dataset: {cfg.datasetId}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteSnapshot(cfg.id, e)}
                        className="h-6 w-6 text-zinc-400 hover:text-red-500"
                        title="Delete Snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
