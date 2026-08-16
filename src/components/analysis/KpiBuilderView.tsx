import React, { useState, useEffect, useMemo } from 'react';
import {
  Dataset,
  KpiDefinition,
  KpiAggregation,
  KpiFormatType,
  KpiFormatConfig,
  FormulaToken,
  FormulaOperator,
  ColumnFilter,
  FilterOperator,
  ViewState,
} from '@/types';
import {
  evaluateKpi,
  validateKpiDefinition,
  generateFormulaSummary,
  seedStandardKpis,
  formatKpiValue,
} from '@/lib/kpiEngine';
import {
  getSavedKpis,
  saveKpis,
  addOrUpdateKpi,
  deleteKpi,
  seedInitialKpisForDataset,
} from '@/lib/kpiStorage';
import {
  TrendingUp,
  Plus,
  Calculator,
  Database,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Edit2,
  Copy,
  Trash2,
  X,
  Sparkles,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  RefreshCw,
  Table,
  SlidersHorizontal,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useDatasetStore } from '@/lib/datasetStore';

interface KpiBuilderViewProps {
  datasets?: Dataset[];
  selectedDatasetId?: string;
  onNavigateView?: (view: ViewState) => void;
  onAddToDashboard?: (kpi: KpiDefinition) => void;
  explorerContext?: {
    datasetId: string;
    filters: ColumnFilter[];
    selectedColumn?: string;
  } | null;
}

export function KpiBuilderView({
  onNavigateView,
  onAddToDashboard,
  explorerContext,
}: KpiBuilderViewProps) {
  const { currentDataset: activeDataset, allDatasets: datasets, setSelectedDatasetId } = useDatasetStore();
  const activeDatasetId = activeDataset?.id || '';

  // Saved KPIs state
  const [savedKpis, setSavedKpis] = useState<KpiDefinition[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter state for KPI library
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingKpi, setEditingKpi] = useState<KpiDefinition | null>(null);
  const [viewingKpi, setViewingKpi] = useState<KpiDefinition | null>(null);
  const [kpiToDelete, setKpiToDelete] = useState<KpiDefinition | null>(null);

  // Form state for Create / Edit Modal
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDatasetId, setFormDatasetId] = useState<string>('');
  const [formMetricType, setFormMetricType] = useState<'simple' | 'calculated'>('simple');

  // Simple metric form state
  const [formColumn, setFormColumn] = useState<string>('');
  const [formAggregation, setFormAggregation] = useState<KpiAggregation>('sum');

  // Calculated metric form state
  const [formTokens, setFormTokens] = useState<FormulaToken[]>([]);

  // Token creation helpers state
  const [newTermAgg, setNewTermAgg] = useState<KpiAggregation>('sum');
  const [newTermCol, setNewTermCol] = useState<string>('');
  const [newKpiRefId, setNewKpiRefId] = useState<string>('');
  const [newConstantVal, setNewConstantVal] = useState<number>(100);

  // KPI Filters form state
  const [formFilters, setFormFilters] = useState<ColumnFilter[]>([]);

  // Formatting form state
  const [formFormatType, setFormFormatType] = useState<KpiFormatType>('currency');
  const [formCurrencySymbol, setFormCurrencySymbol] = useState<string>('$');
  const [formDecimals, setFormDecimals] = useState<number>(2);
  const [formUseThousands, setFormUseThousands] = useState<boolean>(true);
  const [formCompact, setFormCompact] = useState<boolean>(false);

  // Form validation errors
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Dynamic formatting preview helper
  const sampleFormattedValue = useMemo(() => {
    return formatKpiValue(124582.45, {
      type: formFormatType,
      currencySymbol: formCurrencySymbol,
      decimals: formDecimals,
      useThousandsSeparator: formUseThousands,
      compactNotation: formCompact
    });
  }, [formFormatType, formCurrencySymbol, formDecimals, formUseThousands, formCompact]);

  // Explorer import confirmation prompt
  const [showExplorerPrompt, setShowExplorerPrompt] = useState<boolean>(!!explorerContext);

  // Load saved KPIs on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      if (activeDataset) {
        const kpis = await seedInitialKpisForDataset(activeDataset);
        setSavedKpis(kpis);
      } else {
        const kpis = await getSavedKpis();
        setSavedKpis(kpis);
      }
      setIsLoading(false);
    }
    load();
  }, [activeDataset?.id]);

  // Sync default form dataset & column options when target dataset changes
  const currentFormDataset = useMemo(
    () => datasets.find((d) => d.id === formDatasetId) || activeDataset,
    [datasets, formDatasetId, activeDataset]
  );

  useEffect(() => {
    if (currentFormDataset && currentFormDataset.headers.length > 0) {
      if (!formColumn || !currentFormDataset.headers.includes(formColumn)) {
        setFormColumn(currentFormDataset.headers[0]);
      }
      if (!newTermCol || !currentFormDataset.headers.includes(newTermCol)) {
        setNewTermCol(currentFormDataset.headers[0]);
      }
    }
  }, [currentFormDataset]);

  // Seed standard KPIs trigger
  const handleSeedStandardKpis = async () => {
    if (!activeDataset) return;
    const seeded = seedStandardKpis(
      activeDataset.id,
      activeDataset.name,
      activeDataset.headers
    );
    // Merge with existing non-conflicting KPIs
    const existingOther = savedKpis.filter((k) => k.datasetId !== activeDataset.id);
    const updated = [...seeded, ...existingOther];
    await saveKpis(updated);
    setSavedKpis(updated);
  };

  // Open Create Modal
  const handleOpenCreateModal = (fromExplorerContext = false) => {
    setEditingKpi(null);
    setFormName('');
    setFormDescription('');
    setFormDatasetId(activeDataset?.id || datasets[0]?.id || '');
    setFormMetricType('simple');
    setFormColumn(activeDataset?.headers[0] || '');
    setFormAggregation('sum');
    setFormTokens([]);
    setFormFormatType('currency');
    setFormCurrencySymbol('$');
    setFormDecimals(2);
    setFormUseThousands(true);
    setFormCompact(false);
    setFormErrors([]);

    if (fromExplorerContext && explorerContext) {
      setFormDatasetId(explorerContext.datasetId);
      setFormFilters(explorerContext.filters);
      if (explorerContext.selectedColumn) {
        setFormColumn(explorerContext.selectedColumn);
      }
    } else {
      setFormFilters([]);
    }

    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (kpi: KpiDefinition) => {
    setEditingKpi(kpi);
    setFormName(kpi.name);
    setFormDescription(kpi.description || '');
    setFormDatasetId(kpi.datasetId);
    setFormMetricType(kpi.metricType);
    setFormColumn(kpi.column || currentFormDataset?.headers[0] || '');
    setFormAggregation(kpi.aggregation || 'sum');
    setFormTokens(kpi.formulaTokens || []);
    setFormFilters(kpi.filters || []);
    setFormFormatType(kpi.format.type);
    setFormCurrencySymbol(kpi.format.currencySymbol || '$');
    setFormDecimals(kpi.format.decimals ?? 2);
    setFormUseThousands(kpi.format.useThousandsSeparator !== false);
    setFormCompact(kpi.format.compactNotation || false);
    setFormErrors([]);
    setIsModalOpen(true);
  };

  // Duplicate KPI
  const handleDuplicateKpi = async (kpi: KpiDefinition) => {
    const duplicated: KpiDefinition = {
      ...kpi,
      id: `kpi-${Date.now()}`,
      name: `${kpi.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = await addOrUpdateKpi(duplicated);
    setSavedKpis(updated);
  };

  // Delete KPI
  const handleConfirmDelete = async () => {
    if (!kpiToDelete) return;
    const updated = await deleteKpi(kpiToDelete.id);
    setSavedKpis(updated);
    setKpiToDelete(null);
  };

  // Live preview evaluation in Modal
  const livePreviewDefinition: KpiDefinition = useMemo(() => {
    const ds = datasets.find((d) => d.id === formDatasetId) || activeDataset;
    return {
      id: editingKpi?.id || 'preview-temp',
      name: formName || 'New Business Metric',
      description: formDescription,
      datasetId: formDatasetId || ds?.id || '',
      datasetName: ds?.name,
      metricType: formMetricType,
      column: formColumn,
      aggregation: formAggregation,
      formulaTokens: formTokens,
      filters: formFilters,
      format: {
        type: formFormatType,
        currencySymbol: formCurrencySymbol,
        decimals: formDecimals,
        useThousandsSeparator: formUseThousands,
        compactNotation: formCompact,
      },
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [
    editingKpi,
    formName,
    formDescription,
    formDatasetId,
    formMetricType,
    formColumn,
    formAggregation,
    formTokens,
    formFilters,
    formFormatType,
    formCurrencySymbol,
    formDecimals,
    formUseThousands,
    formCompact,
    datasets,
    activeDataset,
  ]);

  const livePreviewResult = useMemo(() => {
    if (!currentFormDataset) return null;
    return evaluateKpi(livePreviewDefinition, datasets, savedKpis);
  }, [livePreviewDefinition, datasets, savedKpis, currentFormDataset]);

  // Save KPI Form Submit (Saves inside KPI Builder only)
  const handleSaveKpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateKpiDefinition(
      livePreviewDefinition,
      datasets,
      savedKpis
    );
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    // Evaluate final status before saving
    const evalRes = evaluateKpi(livePreviewDefinition, datasets, savedKpis);

    const kpiToSave: KpiDefinition = {
      ...livePreviewDefinition,
      id: editingKpi?.id || `kpi-${Date.now()}`,
      status: evalRes.status,
      statusReason: evalRes.statusReason,
      updatedAt: Date.now(),
      createdAt: editingKpi?.createdAt || Date.now(),
    };

    const updated = await addOrUpdateKpi(kpiToSave);
    setSavedKpis(updated);
    setIsModalOpen(false);
  };

  // Optional explicit action: Save & Add to Dashboard
  const handleSaveAndAddToDashboard = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateKpiDefinition(
      livePreviewDefinition,
      datasets,
      savedKpis
    );
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    const evalRes = evaluateKpi(livePreviewDefinition, datasets, savedKpis);

    const kpiToSave: KpiDefinition = {
      ...livePreviewDefinition,
      id: editingKpi?.id || `kpi-${Date.now()}`,
      status: evalRes.status,
      statusReason: evalRes.statusReason,
      updatedAt: Date.now(),
      createdAt: editingKpi?.createdAt || Date.now(),
    };

    const updated = await addOrUpdateKpi(kpiToSave);
    setSavedKpis(updated);
    setIsModalOpen(false);

    if (onAddToDashboard) {
      onAddToDashboard(kpiToSave);
    }
  };

  // Explicit user action to add an existing saved KPI to Dashboard
  const handleExplicitAddToDashboard = async (kpi: KpiDefinition) => {
    const updated = await addOrUpdateKpi(kpi);
    setSavedKpis(updated);
    if (onAddToDashboard) {
      onAddToDashboard(kpi);
    }
  };

  // Formula Token Builder Actions
  const handleAddTermToken = () => {
    if (!newTermCol) return;
    const newToken: FormulaToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'term',
      aggregation: newTermAgg,
      column: newTermCol,
    };
    setFormTokens((prev) => [...prev, newToken]);
  };

  const handleAddOperatorToken = (op: FormulaOperator) => {
    const newToken: FormulaToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'operator',
      operator: op,
    };
    setFormTokens((prev) => [...prev, newToken]);
  };

  const handleAddKpiRefToken = () => {
    if (!newKpiRefId) return;
    const targetKpi = savedKpis.find((k) => k.id === newKpiRefId);
    if (!targetKpi) return;

    const newToken: FormulaToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'kpi_ref',
      kpiId: targetKpi.id,
      kpiName: targetKpi.name,
    };
    setFormTokens((prev) => [...prev, newToken]);
  };

  const handleAddConstantToken = () => {
    const newToken: FormulaToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'constant',
      value: newConstantVal,
    };
    setFormTokens((prev) => [...prev, newToken]);
  };

  const handleRemoveToken = (id: string) => {
    setFormTokens((prev) => prev.filter((t) => t.id !== id));
  };

  // Add KPI Filter
  const handleAddFilter = () => {
    if (!currentFormDataset || currentFormDataset.headers.length === 0) return;
    const newFilter: ColumnFilter = {
      id: `filter-${Date.now()}`,
      column: currentFormDataset.headers[0],
      operator: 'equals',
      value: '',
    };
    setFormFilters((prev) => [...prev, newFilter]);
  };

  const handleRemoveFilter = (id: string) => {
    setFormFilters((prev) => prev.filter((f) => f.id !== id));
  };

  // Filter KPI Library List
  const filteredLibraryKpis = useMemo(() => {
    return savedKpis.filter((kpi) => {
      if (
        activeDatasetId &&
        kpi.datasetId !== activeDatasetId &&
        kpi.datasetId !== 'all'
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = kpi.name.toLowerCase().includes(term);
        const matchesDesc = (kpi.description || '').toLowerCase().includes(term);
        const matchesSummary = generateFormulaSummary(kpi).toLowerCase().includes(term);
        if (!matchesName && !matchesDesc && !matchesSummary) return false;
      }

      if (statusFilter !== 'all' && kpi.status !== statusFilter) return false;
      if (typeFilter !== 'all' && kpi.metricType !== typeFilter) return false;

      return true;
    });
  }, [savedKpis, activeDatasetId, searchTerm, statusFilter, typeFilter]);

  // Evaluated calculation map for library list
  const evaluatedKpisMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof evaluateKpi>>();
    for (const kpi of savedKpis) {
      map.set(kpi.id, evaluateKpi(kpi, datasets, savedKpis));
    }
    return map;
  }, [savedKpis, datasets]);

  const getStatusBadge = (status: KpiDefinition['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Active
          </span>
        );
      case 'needs_attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Needs Attention
          </span>
        );
      case 'invalid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-50 shrink-0" />
            <XCircle className="w-3 h-3 text-rose-500" />
            Invalid
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent">
      {/* 1. Page Header */}
      <div className="p-6 glass-panel border-b-0 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                KPI Builder
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Define reusable business metrics for dashboards, reports, and AI analysis.
            </p>
          </div>

          {/* Dataset Selector & Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Active Dataset Selector */}
            {datasets.length > 0 && (
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-2xs">
                <Database className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={activeDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.rowCount.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedStandardKpis}
              className="text-xs h-8 gap-1.5 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Reset or generate standard business metrics (Revenue, Profit, Margin, etc.)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
              <span>Seed Standard KPIs</span>
            </Button>

            <Button
              onClick={() => handleOpenCreateModal(false)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8"
            >
              <Plus className="w-4 h-4" />
              <span>Create KPI</span>
            </Button>
          </div>
        </div>

        {/* Header Indicators Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500 font-mono">
          <span>
            Active Dataset:{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {activeDataset?.name || 'None'}
            </strong>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span>
            Saved KPIs:{' '}
            <strong className="text-blue-600 dark:text-blue-400 font-bold">
              {savedKpis.length}
            </strong>
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span>
            Evaluated Rows:{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {activeDataset?.rowCount.toLocaleString() || 0}
            </strong>
          </span>
        </div>
      </div>

      {/* 2. Explorer Context Banner */}
      {showExplorerPrompt && explorerContext && (
        <div className="mx-6 mt-4 p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl flex items-center justify-between gap-3 text-xs text-purple-900 dark:text-purple-300 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
            <span>
              <strong>Context imported from Data Explorer:</strong> Dataset{' '}
              <code className="font-mono">{activeDataset?.name}</code> with{' '}
              {explorerContext.filters.length} active filter condition(s).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleOpenCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1"
            >
              Create KPI from Explorer
            </Button>
            <button
              onClick={() => setShowExplorerPrompt(false)}
              className="text-purple-400 hover:text-purple-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. KPI Library List Controls Bar */}
      <div className="p-4 glass-panel border-t-0 border-l-0 border-r-0 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search metric name, formula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="needs_attention">Needs Attention</option>
            <option value="invalid">Invalid</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="simple">Simple Aggregation</option>
            <option value="calculated">Calculated Formula</option>
          </select>
        </div>
      </div>

      {/* 4. KPI Library Table / List Workspace */}
      <div className="flex-1 p-6">
        {filteredLibraryKpis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl glass-panel">
            <Calculator className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              No Business Metrics Found
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1 mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No KPIs match your current search filters.'
                : 'Get started by creating a new KPI or seeding standard metrics for your dataset.'}
            </p>
            <Button
              onClick={() => handleOpenCreateModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Business Metric
            </Button>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl shadow-xs overflow-hidden border border-zinc-200/60 dark:border-zinc-800/60">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-50/70 dark:bg-zinc-900/40 border-b border-zinc-200/50 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Metric Name & Description</th>
                  <th className="px-5 py-3.5">Formula / Aggregation</th>
                  <th className="px-5 py-3.5">Live Result</th>
                  <th className="px-5 py-3.5">Dataset</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/30">
                {filteredLibraryKpis.map((kpi) => {
                  const evalResult = evaluatedKpisMap.get(kpi.id);
                  const formulaSummary = generateFormulaSummary(kpi);

                  return (
                    <tr
                      key={kpi.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors group"
                    >
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
                              {kpi.name}
                            </span>
                            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                              {kpi.metricType}
                            </span>
                          </div>
                          {kpi.description && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate leading-relaxed">
                              {kpi.description}
                            </p>
                          )}
                          {kpi.filters && kpi.filters.length > 0 && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/15">
                                {kpi.filters.length} Filter{kpi.filters.length > 1 ? 's' : ''} Applied
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="inline-block p-1 px-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-lg text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate max-w-xs select-all">
                          {formulaSummary}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">
                            {evalResult?.formattedResult || 'N/A'}
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-1">
                            {evalResult?.rowCountEvaluated.toLocaleString() || 0} rows evaluated
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-[140px] text-xs">
                        {kpi.datasetName || activeDataset?.name || 'Default'}
                      </td>

                      <td className="px-5 py-4">
                        {getStatusBadge(evalResult?.status || kpi.status)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExplicitAddToDashboard(kpi)}
                            className="text-[11px] h-7 gap-1 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium"
                            title="Add KPI to Dashboard"
                          >
                            <LayoutGrid className="w-3 h-3" />
                            <span>Add to Dashboard</span>
                          </Button>

                          <button
                            onClick={() => setViewingKpi(kpi)}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="View KPI Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(kpi)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Edit KPI"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDuplicateKpi(kpi)}
                            className="p-1.5 text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Duplicate KPI"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setKpiToDelete(kpi)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Delete KPI"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Create / Edit KPI Modal Workspace */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel glass-card rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {editingKpi ? 'Edit Business Metric' : 'Create New Business Metric'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* LIVE PREVIEW CARD */}
              <div className="p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    LIVE EVALUATED PREVIEW
                  </span>
                  <span className="font-mono text-[11px] text-blue-700 dark:text-blue-400">
                    {livePreviewResult?.rowCountEvaluated.toLocaleString() || 0} rows evaluated ({livePreviewResult?.executionTimeMs?.toFixed(1) ?? '0.0'}ms)
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {livePreviewDefinition.name || 'Untitled Metric'}
                    </h2>
                    <p className="text-xs font-mono text-zinc-500 mt-0.5">
                      Formula: {generateFormulaSummary(livePreviewDefinition)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400">
                      {livePreviewResult?.formattedResult || 'N/A'}
                    </div>
                  </div>
                </div>

                {livePreviewResult?.warnings && livePreviewResult.warnings.length > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-mono">
                    ⚠️ {livePreviewResult.warnings.join('; ')}
                  </p>
                )}
              </div>

              {/* Validation Errors Box */}
              {formErrors.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <strong className="block font-bold">Please correct the following errors:</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Section 1: Identification */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                  1. Metric Identification & Target Dataset
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      KPI Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Profit Margin, Total Revenue..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Target Dataset *
                    </label>
                    <select
                      value={formDatasetId}
                      onChange={(e) => setFormDatasetId(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    >
                      {datasets.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.rowCount.toLocaleString()} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Briefly explain the business context of this metric..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Section 2: Metric Type & Logic */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                  2. Metric Calculation Type
                </h4>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    <input
                      type="radio"
                      name="metricType"
                      value="simple"
                      checked={formMetricType === 'simple'}
                      onChange={() => setFormMetricType('simple')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Simple Column Aggregation
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    <input
                      type="radio"
                      name="metricType"
                      value="calculated"
                      checked={formMetricType === 'calculated'}
                      onChange={() => setFormMetricType('calculated')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    Calculated Formula Expression
                  </label>
                </div>

                {/* SIMPLE AGGREGATION FORM */}
                {formMetricType === 'simple' && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Aggregation Function
                      </label>
                      <select
                        value={formAggregation}
                        onChange={(e) => setFormAggregation(e.target.value as KpiAggregation)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      >
                        <option value="sum">SUM (Total Sum)</option>
                        <option value="avg">AVERAGE (Mean)</option>
                        <option value="count">COUNT (Total Rows)</option>
                        <option value="distinct_count">DISTINCT COUNT (Unique Values)</option>
                        <option value="min">MIN (Minimum Value)</option>
                        <option value="max">MAX (Maximum Value)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                        Measure Column
                      </label>
                      <select
                        value={formColumn}
                        onChange={(e) => setFormColumn(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      >
                        {currentFormDataset?.headers.map((h) => (
                          <option key={h} value={h}>
                            {h} ({currentFormDataset.columnTypes[h] || 'text'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* CALCULATED VISUAL FORMULA BUILDER */}
                {formMetricType === 'calculated' && (
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Visual Formula Expression
                        </label>
                        <p className="text-[10px] text-zinc-400">Assemble terms, operators, and functions to compute compound business metrics.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormTokens([])}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        Clear Formula
                      </button>
                    </div>

                    {/* Active Formula Token Stream Display */}
                    <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800/80 rounded-xl flex flex-wrap items-center gap-2 min-h-[64px] shadow-3xs relative overflow-hidden">
                      <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />
                      {formTokens.length === 0 ? (
                        <span className="text-xs text-zinc-400 italic z-10">
                          Formula is empty. Compose calculation steps using operators and measures below.
                        </span>
                      ) : (
                        formTokens.map((token) => (
                          <div
                            key={token.id}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-3xs border transition-all z-10',
                              token.type === 'term' &&
                                'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
                              token.type === 'operator' &&
                                'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 font-black',
                              token.type === 'kpi_ref' &&
                                'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
                              token.type === 'constant' &&
                                'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-250 border-zinc-250 dark:border-zinc-700'
                            )}
                          >
                            <span>
                              {token.type === 'term' && `${(token.aggregation || 'sum').toUpperCase()}(${token.column})`}
                              {token.type === 'operator' && (token.operator === '*' ? '×' : token.operator === '/' ? '÷' : token.operator)}
                              {token.type === 'kpi_ref' && `[KPI: ${token.kpiName}]`}
                              {token.type === 'constant' && token.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveToken(token.id)}
                              className="text-zinc-400 hover:text-rose-500 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 p-0.5 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Controls to append tokens */}
                    <div className="space-y-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
                      {/* Operator Pills */}
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Quick Operators:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(['+', '-', '*', '/', '(', ')'] as FormulaOperator[]).map((op) => (
                            <button
                              key={op}
                              type="button"
                              onClick={() => handleAddOperatorToken(op)}
                              className="w-10 h-8 flex items-center justify-center bg-white dark:bg-zinc-950 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-sm font-black text-zinc-800 dark:text-zinc-200 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-800 shadow-3xs hover:shadow-2xs transition-all active:scale-95"
                            >
                              {op === '*' ? '×' : op === '/' ? '÷' : op}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Add Measure Aggregation */}
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Add Column Aggregation (Measure):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-3xs">
                          <div className="sm:col-span-4">
                            <select
                              value={newTermAgg}
                              onChange={(e) => setNewTermAgg(e.target.value as KpiAggregation)}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="sum">SUM</option>
                              <option value="avg">AVG</option>
                              <option value="count">COUNT</option>
                              <option value="distinct_count">DISTINCT COUNT</option>
                            </select>
                          </div>

                          <div className="sm:col-span-5">
                            <select
                              value={newTermCol}
                              onChange={(e) => setNewTermCol(e.target.value)}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-250 focus:ring-1 focus:ring-blue-500"
                            >
                              {currentFormDataset?.headers.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleAddTermToken}
                              className="w-full text-xs h-8 gap-1 border-zinc-200 dark:border-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Measure
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Add Saved KPI Reference */}
                      {savedKpis.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Reference Saved KPI:
                          </span>
                          <div className="flex flex-col sm:flex-row items-center gap-2 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-3xs">
                            <select
                              value={newKpiRefId}
                              onChange={(e) => setNewKpiRefId(e.target.value)}
                              className="w-full sm:flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-250 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Saved KPI to Reference...</option>
                              {savedKpis.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.name} ({generateFormulaSummary(k)})
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleAddKpiRefToken}
                              disabled={!newKpiRefId}
                              className="w-full sm:w-auto text-xs h-8 gap-1 shrink-0 border-zinc-200 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add KPI Ref
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Section 3: KPI Definition Filters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    3. KPI Definition Filters (Optional)
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddFilter}
                    className="text-xs h-6 gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Filter
                  </Button>
                </div>

                {formFilters.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">
                    No definition filters applied. Calculates over all dataset rows.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formFilters.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                      >
                        <select
                          value={f.column}
                          onChange={(e) => {
                            const col = e.target.value;
                            setFormFilters((prev) =>
                              prev.map((item) => (item.id === f.id ? { ...item, column: col } : item))
                            );
                          }}
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs"
                        >
                          {currentFormDataset?.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>

                        <select
                          value={f.operator}
                          onChange={(e) => {
                            const op = e.target.value as FilterOperator;
                            setFormFilters((prev) =>
                              prev.map((item) => (item.id === f.id ? { ...item, operator: op } : item))
                            );
                          }}
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs"
                        >
                          <option value="equals">equals</option>
                          <option value="does_not_equal">does not equal</option>
                          <option value="contains">contains</option>
                          <option value="greater_than">greater than</option>
                          <option value="less_than">less than</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Target value..."
                          value={f.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormFilters((prev) =>
                              prev.map((item) => (item.id === f.id ? { ...item, value: val } : item))
                            );
                          }}
                          className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveFilter(f.id)}
                          className="text-zinc-400 hover:text-rose-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Section 4: Formatting */}
              <div className="space-y-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                    4. Presentation & Formatting
                  </h4>
                  <p className="text-[10px] text-zinc-400">Configure numerical visualization, symbols, and scaling for the target metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Format Type
                    </label>
                    <select
                      value={formFormatType}
                      onChange={(e) => setFormFormatType(e.target.value as KpiFormatType)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="currency">Currency ($)</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="number">Number</option>
                      <option value="decimal">Decimal</option>
                    </select>
                  </div>

                  {formFormatType === 'currency' && (
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={formCurrencySymbol}
                        onChange={(e) => setFormCurrencySymbol(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                      Decimal Places
                    </label>
                    <select
                      value={formDecimals}
                      onChange={(e) => setFormDecimals(Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={0}>0 (Whole numbers)</option>
                      <option value={1}>1 decimal (e.g. 24.6%)</option>
                      <option value={2}>2 decimals (e.g. $1,245.82)</option>
                      <option value={3}>3 decimals</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formUseThousands}
                        onChange={(e) => setFormUseThousands(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/20"
                      />
                      Thousands Separator
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formCompact}
                        onChange={(e) => setFormCompact(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500/20"
                      />
                      Compact Notation (e.g. 1.2M)
                    </label>
                  </div>

                  {/* Formatting dynamic preview card */}
                  <div className="col-span-1 md:col-span-4 bg-blue-500/5 dark:bg-blue-400/5 p-3 rounded-xl border border-blue-500/10 dark:border-blue-400/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold">
                      <Info className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Live Presentation Format Example:</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-zinc-400 text-[11px]">Raw: 124582.45</span>
                      <span className="text-zinc-300 dark:text-zinc-700">➔</span>
                      <span className="font-bold text-blue-700 dark:text-blue-300 text-sm bg-white dark:bg-zinc-950 px-3 py-1 rounded-lg border border-blue-200/50 dark:border-blue-800/40 shadow-3xs">
                        {sampleFormattedValue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveAndAddToDashboard}
                className="text-xs gap-1.5 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-medium"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Save & Add to Dashboard
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveKpiSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save KPI
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. View Details Modal */}
      {viewingKpi && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  KPI Details & Metadata
                </h3>
              </div>
              <button
                onClick={() => setViewingKpi(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-zinc-400 uppercase text-[10px] font-bold block mb-0.5">
                  KPI Name
                </label>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {viewingKpi.name}
                </span>
              </div>

              {viewingKpi.description && (
                <div>
                  <label className="text-zinc-400 uppercase text-[10px] font-bold block mb-0.5">
                    Description
                  </label>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    {viewingKpi.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-1">
                    Current Evaluated Result
                  </span>
                  <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                    {evaluatedKpisMap.get(viewingKpi.id)?.formattedResult || 'N/A'}
                  </span>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-1">
                    Formula Summary
                  </span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {generateFormulaSummary(viewingKpi)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 font-mono text-[11px] text-zinc-500">
                <div className="flex justify-between">
                  <span>Target Dataset:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                    {viewingKpi.datasetName || activeDataset?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Metric Type:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold uppercase">
                    {viewingKpi.metricType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{new Date(viewingKpi.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span>{new Date(viewingKpi.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* USED BY SECTION */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="text-zinc-400 uppercase text-[10px] font-bold block mb-1.5">
                  Used By (System Dependencies)
                </label>
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <p className="text-zinc-500 italic">
                    • Dashboard: Sales Overview
                  </p>
                  <p className="text-zinc-500 italic">
                    • Executive Report: Monthly Performance Digest
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingKpi(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleExplicitAddToDashboard(viewingKpi);
                  setViewingKpi(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 font-semibold"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Add to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Dialog */}
      {kpiToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Confirm KPI Deletion
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to delete <strong className="text-zinc-800 dark:text-zinc-200">{kpiToDelete.name}</strong>? This metric definition will be removed from your saved workspace metrics.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKpiToDelete(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                Delete Metric
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
