import React, { useState, useEffect } from 'react';
import { Dashboard, Dataset, RelationshipSuggestion, DashboardFilter, WidgetConfig, KpiDefinition } from '@/types';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetBuilderModal } from './WidgetBuilderModal';
import { AiDashboardModal } from './AiDashboardModal';
import { generateDemoDashboard } from '@/lib/dashboardStorage';
import { getSavedKpis } from '@/lib/kpiStorage';
import { 
  LayoutDashboard, Plus, Trash2, Edit3, Settings, Filter, FileText, Check, X, 
  Eye, Edit2, Copy, Sparkles, Layers, ArrowUp, ArrowDown, Move, AlertCircle, Save, Calendar, RefreshCw,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  dashboards: Dashboard[];
  datasets: Dataset[];
  relationships?: RelationshipSuggestion[];
  selectedDashId: string | null;
  selectedDatasetId?: string | null;
  onSelectDataset?: (id: string) => void;
  onSelectDashboard: (id: string | null) => void;
  onUpdateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  onDeleteDashboard: (id: string) => void;
}

export function DashboardView({
  dashboards,
  datasets,
  relationships = [],
  selectedDashId,
  selectedDatasetId,
  onSelectDataset,
  onSelectDashboard,
  onUpdateDashboard,
  onDeleteDashboard
}: DashboardViewProps) {
  // Mode: 'view' (clean presentation) vs 'build' (editing, drag, resize)
  const [mode, setMode] = useState<'view' | 'build'>('view');
  
  // Modals & UI States
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(true);
  const [savedKpis, setSavedKpis] = useState<KpiDefinition[]>([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  
  // Dashboard Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [saveToast, setSaveToast] = useState(false);

  // Load Saved KPIs on mount for KPI Card evaluating
  useEffect(() => {
    async function loadKpis() {
      const kpis = await getSavedKpis();
      setSavedKpis(kpis);
    }
    loadKpis();
  }, []);

  const primaryDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0];

  // Selected Dashboard fallback
  const currentDash = dashboards.find(d => d.id === selectedDashId) || dashboards[0] || null;

  // Auto-select first dashboard if none selected
  useEffect(() => {
    if (!selectedDashId && dashboards.length > 0) {
      onSelectDashboard(dashboards[0].id);
    }
  }, [selectedDashId, dashboards]);

  // Handle Save Feedback
  const triggerSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // 1. Create Blank Dashboard
  const handleCreateNewDashboard = () => {
    const newId = `dash-${Date.now()}`;
    const newDash: Dashboard = {
      id: newId,
      title: `Dashboard ${dashboards.length + 1}`,
      description: 'Custom business analytics view',
      datasetId: primaryDataset?.id || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      widgets: [],
      filters: []
    };
    onUpdateDashboard(newId, newDash);
    onSelectDashboard(newId);
    setMode('build');
  };

  // 2. Create Demo Dashboard
  const handleCreateDemoDashboard = () => {
    if (!primaryDataset) return;
    const demoDash = generateDemoDashboard(primaryDataset, savedKpis);
    onUpdateDashboard(demoDash.id, demoDash);
    onSelectDashboard(demoDash.id);
    setMode('view');
    triggerSaveToast();
  };

  // 3. Duplicate Active Dashboard
  const handleDuplicateDashboard = () => {
    if (!currentDash) return;
    const dupId = `dash-${Date.now()}`;
    const dupDash: Dashboard = {
      ...currentDash,
      id: dupId,
      title: `${currentDash.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    onUpdateDashboard(dupId, dupDash);
    onSelectDashboard(dupId);
    triggerSaveToast();
  };

  // 4. Save Title
  const handleSaveTitle = () => {
    if (currentDash && titleInput.trim()) {
      onUpdateDashboard(currentDash.id, { title: titleInput.trim(), updatedAt: Date.now() });
      triggerSaveToast();
    }
    setIsEditingTitle(false);
  };

  // 5. Add or Update Widget
  const handleSaveWidget = (widget: WidgetConfig) => {
    if (!currentDash) return;
    const existingIdx = currentDash.widgets.findIndex(w => w.id === widget.id);
    let updatedWidgets: WidgetConfig[];

    if (existingIdx >= 0) {
      updatedWidgets = [...currentDash.widgets];
      updatedWidgets[existingIdx] = widget;
    } else {
      updatedWidgets = [...currentDash.widgets, widget];
    }

    onUpdateDashboard(currentDash.id, { widgets: updatedWidgets, updatedAt: Date.now() });
    setEditingWidget(null);
    triggerSaveToast();
  };

  // 6. Delete Widget
  const handleDeleteWidget = (widgetId: string) => {
    if (!currentDash) return;
    const updated = currentDash.widgets.filter(w => w.id !== widgetId);
    onUpdateDashboard(currentDash.id, { widgets: updated, updatedAt: Date.now() });
    triggerSaveToast();
  };

  // 7. Duplicate Widget
  const handleDuplicateWidget = (widget: WidgetConfig) => {
    if (!currentDash) return;
    const cloned: WidgetConfig = {
      ...widget,
      id: `w-${Date.now()}`,
      title: `${widget.title} (Copy)`
    };
    onUpdateDashboard(currentDash.id, { widgets: [...currentDash.widgets, cloned], updatedAt: Date.now() });
    triggerSaveToast();
  };

  // 8. Reorder Widget position
  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    if (!currentDash) return;
    const newWidgets = [...currentDash.widgets];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newWidgets.length) return;

    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[targetIdx];
    newWidgets[targetIdx] = temp;

    onUpdateDashboard(currentDash.id, { widgets: newWidgets, updatedAt: Date.now() });
  };

  // 9. Resize Widget Grid Span
  const handleResizeWidget = (widgetId: string, gridSpan: number) => {
    if (!currentDash) return;
    const updated = currentDash.widgets.map(w => w.id === widgetId ? { ...w, gridSpan } : w);
    onUpdateDashboard(currentDash.id, { widgets: updated, updatedAt: Date.now() });
  };

  const handleUpdateWidget = (widgetId: string, updatedConfig: Partial<any>) => {
    if (!currentDash) return;
    const updated = currentDash.widgets.map(w => w.id === widgetId ? { ...w, ...updatedConfig } : w);
    onUpdateDashboard(currentDash.id, { widgets: updated, updatedAt: Date.now() });
  };

  // 10. Global Filter Changes
  const handleGlobalFilterChange = (column: string, value: string | null, operator: any = 'equals') => {
    if (!currentDash || !primaryDataset) return;
    const existingFilters = currentDash.filters || [];
    const filterIdx = existingFilters.findIndex(f => f.column === column);

    let updatedFilters: DashboardFilter[];
    if (value === null || value === 'all' || value === '') {
      updatedFilters = existingFilters.filter(f => f.column !== column);
    } else {
      if (filterIdx >= 0) {
        updatedFilters = [...existingFilters];
        updatedFilters[filterIdx] = { ...updatedFilters[filterIdx], value, operator };
      } else {
        updatedFilters = [
          ...existingFilters,
          { id: `df-${Date.now()}`, datasetId: primaryDataset.id, column, value, operator }
        ];
      }
    }

    onUpdateDashboard(currentDash.id, { filters: updatedFilters, updatedAt: Date.now() });
  };

  // 11. Cross-Filtering Click Event
  const handleCrossFilterClick = (column: string, value: string) => {
    if (!currentDash) return;
    const existing = currentDash.filters.find(f => f.column === column && String(f.value) === String(value));
    if (existing) {
      // Toggle off
      handleGlobalFilterChange(column, null);
    } else {
      // Toggle on
      handleGlobalFilterChange(column, value);
    }
  };

  // Clear All Filters
  const handleClearAllFilters = () => {
    if (!currentDash) return;
    onUpdateDashboard(currentDash.id, { filters: [], updatedAt: Date.now() });
  };

  // Categorical & Date columns for Filter Bar
  const categoricalCols = primaryDataset ? Object.entries(primaryDataset.columnProfiles)
    .filter(([_, prof]) => prof.type === 'categorical' || prof.type === 'boolean' || prof.type === 'date' || prof.uniqueCount <= 30)
    .map(([col]) => col) : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50 dark:bg-[#050505]">
      
      {/* PAGE HEADER */}
      <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shrink-0 space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Dashboards
                  {saveToast && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-fade-in">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500">Build interactive dashboards from your data and business metrics.</p>
              </div>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Active Dataset Selector */}
            {datasets.length > 0 && (
              <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 font-medium px-2">Dataset:</span>
                <select
                  value={selectedDatasetId || primaryDataset?.id || ''}
                  onChange={(e) => onSelectDataset && onSelectDataset(e.target.value)}
                  className="text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Dashboard Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 font-medium px-2">View:</span>
              <select
                value={selectedDashId || currentDash?.id || ''}
                onChange={(e) => {
                  if (e.target.value === '__new__') handleCreateNewDashboard();
                  else if (e.target.value === '__demo__') handleCreateDemoDashboard();
                  else onSelectDashboard(e.target.value);
                }}
                className="text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {dashboards.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
                <option value="__new__">+ New Blank Dashboard</option>
                <option value="__demo__">⚡ Create Demo Dashboard</option>
              </select>
            </div>

            {/* View / Build Mode Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('view')}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1",
                  mode === 'view' ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 shadow-xs" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                View Mode
              </button>
              <button
                type="button"
                onClick={() => setMode('build')}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1",
                  mode === 'build' ? "bg-white dark:bg-zinc-950 text-blue-600 dark:text-blue-400 shadow-xs" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Build Mode
              </button>
            </div>

            {/* Add Widget Button */}
            {currentDash && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingWidget(null);
                  setIsWidgetModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Widget
              </Button>
            )}

            {/* Ask AI Button */}
            {currentDash && currentDash.widgets.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAiModalOpen(true)}
                className="text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Explain with AI
              </Button>
            )}

          </div>

        </div>

        {/* Dashboard Title & Quick Actions Row */}
        {currentDash && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="text-base font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveTitle} className="h-7 w-7 text-emerald-600">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)} className="h-7 w-7 text-zinc-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{currentDash.title}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    onClick={() => {
                      setTitleInput(currentDash.title);
                      setIsEditingTitle(true);
                    }}
                    title="Rename Dashboard"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicateDashboard}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                title="Duplicate Dashboard"
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Duplicate
              </Button>
              {dashboards.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteDashboard(currentDash.id)}
                  className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title="Delete Dashboard"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* GLOBAL FILTER BAR */}
      {currentDash && (
        <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-6 py-2.5 flex flex-col gap-2 shrink-0 transition-all">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Global Dashboard Filters
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 h-7 px-2.5 flex items-center gap-1"
              >
                <span>Filters ({currentDash.filters.length})</span>
                {isFiltersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>

            {currentDash.filters.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {currentDash.filters.length} Filter{currentDash.filters.length > 1 ? 's' : ''} Active
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="text-xs h-7 text-red-500 hover:text-red-600 font-medium px-2"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {isFiltersExpanded && (
            <div className="flex flex-wrap items-center gap-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              {categoricalCols.length === 0 ? (
                <span className="text-xs text-zinc-400 italic">No filterable columns in current dataset.</span>
              ) : (
                categoricalCols.slice(0, 6).map(col => {
                  const sourceRows = primaryDataset?.fullData || primaryDataset?.data || [];
                  const uniqueVals = Array.from(new Set(sourceRows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== ''))).slice(0, 40);
                  const activeFilter = currentDash.filters.find(f => f.column === col);

                  return (
                    <div key={col} className="flex items-center gap-1.5 min-w-[140px]">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                        {col}:
                      </label>
                      <select
                        value={activeFilter?.value ?? 'all'}
                        onChange={(e) => handleGlobalFilterChange(col, e.target.value)}
                        className={cn(
                          "text-xs border rounded-md px-2 py-1 font-medium transition-all focus:outline-none focus:ring-1 focus:ring-blue-500 w-full max-w-[120px]",
                          activeFilter 
                            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold" 
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
            </div>
          )}
        </div>
      )}

      {/* DATASET TARGET MISMATCH WARNING BANNER */}
      {currentDash && currentDash.datasetId && primaryDataset && currentDash.datasetId !== primaryDataset.id && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-6 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Dashboard configured for dataset <strong>{currentDash.datasetId}</strong> (Active: <strong>{primaryDataset.name}</strong>).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateDashboard(currentDash.id, { datasetId: primaryDataset.id, updatedAt: Date.now() })}
            className="text-xs bg-white dark:bg-zinc-900 border-amber-300 text-amber-900 dark:text-amber-200"
          >
            Adapt to Current Dataset
          </Button>
        </div>
      )}

      {/* DASHBOARD GRID CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {!currentDash || currentDash.widgets.length === 0 ? (
          
          /* EMPTY DASHBOARD STATE */
          <div className="max-w-xl mx-auto my-12 p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-950 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Build Your Dashboard</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Add KPI cards, charts, and tables to start analyzing your business metrics and trends.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => {
                  setEditingWidget(null);
                  setIsWidgetModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add First Widget
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateDemoDashboard}
                className="text-xs text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-blue-600" />
                Create Demo Dashboard
              </Button>
            </div>
          </div>

        ) : (

          /* WIDGETS RESPONSIVE GRID (12 COLUMNS) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
            {currentDash.widgets.map((widget, index) => {
              const span = widget.gridSpan || (widget.type === 'kpi' ? 1 : 2);
              // Map span: 1 => lg:col-span-3, 2 => lg:col-span-6, 3 => lg:col-span-9, 4 => lg:col-span-12
              const spanClass = span === 1 ? 'lg:col-span-3' : span === 2 ? 'lg:col-span-6' : span === 3 ? 'lg:col-span-9' : 'lg:col-span-12';
              const cardHeight = widget.type === 'kpi' ? 'h-40' : 'h-96';

              return (
                <div
                  key={widget.id}
                  className={cn(
                    "bg-white dark:bg-zinc-950 border rounded-2xl shadow-xs p-5 flex flex-col justify-between group relative transition-all",
                    mode === 'build' ? "border-blue-200 dark:border-blue-900/60 ring-1 ring-blue-500/10" : "border-zinc-200 dark:border-zinc-800",
                    spanClass,
                    cardHeight
                  )}
                >
                  {/* Widget Header Bar */}
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <div className="truncate pr-2">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {widget.title}
                      </h3>
                      {widget.subtitle && (
                        <p className="text-[11px] text-zinc-400 truncate">{widget.subtitle}</p>
                      )}
                    </div>

                    {/* BUILD MODE EDIT CONTROLS */}
                    {mode === 'build' ? (
                      <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 opacity-90 group-hover:opacity-100 transition-opacity">
                        
                        {/* Width Span Selector */}
                        <select
                          value={span}
                          onChange={(e) => handleResizeWidget(widget.id, Number(e.target.value))}
                          className="text-[10px] bg-transparent text-zinc-600 dark:text-zinc-300 font-mono focus:outline-none"
                          title="Change Width Span"
                        >
                          <option value={1}>1/4</option>
                          <option value={2}>1/2</option>
                          <option value={3}>3/4</option>
                          <option value={4}>Full</option>
                        </select>

                        {/* Move Up/Down */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-400 hover:text-zinc-800"
                          disabled={index === 0}
                          onClick={() => handleMoveWidget(index, 'up')}
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-400 hover:text-zinc-800"
                          disabled={index === currentDash.widgets.length - 1}
                          onClick={() => handleMoveWidget(index, 'down')}
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>

                        {/* Edit Widget */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-500 hover:text-blue-600"
                          onClick={() => {
                            setEditingWidget(widget);
                            setIsWidgetModalOpen(true);
                          }}
                          title="Edit Widget"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>

                        {/* Duplicate Widget */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-500 hover:text-blue-600"
                          onClick={() => handleDuplicateWidget(widget)}
                          title="Duplicate Widget"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>

                        {/* Delete Widget */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-zinc-400 hover:text-red-500"
                          onClick={() => handleDeleteWidget(widget.id)}
                          title="Delete Widget"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      /* VIEW MODE: Quick hover options */
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                          onClick={() => {
                            setEditingWidget(widget);
                            setIsWidgetModalOpen(true);
                          }}
                          title="Edit Widget"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Widget Body */}
                  <div className="flex-1 min-h-0">
                    <WidgetRenderer
                      widget={widget}
                      datasets={datasets}
                      relationships={relationships}
                      filters={currentDash.filters}
                      savedKpis={savedKpis}
                      onDataPointClick={handleCrossFilterClick}
                      onUpdateWidget={(updatedConfig) => handleUpdateWidget(widget.id, updatedConfig)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

        )}
      </div>

      {/* WIDGET BUILDER MODAL */}
      <WidgetBuilderModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        onSave={handleSaveWidget}
        datasets={datasets}
        savedKpis={savedKpis}
        activeDatasetId={primaryDataset?.id || ''}
        initialWidget={editingWidget}
      />

      {/* AI DASHBOARD EXPLANATION MODAL */}
      {currentDash && (
        <AiDashboardModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          dashboard={currentDash}
          datasets={datasets}
          savedKpis={savedKpis}
        />
      )}

    </div>
  );
}
