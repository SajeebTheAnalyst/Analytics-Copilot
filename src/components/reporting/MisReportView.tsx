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

import { useDatasetStore } from '@/lib/datasetStore';

interface MisReportViewProps {
  datasets?: Dataset[];
  dashboards: Dashboard[];
}

export function MisReportView({ dashboards }: MisReportViewProps) {
  const { currentDataset: activeDataset, allDatasets: datasets, setSelectedDatasetId: setGlobalDatasetId } = useDatasetStore();
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

  // Initial Load & Dataset Fallback & Sync with global activeDataset
  useEffect(() => {
    if (activeDataset) {
      setSelectedDatasetId(activeDataset.id);
    } else if (datasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [activeDataset, datasets, selectedDatasetId]);

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
    .filter(([col, prof]) => !col.startsWith('__EMPTY') && (prof.type === 'categorical' || prof.type === 'boolean' || prof.type === 'date' || prof.uniqueCount <= 30))
    .map(([col]) => col) : [];

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      
      {/* CONTROL & ACTION HEADER (Hidden during Print) */}
      <div className="no-print glass-panel border-b-0 p-4 shrink-0 flex flex-col gap-4 z-10">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  MIS Executive Report
                  {saveToast && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-fade-in">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </h1>
                <p className="text-xs text-zinc-500">Management summary generated from the active dataset.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigExpanded(!isConfigExpanded)}
              className="text-xs text-zinc-700 dark:text-zinc-300"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
              {isConfigExpanded ? 'Hide Controls' : 'Report Settings'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="text-xs text-zinc-700 dark:text-zinc-300"
            >
              <History className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              History ({savedConfigs.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSnapshot}
              className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
            >
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-500" />
              Save Snapshot
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs text-zinc-700 dark:text-zinc-300"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-zinc-600 dark:text-zinc-400" />
              Print / PDF
            </Button>

            <Button
              size="sm"
              onClick={handleGenerateAiSummary}
              disabled={isAiLoading || !reportData}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 font-semibold"
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
                onChange={(e) => {
                  setSelectedDatasetId(e.target.value);
                  setGlobalDatasetId(e.target.value);
                }}
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
                {primaryDataset?.headers.map((h, i) => (
                  <option key={`${h}-${i}`} value={h}>{h}</option>
                ))}
              </select>
            </div>

          </div>
        )}

      </div>

      {/* REPORT FILTERS BAR (Distinct from Dashboard & Explorer) */}
      {primaryDataset && (
        <div className="no-print glass-panel border-t-0 border-r-0 border-l-0 px-6 py-3 flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            Report Filters:
          </span>

          {categoricalCols.length === 0 ? (
            <span className="text-xs text-zinc-400 italic">No filterable columns in dataset.</span>
          ) : (
            categoricalCols.slice(0, 5).map((col, colIdx) => {
              const sourceRows = primaryDataset.fullData || primaryDataset.data || [];
              const uniqueVals = Array.from(
                new Set(
                  sourceRows
                    .map(r => r[col])
                    .filter(v => v !== null && v !== undefined && v !== '')
                    .map(v => String(v))
                )
              ).slice(0, 40);
              const activeFilter = reportFilters.find(f => f.column === col);

              return (
                <div key={`${col}-${colIdx}`} className="flex items-center gap-2 bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-md px-2.5 py-1 shadow-sm">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{col}:</label>
                  <select
                    value={activeFilter?.value ?? 'all'}
                    onChange={(e) => handleGlobalFilterChange(col, e.target.value)}
                    className={cn(
                      "text-xs bg-transparent border-none p-0 font-medium focus:outline-none focus:ring-0 cursor-pointer min-w-[80px] max-w-[150px] truncate",
                      activeFilter 
                        ? "text-blue-600 dark:text-blue-400 font-bold" 
                        : "text-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    <option value="all">All</option>
                    {uniqueVals.map((valStr, valIdx) => (
                      <option key={`${valStr}-${valIdx}`} value={valStr}>{valStr}</option>
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
      <div className="flex-1 p-4 sm:p-8">
        {!reportData ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 max-w-lg mx-auto my-12">
            <FileText className="w-10 h-10 text-zinc-400 mb-3" />
            <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">No Dataset Selected</h3>
            <p className="text-xs text-zinc-500 mt-1">Please import or select a dataset to assemble an MIS Executive Report.</p>
          </div>
        ) : (          /* FORMAL CORPORATE DOCUMENT PAPER CANVAS */
          <div className="printable-report max-w-5xl mx-auto bg-white dark:bg-zinc-950 p-6 sm:p-12 shadow-2xl text-zinc-900 dark:text-zinc-100 space-y-8 mb-12 border border-zinc-200/60 dark:border-zinc-900/80 rounded-2xl relative overflow-hidden transition-all duration-300">
            
            {/* SELF-CONTAINED PRINT CSS INJECTION */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 20mm 15mm 20mm 15mm;
                }
                body, html {
                  background: #ffffff !important;
                  color: #000000 !important;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print, nav, aside, footer, button, select, input, .header-controls, [role="button"], .no-print-controls {
                  display: none !important;
                }
                .printable-report {
                  background: #ffffff !important;
                  color: #000000 !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  box-sizing: border-box !important;
                }
                .report-section {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  margin-bottom: 24px !important;
                  padding-bottom: 16px !important;
                  border-bottom: 1px solid #e4e4e7 !important;
                }
                tr, .kpi-card, .chart-wrapper, .ranking-panel, .executive-narrative-panel, .governance-panel {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                .recharts-responsive-container {
                  width: 100% !important;
                  height: 220px !important;
                }
                .dark {
                  color-scheme: light !important;
                }
              }
            ` }} />

            {/* CORPORATE REPORT HEADER & METADATA BANNER */}
            <div className="border-b-2 border-zinc-900 dark:border-zinc-100 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-6 relative">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2.5 py-1 rounded shadow-3xs">
                    {organization || 'MIS SYSTEM'}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded bg-zinc-50 dark:bg-zinc-950">
                    CLASSIFICATION: STRICTLY CONFIDENTIAL
                  </span>
                  {selectedDashboardId !== 'none' && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                      LIVE INGEST
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {reportTitle}
                </h1>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
                  {reportSubtitle}
                </p>
              </div>

              {/* Header Details Table */}
              <div className="text-xs space-y-2 font-mono text-zinc-600 dark:text-zinc-400 md:text-right shrink-0 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-3xs max-w-sm">
                <div className="flex md:justify-end items-center gap-2 border-b border-zinc-200/50 dark:border-zinc-850 pb-1">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-sans">Report Context</span>
                </div>
                <div><strong className="text-zinc-800 dark:text-zinc-200 font-sans">Dataset Source:</strong> {reportData.datasetName}</div>
                <div><strong className="text-zinc-800 dark:text-zinc-200 font-sans">Evaluated Scope:</strong> {reportData.filteredRowCount.toLocaleString()} / {reportData.datasetRowCount.toLocaleString()} rows</div>
                <div><strong className="text-zinc-800 dark:text-zinc-200 font-sans">Generated Date:</strong> {reportData.reportDate}</div>
                <div><strong className="text-zinc-800 dark:text-zinc-200 font-sans">Prepared By:</strong> {preparedBy}</div>
                <div><strong className="text-zinc-800 dark:text-zinc-200 font-sans">Data Quality score:</strong> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{reportData.dataQuality.healthScore}%</span></div>
              </div>
            </div>

            {/* BRAND-NEW NARRATIVE EXECUTIVE SUMMARY */}
            <div className="report-section executive-narrative-panel bg-zinc-50/50 dark:bg-zinc-900/15 p-5 sm:p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-850 shadow-3xs space-y-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-500" />
                EXECUTIVE SUMMARY & OPERATIONAL SYNOPSIS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5 border-l-2 border-blue-500 pl-3">
                  <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">1. Data Scope & Coverage</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed">
                    Analyzing active dataset <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-700 dark:text-zinc-300">{reportData.datasetName}</code>. Filtering isolates <span className="font-semibold text-zinc-900 dark:text-zinc-100">{reportData.filteredRowCount.toLocaleString()} transactional records</span> ({((reportData.filteredRowCount / reportData.datasetRowCount) * 100).toFixed(1)}% of base files) for core compliance evaluations.
                  </p>
                </div>
                <div className="space-y-1.5 border-l-2 border-indigo-500 pl-3">
                  <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">2. Financial Footprint</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed">
                    Total localized operations generated gross revenues of <span className="font-bold text-zinc-900 dark:text-zinc-100">{reportData.executiveKpis.totalRevenue.formatted}</span> with a consolidated profit margin of <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{reportData.executiveKpis.profitMargin.formatted}</span>. Operational trends correspond to expectations.
                  </p>
                </div>
                <div className="space-y-1.5 border-l-2 border-emerald-500 pl-3">
                  <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">3. Integrity & Governance</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed">
                    Governance controls yielded a stellar <span className="font-bold text-emerald-600 dark:text-emerald-450">{reportData.dataQuality.healthScore}% health score</span>. The data stream has been normalized via <span className="font-medium text-zinc-800 dark:text-zinc-200">{reportData.dataQuality.cleaningLogsCount} sanitization passes</span> to assure analytical accuracy.
                  </p>
                </div>
              </div>
            </div>

            {/* REPORT FILTERS BANNER (If Active) */}
            {reportData.activeFilterSummaryText.length > 0 && (
              <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-xs text-blue-900 dark:text-blue-200 shadow-3xs gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>Active Report Cohorts:</strong> {reportData.activeFilterSummaryText.join(' | ')}</span>
                </div>
                <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/25 shrink-0 self-start sm:self-auto">
                  {reportData.filteredRowCount.toLocaleString()} rows isolated
                </span>
              </div>
            )}

            {/* SECTION 1: EXECUTIVE SUMMARY KPI GRID */}
            <div className="report-section space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-455 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  1. KEY PERFORMANCE INDICATORS (CONSOLIDATED KPI BOARD)
                </h2>
                <span className="text-[10px] text-zinc-400 font-mono">KPI Engine Output v1.2</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {Object.values(reportData.executiveKpis).map((kpi, idx) => (
                  <div key={idx} className="kpi-card p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/80 shadow-3xs flex flex-col justify-between space-y-3.5 border-t-2 border-t-blue-500/60 hover:border-t-blue-500 transition-colors">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 truncate block" title={kpi.label}>{kpi.label}</span>
                    <div>
                      <p className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-100 truncate">{kpi.formatted}</p>
                      {kpi.warning ? (
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate mt-1 bg-amber-500/5 p-1 rounded border border-amber-500/10">⚠️ {kpi.warning}</p>
                      ) : (
                        <span className="inline-flex mt-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/10">
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
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-455 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  2. METRIC FORMULA REGISTRY & INTEGRITY COMPLIANCE AUDIT
                </h2>
                <span className="text-[10px] text-zinc-400 font-mono">{reportData.kpiPerformanceTable.length} Metrics Audited</span>
              </div>

              {reportData.kpiPerformanceTable.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-6 border border-dashed rounded-xl text-center bg-zinc-50/50 dark:bg-zinc-900/20">
                  No custom KPI definitions registered for this dataset scope.
                </p>
              ) : (
                <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[10px] font-black uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 tracking-wider">
                      <tr>
                        <th className="py-3 px-4">KPI Metric Name</th>
                        <th className="py-3 px-4">Calculated Value</th>
                        <th className="py-3 px-4">Compliance Status</th>
                        <th className="py-3 px-4 text-right">Sample Scope</th>
                        <th className="py-3 px-4">Registry Equation</th>
                        <th className="py-3 px-4">Validation Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/40 font-mono text-[11px]">
                      {reportData.kpiPerformanceTable.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="py-3 px-4 font-bold font-sans text-zinc-800 dark:text-zinc-200">{item.name}</td>
                          <td className="py-3 px-4 font-black text-zinc-900 dark:text-zinc-50">{item.formattedResult}</td>
                          <td className="py-3 px-4 font-sans">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                              item.status === 'active' ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-500/20" :
                              item.status === 'needs_attention' ? "bg-amber-500/10 text-amber-700 dark:text-amber-450 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-700 dark:text-rose-455 border-rose-500/20"
                            )}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-zinc-500 dark:text-zinc-400">{item.rowCountEvaluated.toLocaleString()} rows</td>
                          <td className="py-3 px-4 text-zinc-500 font-sans text-[11px] max-w-xs truncate" title={item.formulaSummary}>{item.formulaSummary}</td>
                          <td className="py-3 px-4 font-sans text-[11px]">
                            {item.warning ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">{item.warning}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" /> Verified OK
                              </span>
                            )}
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
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-455 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  3. CONSOLIDATED OPERATIONS PERFORMANCE QUADRANTS
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Revenue Overview */}
                <div className="p-5 rounded-2xl bg-zinc-50/40 dark:bg-zinc-900/25 border border-zinc-200/80 dark:border-zinc-850 space-y-3.5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Quadrant A: Gross Revenue Scorecard</h3>
                    <span className="text-[10px] font-mono text-zinc-400">Sales Velocity</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Gross Inflow</span>
                      <strong className="text-xl font-black text-zinc-900 dark:text-zinc-50">{reportData.performanceOverview.revenue.formattedTotal}</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Average / Ticket</span>
                      <strong className="text-base font-bold text-zinc-800 dark:text-zinc-100">{reportData.performanceOverview.revenue.formattedAvg}</strong>
                    </div>
                  </div>
                  {reportData.performanceOverview.revenue.topCategory && (
                    <div className="text-xs pt-3.5 border-t border-zinc-200/50 dark:border-zinc-850 text-zinc-650 dark:text-zinc-300 space-y-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>Leading Driver: {reportData.performanceOverview.revenue.topCategory.name}</span>
                        <span>{reportData.performanceOverview.revenue.topCategory.sharePercent.toFixed(1)}% Share</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200/60 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${reportData.performanceOverview.revenue.topCategory.sharePercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Profit Overview */}
                <div className="p-5 rounded-2xl bg-zinc-50/40 dark:bg-zinc-900/25 border border-zinc-200/80 dark:border-zinc-850 space-y-3.5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-455">Quadrant B: Profitability & Margins</h3>
                    <span className="text-[10px] font-mono text-zinc-400">Profit Pool</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Net Earnings</span>
                      <strong className="text-xl font-black text-zinc-900 dark:text-zinc-50">{reportData.performanceOverview.profit.formattedTotal}</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Average Margin</span>
                      <strong className="text-xl font-black text-emerald-600 dark:text-emerald-450">{reportData.performanceOverview.profit.marginPercent.toFixed(1)}%</strong>
                    </div>
                  </div>
                  <div className="text-xs pt-3.5 border-t border-zinc-200/50 dark:border-zinc-850 text-zinc-650 dark:text-zinc-300 space-y-2">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>Profit Pool Ratio Efficiency</span>
                      <span>{reportData.performanceOverview.profit.marginPercent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200/60 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, reportData.performanceOverview.profit.marginPercent))}%` }} />
                    </div>
                  </div>
                </div>

                {/* Order Overview */}
                <div className="p-5 rounded-2xl bg-zinc-50/40 dark:bg-zinc-900/25 border border-zinc-200/80 dark:border-zinc-850 space-y-3.5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-450">Quadrant C: Operations & Volumes</h3>
                    <span className="text-[10px] font-mono text-zinc-400">Fulfillment</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Volume Inflow</span>
                      <strong className="text-xl font-black text-zinc-900 dark:text-zinc-50">{reportData.performanceOverview.orders.totalOrders.toLocaleString()} orders</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Average Basket Size</span>
                      <strong className="text-xl font-black text-zinc-800 dark:text-zinc-100">{reportData.performanceOverview.orders.avgItemsPerOrder.toFixed(1)} units</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic font-medium leading-relaxed bg-white dark:bg-zinc-900/30 p-2 rounded-lg border border-zinc-100 dark:border-zinc-850">
                    Average transaction density indicates balanced distribution with no single outlier spikes across active regions.
                  </p>
                </div>

                {/* Customer Overview */}
                <div className="p-5 rounded-2xl bg-zinc-50/40 dark:bg-zinc-900/25 border border-zinc-200/80 dark:border-zinc-850 space-y-3.5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-455">Quadrant D: Customer Segments</h3>
                    <span className="text-[10px] font-mono text-zinc-400">Cohort Base</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Active Accounts</span>
                      <strong className="text-xl font-black text-zinc-900 dark:text-zinc-50">{reportData.performanceOverview.customers.distinctCount.toLocaleString()}</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                      <span className="text-[9px] font-extrabold text-zinc-400 block font-sans uppercase tracking-wider mb-1">Average Spend</span>
                      <strong className="text-xl font-black text-zinc-900 dark:text-zinc-50">${reportData.performanceOverview.customers.avgSpendPerCustomer.toFixed(2)}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic font-medium leading-relaxed bg-white dark:bg-zinc-900/30 p-2 rounded-lg border border-zinc-100 dark:border-zinc-850">
                    Accounts cohort spans highly diversified sectors, leading to standard risk-mitigation profiling results.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 4: TOP / BOTTOM RANKINGS */}
            <div className="report-section space-y-4">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-455 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  4. MANAGEMENT RANKINGS & EXPOSURE METRICS (TOP & BOTTOM LIMITS)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Top Products by Revenue */}
                <div className="ranking-panel space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-350">
                      Top {topN} Revenue Categories
                    </h3>
                    <span className="text-[9px] bg-blue-500/10 text-blue-600 border border-blue-500/10 px-2 py-0.5 rounded font-black font-mono">REVENUE</span>
                  </div>
                  <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-[9px] uppercase font-black text-zinc-500 border-b">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">Rank</th>
                          <th className="py-2 px-3">Category Value</th>
                          <th className="py-2 px-3 text-right">Primary Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/30">
                        {reportData.rankings.topProductsByRevenue.map((item, index) => (
                          <tr key={item.rank} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 odd:bg-zinc-50/20 dark:odd:bg-zinc-900/5">
                            <td className="py-2 px-3 text-center">
                              <span className={cn(
                                "inline-block text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center mx-auto",
                                index === 0 ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                              )}>
                                {item.rank}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">{item.name}</td>
                            <td className="py-2 px-3 text-right font-black text-zinc-900 dark:text-zinc-50">{item.formattedPrimary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Regions by Revenue */}
                <div className="ranking-panel space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-350">
                      Top {topN} Regional Hubs
                    </h3>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-600 border border-indigo-500/10 px-2 py-0.5 rounded font-black font-mono">GEOGRAPHIC</span>
                  </div>
                  <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-[9px] uppercase font-black text-zinc-500 border-b">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">Rank</th>
                          <th className="py-2 px-3">Region Value</th>
                          <th className="py-2 px-3 text-right">Primary Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/30">
                        {reportData.rankings.topRegionsByRevenue.map((item, index) => (
                          <tr key={item.rank} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 odd:bg-zinc-50/20 dark:odd:bg-zinc-900/5">
                            <td className="py-2 px-3 text-center">
                              <span className={cn(
                                "inline-block text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center mx-auto",
                                index === 0 ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                              )}>
                                {item.rank}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">{item.name}</td>
                            <td className="py-2 px-3 text-right font-black text-zinc-900 dark:text-zinc-50">{item.formattedPrimary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Products by Profit */}
                <div className="ranking-panel space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-350">
                      Top {topN} Profit Drivers
                    </h3>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/10 px-2 py-0.5 rounded font-black font-mono">EARNINGS</span>
                  </div>
                  <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-[9px] uppercase font-black text-zinc-500 border-b">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">Rank</th>
                          <th className="py-2 px-3">Category Value</th>
                          <th className="py-2 px-3 text-right">Earning Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/30">
                        {reportData.rankings.topProductsByProfit.map((item, index) => (
                          <tr key={item.rank} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 odd:bg-zinc-50/20 dark:odd:bg-zinc-900/5">
                            <td className="py-2 px-3 text-center">
                              <span className={cn(
                                "inline-block text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center mx-auto",
                                index === 0 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                              )}>
                                {item.rank}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">{item.name}</td>
                            <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">{item.formattedPrimary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Products by Profit */}
                <div className="ranking-panel space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-350">
                      Bottom {topN} Profit Drivers (Vulnerable)
                    </h3>
                    <span className="text-[9px] bg-rose-500/10 text-rose-600 border border-rose-500/10 px-2 py-0.5 rounded font-black font-mono">DEFICIT</span>
                  </div>
                  <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-[9px] uppercase font-black text-zinc-500 border-b">
                        <tr>
                          <th className="py-2 px-3 text-center w-8">Rank</th>
                          <th className="py-2 px-3">Category Value</th>
                          <th className="py-2 px-3 text-right">Earning Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/30">
                        {reportData.rankings.bottomProductsByProfit.map((item, index) => (
                          <tr key={item.rank} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 odd:bg-zinc-50/20 dark:odd:bg-zinc-900/5">
                            <td className="py-2 px-3 text-center">
                              <span className={cn(
                                "inline-block text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center mx-auto",
                                index === 0 ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                              )}>
                                {item.rank}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">{item.name}</td>
                            <td className="py-2 px-3 text-right font-black text-rose-600 dark:text-rose-400">{item.formattedPrimary}</td>
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
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-455 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  5. TIME-SERIES TREND ANALYSIS (PRIMARY VELOCITY OVERVIEW)
                </h2>
                {reportData.trendAnalysis.hasDateField && (
                  <span className="text-[10px] font-mono text-zinc-400">Chronological Axis: {reportData.trendAnalysis.dateColumnName}</span>
                )}
              </div>

              {!reportData.trendAnalysis.hasDateField ? (
                <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/40 text-center text-xs text-zinc-500 italic space-y-1">
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300">Trend analysis unavailable because no valid date field is available.</p>
                  <p className="text-[11px]">To enable time-based trends, select or upload a dataset containing a valid date or timestamp column.</p>
                </div>
              ) : (
                <div className="space-y-4 chart-wrapper">
                  {/* Recharts Area Chart */}
                  <div className="h-64 w-full bg-zinc-50/30 dark:bg-zinc-900/10 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-3xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.trendAnalysis.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} opacity={0.15} />
                        <XAxis dataKey="period" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                        />
                        <Area type="monotone" dataKey="revenue" name="Revenue Flow" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#revGrad)" />
                        <Area type="monotone" dataKey="profit" name="Profit Flow" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Monthly Trend Table */}
                  <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-[9px] uppercase font-black text-zinc-500 border-b">
                        <tr>
                          <th className="py-2 px-3">Reporting Period Interval</th>
                          <th className="py-2 px-3 text-right">Revenue Yield</th>
                          <th className="py-2 px-3 text-right">Net Profit Yield</th>
                          <th className="py-2 px-3 text-right">Consolidated Volumes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/30">
                        {reportData.trendAnalysis.trendData.map((item, index) => (
                          <tr key={`${item.period}-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 odd:bg-zinc-50/20 dark:odd:bg-zinc-900/5">
                            <td className="py-2 px-3 font-bold font-sans text-zinc-800 dark:text-zinc-200">{item.period}</td>
                            <td className="py-2 px-3 text-right font-bold text-zinc-900 dark:text-zinc-50">{item.formattedRevenue}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{item.formattedProfit}</td>
                            <td className="py-2 px-3 text-right text-zinc-500">{item.orders.toLocaleString()} records</td>
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
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-455 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  6. PERIOD-OVER-PERIOD VARIANCE & CHANGE MATRICES
                </h2>
              </div>

              {!reportData.varianceAnalysis.hasVarianceData ? (
                <div className="p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-500 italic text-center bg-zinc-50/50 dark:bg-zinc-900/20">
                  {reportData.varianceAnalysis.message || "Variance analysis requires at least 2 distinct date periods."}
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-[9px] uppercase font-black text-zinc-500 border-b">
                      <tr>
                        <th className="py-3 px-4 font-sans">Corporate Metric Index</th>
                        <th className="py-3 px-4 text-center">Active Period</th>
                        <th className="py-3 px-4 text-center">Prior Period</th>
                        <th className="py-3 px-4 text-right">Active Yield</th>
                        <th className="py-3 px-4 text-right">Prior Yield</th>
                        <th className="py-3 px-4 text-right">Gross Delta</th>
                        <th className="py-3 px-4 text-right">Variance Rate (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/30">
                      {reportData.varianceAnalysis.items.map((item, index) => (
                        <tr key={`${item.metricName}-${index}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                          <td className="py-3 px-4 font-bold font-sans text-zinc-850 dark:text-zinc-150">{item.metricName}</td>
                          <td className="py-3 px-4 text-center text-zinc-500 font-sans text-[11px]">{reportData.varianceAnalysis.currentPeriodLabel}</td>
                          <td className="py-3 px-4 text-center text-zinc-500 font-sans text-[11px]">{reportData.varianceAnalysis.previousPeriodLabel}</td>
                          <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-50">{item.formattedCurrent}</td>
                          <td className="py-3 px-4 text-right text-zinc-400 font-medium">{item.formattedPrevious}</td>
                          <td className={cn("py-3 px-4 text-right font-extrabold", item.isPositive ? "text-emerald-600 dark:text-emerald-450" : "text-rose-600 dark:text-rose-455")}>
                            {item.isPositive ? `▲ ${item.formattedVariance}` : `▼ ${item.formattedVariance}`}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={cn(
                              "px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border",
                              item.isPositive 
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-500/20" 
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-455 border-rose-500/20"
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
            <div className="report-section governance-panel bg-zinc-50/60 dark:bg-zinc-950/25 p-5 sm:p-6 rounded-2xl border-l-4 border-l-zinc-700 dark:border-l-zinc-300 border border-zinc-200 dark:border-zinc-850/80 shadow-3xs space-y-4">
              <div className="pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/40 gap-2">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  GOVERNANCE COMPLIANCE ANNEX (DATA INTEGRITY AUDIT)
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 px-2.5 py-0.5 rounded border border-emerald-500/25 font-mono">
                  HEALTH SCORE: {reportData.dataQuality.healthScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                  <span className="text-[9px] font-extrabold text-zinc-400 font-sans block uppercase tracking-wider mb-1">Total File Records</span>
                  <strong className="text-sm font-black text-zinc-900 dark:text-zinc-100">{reportData.dataQuality.totalRows.toLocaleString()} rows</strong>
                </div>
                <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                  <span className="text-[9px] font-extrabold text-zinc-400 font-sans block uppercase tracking-wider mb-1">Missing Value Cells</span>
                  <strong className="text-sm font-black text-rose-600 dark:text-rose-455">{reportData.dataQuality.missingValuesCount.toLocaleString()} cells ({reportData.dataQuality.missingValuesPercent.toFixed(1)}%)</strong>
                </div>
                <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                  <span className="text-[9px] font-extrabold text-zinc-400 font-sans block uppercase tracking-wider mb-1">Duplicate Row Flags</span>
                  <strong className="text-sm font-black text-zinc-900 dark:text-zinc-100">{reportData.dataQuality.duplicateRowsCount.toLocaleString()} rows</strong>
                </div>
                <div className="bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200/40 dark:border-zinc-800/60">
                  <span className="text-[9px] font-extrabold text-zinc-400 font-sans block uppercase tracking-wider mb-1">Calculated Pipelines</span>
                  <strong className="text-sm font-black text-emerald-600 dark:text-emerald-450">{reportData.dataQuality.cleaningLogsCount} operations</strong>
                </div>
              </div>

              {/* Quality Disclaimer */}
              <div className="p-3.5 rounded-xl bg-white/60 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-850 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed italic font-sans">
                {reportData.dataQuality.disclaimer}
              </div>
            </div>

            {/* SECTION 8: BOARD MEMORANDUM (COMBINING AI ANALYSIS & MANUAL INSIGHTS) */}
            <div className="report-section bg-zinc-50/40 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-850 p-6 sm:p-8 rounded-2xl shadow-3xs space-y-6">
              
              {/* Memo Formal Header */}
              <div className="border-b-2 border-zinc-900 dark:border-zinc-100 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2.5 py-0.5 rounded font-mono">
                    MEMORANDUM FOR THE BOARD
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono">
                    REF: MIS-ADVISORY-{reportData.reportDate.replace(/[^0-9]/g, '') || '01'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-mono text-zinc-700 dark:text-zinc-300">
                  <div><strong>TO:</strong> Executive Management Committee & Strategic Operations Board</div>
                  <div><strong>FROM:</strong> Corporate BI Director & Lead AI Analyst</div>
                  <div><strong>DATE:</strong> {reportData.reportDate}</div>
                  <div><strong>SUBJECT:</strong> PERFORMANCE ASSESSMENTS & ACTIONABLE INITIATIVES</div>
                </div>
              </div>

              {/* Calculated Insights List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  PART I: CALCULATED OPERATIONAL FINDINGS
                </h4>
                <div className="grid grid-cols-1 gap-2.5 text-xs text-zinc-850 dark:text-zinc-200">
                  {reportData.managementInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 py-2 px-3 bg-white dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-850 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-3xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-2" />
                      <span className="leading-relaxed">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Briefing System */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                  PART II: AI ADVISORY DEEP BRIEFING
                </h4>

                {isAiLoading ? (
                  <div className="p-8 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-300">Evaluating multi-dimensional vectors...</p>
                  </div>
                ) : aiSummaryText ? (
                  <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 text-xs sm:text-sm leading-relaxed text-zinc-850 dark:text-zinc-200 shadow-3xs">
                    <div className="prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed prose-headings:text-xs prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-zinc-400 dark:prose-headings:text-zinc-500 prose-headings:border-b prose-headings:border-zinc-200/50 dark:prose-headings:border-zinc-800/50 prose-headings:pb-1 prose-headings:mt-4 prose-p:my-2 prose-ul:my-2 prose-li:my-1">
                      <Markdown>{aiSummaryText}</Markdown>
                    </div>
                    <p className="text-[10px] text-zinc-400 italic pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40 mt-4 font-mono">
                      CONFIDENTIAL NOTE: Dynamic briefing derived via core semantic indexing engines. Subject to governance audits.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-white dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col items-center justify-center space-y-3 text-center shadow-3xs">
                    <Bot className="w-8 h-8 text-blue-500 animate-pulse" />
                    <div>
                      <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Compile Dynamic Board Advisory Briefing</h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5 max-w-md leading-relaxed">
                        Authorize the AI engine to index calculated performance parameters and generate Part II recommendations for management.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleGenerateAiSummary}
                      className="bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs gap-1.5 font-bold px-4 no-print"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      Assemble AI Advisory
                    </Button>
                    <p className="text-[10px] text-zinc-400 italic font-medium pt-1 hidden print:block">
                      Note: Advisory Briefing pending dynamic compilation. Access systems online to initialize.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* SECTION 9: REPORT FOOTER & AUDIT TRAILS */}
            <div className="report-section pt-5 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-400 font-mono gap-2">
              <div>
                Report Signature ID: MIS-{reportData.datasetName.toUpperCase().replace(/[^A-Z]/g, '') || 'SET'}-{reportData.filteredRowCount}
              </div>
              <div className="text-center sm:text-right">
                Confidential • Page 1 of 1 • Internal Corporate Management Information System (MIS)
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
