import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Dashboard, 
  Dataset, 
  RelationshipSuggestion, 
  DashboardFilter, 
  DashboardCrossFilter, 
  WidgetConfig, 
  WidgetType,
  KpiDefinition, 
  WidgetLayout, 
  WidgetDrillState, 
  DrillThroughModalState,
  DashboardSavedView,
  DashboardViewState
} from '@/types';
import { WidgetRenderer } from './WidgetRenderer';
import { WidgetBuilderModal } from './WidgetBuilderModal';
import { AiDashboardModal } from './AiDashboardModal';
import { GlobalFilterBar } from './GlobalFilterBar';
import { DrillThroughModal } from './DrillThroughModal';
import { SaveViewDialog } from './SaveViewDialog';
import { SavedViewsPanel } from './SavedViewsPanel';
import { ExportDialog } from './ExportDialog';
import { ShareDialog } from './ShareDialog';
import { PresentationMode } from './PresentationMode';
import { PresentationSequenceModal } from './PresentationSequenceModal';
import { generateDemoDashboard, generateAiDashboard } from '@/lib/dashboardStorage';
import { getSavedKpis } from '@/lib/kpiStorage';
import { getValidLayout, compactLayout, findFirstAvailablePosition, getMinDimensions } from '@/lib/dashboardLayout';
import { applyDashboardFilters } from '@/lib/dashboardFiltering';
import { applyCrossFilters } from '@/lib/dashboardCrossFiltering';
import { 
  createDashboardSnapshot, 
  validateDashboardSnapshot, 
  areDashboardStatesEqual, 
  createSavedView, 
  duplicateSavedView 
} from '@/lib/dashboardBookmarks';
import { 
  LayoutDashboard, Plus, Trash2, Edit3, Settings, Filter, FileText, Check, X, 
  Eye, Edit2, Copy, Sparkles, Layers, ArrowUp, ArrowDown, Move, AlertCircle, Save, Calendar, RefreshCw,
  ChevronDown, ChevronUp, GripVertical, Maximize2, Grid, Bookmark, Star, EyeOff, CheckCircle2, RotateCcw,
  Play, Share2, Activity, BarChart2, TrendingUp, PieChart as PieChartIcon, Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDatasetStore } from '@/lib/datasetStore';

interface DashboardViewProps {
  dashboards: Dashboard[];
  datasets?: Dataset[];
  relationships?: RelationshipSuggestion[];
  selectedDashId: string | null;
  selectedDatasetId?: string | null;
  onSelectDataset?: (id: string) => void;
  onSelectDashboard: (id: string | null) => void;
  onUpdateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  onDeleteDashboard: (id: string) => void;
  pendingKpiToAdd?: KpiDefinition | null;
  onClearPendingKpi?: () => void;
}

export function DashboardView({
  dashboards,
  relationships = [],
  selectedDashId,
  onSelectDashboard,
  onUpdateDashboard,
  onDeleteDashboard,
  pendingKpiToAdd,
  onClearPendingKpi
}: DashboardViewProps) {
  const { currentDataset: selectedDataset, allDatasets: datasets, setSelectedDatasetId: onSelectDataset } = useDatasetStore();
  const selectedDatasetId = selectedDataset?.id || null;
  // Mode: 'view' (clean presentation) vs 'build' (editing, drag, resize)
  const [mode, setMode] = useState<'view' | 'build'>('view');
  
  // Modals & UI States
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [selectedWidgetTypeToAdd, setSelectedWidgetTypeToAdd] = useState<WidgetType | undefined>(undefined);
  
  const widgetMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetMenuRef.current && !widgetMenuRef.current.contains(event.target as Node)) {
        setIsWidgetMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Selected Dashboard fallback
  const currentDash = dashboards.find(d => d.id === selectedDashId) || dashboards[0] || null;


  useEffect(() => {
    if (pendingKpiToAdd && currentDash && onUpdateDashboard) {
      const validPlaced = currentDash.widgets.map((w, i) => getValidLayout(w, i, 12));
      const defaultW = 3; // For KPI type
      const defaultH = 2; // For KPI type
      const pos = findFirstAvailablePosition(validPlaced, defaultW, defaultH, 12);
      const newWidgetWithLayout: WidgetConfig = {
        id: `w-${Date.now()}`,
        type: 'kpi',
        title: pendingKpiToAdd.name,
        datasetId: pendingKpiToAdd.datasetId,
        kpiId: pendingKpiToAdd.id,
        layout: { x: pos.x, y: pos.y, w: defaultW, h: defaultH }
      };
      const updatedWidgets = [...currentDash.widgets, newWidgetWithLayout];
      
      onUpdateDashboard(currentDash.id, { widgets: updatedWidgets, updatedAt: Date.now() });
      onClearPendingKpi?.();
    }
  }, [pendingKpiToAdd, currentDash, onUpdateDashboard, onClearPendingKpi]);

  // Phase 7C: Centralized Visual Cross-Filters State (temporary analytical interaction state)
  const [activeCrossFilters, setActiveCrossFilters] = useState<DashboardCrossFilter[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [showFilterBar, setShowFilterBar] = useState(true);
  const [savedKpis, setSavedKpis] = useState<KpiDefinition[]>([]);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Phase 7D: Hierarchical Drill-Down State per Widget
  const [widgetDrillStates, setWidgetDrillStates] = useState<Record<string, WidgetDrillState>>({});
  const [drillThroughModal, setDrillThroughModal] = useState<DrillThroughModalState | null>(null);

  // Phase 7E: Dashboard Bookmarks, Saved Views & View State Management
  const [runtimeFilters, setRuntimeFilters] = useState<DashboardFilter[]>([]);
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({});
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [isSavedViewsPanelOpen, setIsSavedViewsPanelOpen] = useState(false);
  const [isSaveViewDialogOpen, setIsSaveViewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isSequenceModalOpen, setIsSequenceModalOpen] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'create' | 'update' | 'save_as'>('create');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize or restore default view when dashboard changes
  useEffect(() => {
    if (!currentDash) return;

    // Check for default view in savedViews
    const defaultView = (currentDash.savedViews || []).find(
      v => v.id === currentDash.defaultViewId || v.isDefault
    );

    if (defaultView) {
      const validation = validateDashboardSnapshot(defaultView.state, currentDash, datasets);
      setRuntimeFilters(validation.state.globalFilters || []);
      setActiveCrossFilters(validation.state.crossFilters || []);
      setWidgetDrillStates(validation.state.drillStates || {});
      setWidgetVisibility(validation.state.widgetVisibility || {});
      setActiveSavedViewId(defaultView.id);
    } else {
      setRuntimeFilters(currentDash.filters || []);
      setActiveCrossFilters([]);
      setWidgetDrillStates({});
      setWidgetVisibility({});
      setActiveSavedViewId(null);
    }
  }, [selectedDashId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDrillStateChange = (widgetId: string, newState: WidgetDrillState) => {
    setWidgetDrillStates(prev => ({
      ...prev,
      [widgetId]: newState
    }));
  };

  // Keyboard shortcut: Press Escape to clear visual cross-filter selections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeCrossFilters.length > 0) {
        setActiveCrossFilters([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCrossFilters.length]);

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

  // 1. Derive globally filtered datasets (Global Dashboard Filters using runtimeFilters)
  const globallyFilteredDatasets = useMemo(() => {
    if (!runtimeFilters || runtimeFilters.length === 0) return datasets;

    return datasets.map(dataset => {
      const validFilters = runtimeFilters.filter(f => dataset.headers.includes(f.column));
      if (validFilters.length === 0) return dataset;

      const filteredFullData = applyDashboardFilters(dataset.fullData, validFilters, dataset);
      const filteredPreviewData = filteredFullData.slice(0, 100);

      return {
        ...dataset,
        fullData: filteredFullData,
        data: filteredPreviewData,
        rowCount: filteredFullData.length
      };
    });
  }, [datasets, runtimeFilters]);

  // 2. Derive fully filtered datasets (Global Filters + ALL Cross-Filters) for general summary and KPIs
  const fullyFilteredDatasets = useMemo(() => {
    if (!activeCrossFilters || activeCrossFilters.length === 0) return globallyFilteredDatasets;

    return globallyFilteredDatasets.map(dataset => {
      const validCrossFilters = activeCrossFilters.filter(cf => dataset.headers.includes(cf.column));
      if (validCrossFilters.length === 0) return dataset;

      const crossFilteredFullData = applyCrossFilters(dataset.fullData, validCrossFilters, dataset);
      const crossFilteredPreviewData = crossFilteredFullData.slice(0, 100);

      return {
        ...dataset,
        fullData: crossFilteredFullData,
        data: crossFilteredPreviewData,
        rowCount: crossFilteredFullData.length
      };
    });
  }, [globallyFilteredDatasets, activeCrossFilters]);

  // 3. Power BI Self-Highlighting Context: Visual source retains all options while other visuals recompute
  const getDatasetsForWidget = useMemo(() => {
    return (widgetId: string): Dataset[] => {
      if (activeCrossFilters.length === 0) return globallyFilteredDatasets;

      // Filter out cross filters originated by this specific widget so it doesn't collapse its own categories
      const otherCrossFilters = activeCrossFilters.filter(cf => cf.widgetId !== widgetId);
      if (otherCrossFilters.length === 0) return globallyFilteredDatasets;

      return globallyFilteredDatasets.map(dataset => {
        const validCrossFilters = otherCrossFilters.filter(cf => dataset.headers.includes(cf.column));
        if (validCrossFilters.length === 0) return dataset;

        const filtered = applyCrossFilters(dataset.fullData, validCrossFilters, dataset);
        return {
          ...dataset,
          fullData: filtered,
          data: filtered.slice(0, 100),
          rowCount: filtered.length
        };
      });
    };
  }, [globallyFilteredDatasets, activeCrossFilters]);

  const filteredPrimaryDataset = primaryDataset 
    ? fullyFilteredDatasets.find(d => d.id === primaryDataset.id) || primaryDataset 
    : undefined;

  // Current Analytical State Snapshot for Unsaved State Detection
  const currentRuntimeSnapshot = useMemo(() => {
    return createDashboardSnapshot({
      globalFilters: runtimeFilters,
      crossFilters: activeCrossFilters,
      drillStates: widgetDrillStates,
      widgetVisibility
    });
  }, [runtimeFilters, activeCrossFilters, widgetDrillStates, widgetVisibility]);

  const activeSavedView = useMemo(() => {
    if (!currentDash || !currentDash.savedViews || !activeSavedViewId) return null;
    return currentDash.savedViews.find(v => v.id === activeSavedViewId) || null;
  }, [currentDash?.savedViews, activeSavedViewId]);

  const hasUnsavedChanges = useMemo(() => {
    if (!activeSavedView) return false;
    return !areDashboardStatesEqual(activeSavedView.state, currentRuntimeSnapshot);
  }, [activeSavedView, currentRuntimeSnapshot]);

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

  // Phase 7E Handlers: Save, Load, Update, Delete, Set Default Views
  const handleSaveView = (
    name: string,
    description: string,
    options: { isDefault: boolean; overwriteId?: string; includeLayout: boolean }
  ) => {
    if (!currentDash) return;

    let updatedViews = [...(currentDash.savedViews || [])];
    let targetViewId = options.overwriteId;

    if (targetViewId) {
      // Overwrite existing view
      updatedViews = updatedViews.map(v => {
        if (v.id === targetViewId) {
          return {
            ...v,
            name,
            description: description || undefined,
            isDefault: options.isDefault,
            updatedAt: Date.now(),
            state: currentRuntimeSnapshot
          };
        }
        return options.isDefault ? { ...v, isDefault: false } : v;
      });
    } else {
      // Create new view
      const newView = createSavedView(name, description, currentRuntimeSnapshot, options.isDefault);
      targetViewId = newView.id;
      if (options.isDefault) {
        updatedViews = updatedViews.map(v => ({ ...v, isDefault: false }));
      }
      updatedViews.push(newView);
    }

    const newDefaultId = options.isDefault 
      ? targetViewId 
      : (currentDash.defaultViewId === targetViewId && !options.isDefault ? undefined : currentDash.defaultViewId);

    onUpdateDashboard(currentDash.id, {
      savedViews: updatedViews,
      defaultViewId: newDefaultId,
      updatedAt: Date.now()
    });

    setActiveSavedViewId(targetViewId);
    showToast(`Saved view "${name}"`);
  };

  const handleQuickUpdateActiveView = () => {
    if (!currentDash || !activeSavedView) return;

    const updatedViews = (currentDash.savedViews || []).map(v => {
      if (v.id === activeSavedView.id) {
        return {
          ...v,
          updatedAt: Date.now(),
          state: currentRuntimeSnapshot
        };
      }
      return v;
    });

    onUpdateDashboard(currentDash.id, {
      savedViews: updatedViews,
      updatedAt: Date.now()
    });

    showToast(`Updated "${activeSavedView.name}" with current state`);
  };

  const handleLoadView = (view: DashboardSavedView) => {
    const validation = validateDashboardSnapshot(view.state, currentDash, datasets);
    setRuntimeFilters(validation.state.globalFilters || []);
    setActiveCrossFilters(validation.state.crossFilters || []);
    setWidgetDrillStates(validation.state.drillStates || {});
    setWidgetVisibility(validation.state.widgetVisibility || {});
    setActiveSavedViewId(view.id);
    showToast(`Applied view: "${view.name}"`);
  };

  const handleDiscardChanges = () => {
    if (!activeSavedView) return;
    handleLoadView(activeSavedView);
    showToast(`Reverted changes to "${activeSavedView.name}"`);
  };

  const handleRenameView = (viewId: string, newName: string) => {
    if (!currentDash) return;
    const updated = (currentDash.savedViews || []).map(v => 
      v.id === viewId ? { ...v, name: newName, updatedAt: Date.now() } : v
    );
    onUpdateDashboard(currentDash.id, { savedViews: updated, updatedAt: Date.now() });
    showToast(`Renamed view to "${newName}"`);
  };

  const handleDuplicateView = (view: DashboardSavedView) => {
    if (!currentDash) return;
    const dup = duplicateSavedView(view);
    const updated = [...(currentDash.savedViews || []), dup];
    onUpdateDashboard(currentDash.id, { savedViews: updated, updatedAt: Date.now() });
    showToast(`Duplicated view "${view.name}"`);
  };

  const handleDeleteView = (viewId: string) => {
    if (!currentDash) return;
    const target = (currentDash.savedViews || []).find(v => v.id === viewId);
    const updated = (currentDash.savedViews || []).filter(v => v.id !== viewId);
    const newDefault = currentDash.defaultViewId === viewId ? undefined : currentDash.defaultViewId;
    if (activeSavedViewId === viewId) {
      setActiveSavedViewId(null);
    }
    onUpdateDashboard(currentDash.id, {
      savedViews: updated,
      defaultViewId: newDefault,
      updatedAt: Date.now()
    });
    showToast(`Deleted view "${target?.name || 'View'}"`);
  };

  const handleSetDefaultView = (viewId: string) => {
    if (!currentDash) return;
    const updated = (currentDash.savedViews || []).map(v => ({
      ...v,
      isDefault: v.id === viewId
    }));
    onUpdateDashboard(currentDash.id, {
      savedViews: updated,
      defaultViewId: viewId,
      updatedAt: Date.now()
    });
    showToast(`Set as default landing view`);
  };

  const handleRemoveDefaultView = (viewId: string) => {
    if (!currentDash) return;
    const updated = (currentDash.savedViews || []).map(v => 
      v.id === viewId ? { ...v, isDefault: false } : v
    );
    onUpdateDashboard(currentDash.id, {
      savedViews: updated,
      defaultViewId: undefined,
      updatedAt: Date.now()
    });
    showToast(`Removed default view`);
  };

  // Visible widgets taking widgetVisibility into account
  const visibleWidgets = useMemo(() => {
    if (!currentDash) return [];
    return currentDash.widgets.filter(w => widgetVisibility[w.id] !== false);
  }, [currentDash?.widgets, widgetVisibility]);

  const hiddenWidgetsCount = useMemo(() => {
    if (!currentDash) return 0;
    return currentDash.widgets.filter(w => widgetVisibility[w.id] === false).length;
  }, [currentDash?.widgets, widgetVisibility]);

  const handleUnhideAllWidgets = () => {
    setWidgetVisibility({});
    showToast('All visuals unhidden');
  };

  // 1. Create Blank Dashboard
  const handleCreateNewDashboard = () => {
    const newId = `dash-${Date.now()}`;
    const newDash: Dashboard = {
      id: newId,
      title: 'Blank Dashboard',
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

  // 2b. Create AI Dashboard
  const handleCreateAiDashboard = () => {
    if (!primaryDataset) return;
    const aiDash = generateAiDashboard(primaryDataset, savedKpis);
    onUpdateDashboard(aiDash.id, aiDash);
    onSelectDashboard(aiDash.id);
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
      const validPlaced = currentDash.widgets.map((w, i) => getValidLayout(w, i, 12));
      const defaultW = widget.type === 'kpi' ? 3 : (widget.gridSpan ? widget.gridSpan * 3 : 6);
      const defaultH = widget.type === 'kpi' ? 2 : 4;
      const pos = findFirstAvailablePosition(validPlaced, defaultW, defaultH, 12);
      const newWidgetWithLayout: WidgetConfig = {
        ...widget,
        layout: widget.layout || { x: pos.x, y: pos.y, w: defaultW, h: defaultH }
      };
      updatedWidgets = [...currentDash.widgets, newWidgetWithLayout];
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
    const validPlaced = currentDash.widgets.map((w, i) => getValidLayout(w, i, 12));
    const currentL = getValidLayout(widget, 0, 12);
    const pos = findFirstAvailablePosition(validPlaced, currentL.w, currentL.h, 12);
    const cloned: WidgetConfig = {
      ...widget,
      id: `w-${Date.now()}`,
      title: `${widget.title} (Copy)`,
      layout: { x: pos.x, y: pos.y, w: currentL.w, h: currentL.h }
    };
    const updated = [...currentDash.widgets, cloned];
    onUpdateDashboard(currentDash.id, { widgets: updated, updatedAt: Date.now() });
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
    const targetW = Math.min(12, gridSpan * 3);
    const updated = currentDash.widgets.map(w => {
      if (w.id === widgetId) {
        const curL = getValidLayout(w, 0, 12);
        const newL = { ...curL, w: targetW, x: Math.min(12 - targetW, curL.x) };
        return { ...w, gridSpan, layout: newL };
      }
      return w;
    });
    onUpdateDashboard(currentDash.id, { widgets: updated, updatedAt: Date.now() });
  };

  // Canvas & Grid Container Ref
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Selected Widget State
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  // Pointer Drag State
  const [dragState, setDragState] = useState<{
    widgetId: string;
    startX: number;
    startY: number;
    startLayout: WidgetLayout;
    currentLayout: WidgetLayout;
  } | null>(null);

  // Pointer Resize State
  const [resizeState, setResizeState] = useState<{
    widgetId: string;
    handle: 'se' | 'e' | 's' | 'ne' | 'sw';
    startX: number;
    startY: number;
    startLayout: WidgetLayout;
    currentLayout: WidgetLayout;
  } | null>(null);

  const cardPointerDownRef = useRef<{
    widgetId: string;
    startX: number;
    startY: number;
    startLayout: WidgetLayout;
    pointerId: number;
    element: HTMLElement;
  } | null>(null);

  const isDraggingCardRef = useRef<boolean>(false);

  // Helper to measure cell dimensions
  const getCellDimensions = () => {
    if (!gridContainerRef.current) return { cellW: 90, cellH: 106 };
    const rect = gridContainerRef.current.getBoundingClientRect();
    const padding = 32; // p-4 padding on both sides
    const availableW = rect.width - padding;
    const cellW = (availableW + 16) / 12;
    const cellH = 90 + 16;
    return { cellW: Math.max(20, cellW), cellH: 106 };
  };

  // Compute active real-time layouts across all widgets without upward compaction
  const activeLayouts = useMemo(() => {
    if (!currentDash || !currentDash.widgets) return [];
    let baseWidgets = currentDash.widgets;

    if (dragState) {
      return baseWidgets.map((w, idx) => ({
        id: w.id,
        layout: w.id === dragState.widgetId ? dragState.currentLayout : getValidLayout(w, idx, 12)
      }));
    }

    if (resizeState) {
      return baseWidgets.map((w, idx) => ({
        id: w.id,
        layout: w.id === resizeState.widgetId ? resizeState.currentLayout : getValidLayout(w, idx, 12)
      }));
    }

    return baseWidgets.map((w, idx) => ({
      id: w.id,
      layout: getValidLayout(w, idx, 12)
    }));
  }, [currentDash?.widgets, dragState, resizeState]);

  // Pointer Drag Event Handlers for Grab & Move
  const handleCardPointerDown = (e: React.PointerEvent, widget: WidgetConfig, layout: WidgetLayout) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('button, select, input, textarea, a, [role="button"], .no-drag, .resize-handle')) {
      return;
    }

    setSelectedWidgetId(widget.id);

    cardPointerDownRef.current = {
      widgetId: widget.id,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...layout },
      pointerId: e.pointerId,
      element: e.currentTarget as HTMLElement
    };
    isDraggingCardRef.current = false;
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    if (resizeState) {
      handleResizeMove(e);
      return;
    }

    if (cardPointerDownRef.current) {
      const { startX, startY, startLayout, widgetId, pointerId, element } = cardPointerDownRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (!isDraggingCardRef.current && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        isDraggingCardRef.current = true;
        try {
          element.setPointerCapture(pointerId);
        } catch (_) {}

        setDragState({
          widgetId,
          startX,
          startY,
          startLayout,
          currentLayout: { ...startLayout }
        });
      }

      if (isDraggingCardRef.current) {
        const { cellW, cellH } = getCellDimensions();
        const gridDeltaX = Math.round(deltaX / cellW);
        const gridDeltaY = Math.round(deltaY / cellH);

        const newX = Math.max(0, Math.min(12 - startLayout.w, startLayout.x + gridDeltaX));
        const newY = Math.max(0, startLayout.y + gridDeltaY);

        setDragState(prev => prev ? {
          ...prev,
          currentLayout: {
            ...prev.currentLayout,
            x: newX,
            y: newY
          }
        } : null);
      }
    }
  };

  const handleCardPointerUp = (e: React.PointerEvent) => {
    if (resizeState) {
      handleResizeEnd(e);
      return;
    }

    if (cardPointerDownRef.current) {
      const { pointerId, element } = cardPointerDownRef.current;
      try {
        if (element.hasPointerCapture(pointerId)) {
          element.releasePointerCapture(pointerId);
        }
      } catch (_) {}

      if (isDraggingCardRef.current && dragState && currentDash) {
        const updatedWidgets = currentDash.widgets.map(w => {
          if (w.id === dragState.widgetId) {
            return { ...w, layout: dragState.currentLayout };
          }
          return w;
        });

        onUpdateDashboard(currentDash.id, { widgets: updatedWidgets, updatedAt: Date.now() });
        triggerSaveToast();
      }

      setDragState(null);
      cardPointerDownRef.current = null;
      isDraggingCardRef.current = false;
    }
  };

  // Pointer Resize Event Handlers
  const handleResizeStart = (e: React.PointerEvent, widget: WidgetConfig, layout: WidgetLayout, handle: 'se' | 'e' | 's' | 'ne' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedWidgetId(widget.id);

    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (_) {}

    setResizeState({
      widgetId: widget.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...layout },
      currentLayout: { ...layout }
    });
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeState) return;
    const { cellW, cellH } = getCellDimensions();
    const deltaX = e.clientX - resizeState.startX;
    const deltaY = e.clientY - resizeState.startY;

    const gridDeltaX = Math.round(deltaX / cellW);
    const gridDeltaY = Math.round(deltaY / cellH);

    const targetWidget = currentDash?.widgets.find(w => w.id === resizeState.widgetId);
    const minDim = getMinDimensions(targetWidget?.type || 'chart');

    let newW = resizeState.startLayout.w;
    let newH = resizeState.startLayout.h;

    if (resizeState.handle === 'se' || resizeState.handle === 'e' || resizeState.handle === 'ne') {
      newW = Math.max(minDim.minW, Math.min(12 - resizeState.startLayout.x, resizeState.startLayout.w + gridDeltaX));
    }
    if (resizeState.handle === 'se' || resizeState.handle === 's' || resizeState.handle === 'sw') {
      newH = Math.max(minDim.minH, resizeState.startLayout.h + gridDeltaY);
    }

    if (newW !== resizeState.currentLayout.w || newH !== resizeState.currentLayout.h) {
      setResizeState(prev => prev ? {
        ...prev,
        currentLayout: {
          ...prev.currentLayout,
          w: newW,
          h: newH
        }
      } : null);
    }
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!resizeState || !currentDash) return;

    try {
      const target = e.currentTarget as HTMLElement;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    const updatedWidgets = currentDash.widgets.map(w => {
      if (w.id === resizeState.widgetId) {
        return {
          ...w,
          gridSpan: Math.ceil(resizeState.currentLayout.w / 3) as any,
          layout: resizeState.currentLayout
        };
      }
      return w;
    });

    onUpdateDashboard(currentDash.id, { widgets: updatedWidgets, updatedAt: Date.now() });
    setResizeState(null);
    triggerSaveToast();
  };

  const handleUpdateWidget = (widgetId: string, updatedConfig: Partial<any>) => {
    if (!currentDash) return;
    const updated = currentDash.widgets.map(w => w.id === widgetId ? { ...w, ...updatedConfig } : w);
    onUpdateDashboard(currentDash.id, { widgets: updated, updatedAt: Date.now() });
  };

  // 10. Global Filter Changes (Phase 7B)
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

  // 11. Visual Cross-Filtering Click Event (Phase 7C: Temporary Interaction State)
  const handleCrossFilterClick = (
    widgetId: string,
    column: string,
    value: string | number | boolean | null,
    options?: {
      operator?: 'equals' | 'in' | 'between' | 'date_period';
      dateGranularity?: 'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year';
      label?: string;
    }
  ) => {
    if (!column || value === undefined || value === null) return;

    setActiveCrossFilters(prev => {
      const existingIndex = prev.findIndex(cf => cf.widgetId === widgetId && cf.column === column);

      // If user clicks the exact same single value on the same widget, toggle off
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const isSameValue = existing.values.length === 1 && String(existing.values[0]) === String(value);
        if (isSameValue) {
          return prev.filter((_, idx) => idx !== existingIndex);
        }

        // Replace value for this widget & column
        const updated = [...prev];
        updated[existingIndex] = {
          widgetId,
          column,
          operator: options?.operator || 'equals',
          values: [value],
          dateGranularity: options?.dateGranularity,
          label: options?.label || `${column}: ${value}`
        };
        return updated;
      }

      // Add new cross-filter
      const newCrossFilter: DashboardCrossFilter = {
        widgetId,
        column,
        operator: options?.operator || 'equals',
        values: [value],
        dateGranularity: options?.dateGranularity,
        label: options?.label || `${column}: ${value}`
      };
      return [...prev, newCrossFilter];
    });
  };

  // Remove specific cross-filter
  const handleRemoveCrossFilter = (widgetId: string, column: string) => {
    setActiveCrossFilters(prev => prev.filter(cf => !(cf.widgetId === widgetId && cf.column === column)));
  };

  // Clear cross-filters for a specific widget
  const handleClearWidgetCrossFilter = (widgetId: string) => {
    setActiveCrossFilters(prev => prev.filter(cf => cf.widgetId !== widgetId));
  };

  // Clear all temporary visual cross-filters
  const handleClearAllCrossFilters = () => {
    setActiveCrossFilters([]);
  };

  // Clear All Global Dashboard Filters
  const handleClearAllGlobalFilters = () => {
    if (!currentDash) return;
    onUpdateDashboard(currentDash.id, { filters: [], updatedAt: Date.now() });
  };

  // Categorical & Date columns for Filter Bar
  const categoricalCols = primaryDataset ? Object.entries(primaryDataset.columnProfiles)
    .filter(([_, prof]) => prof.type === 'categorical' || prof.type === 'boolean' || prof.type === 'date' || prof.uniqueCount <= 30)
    .map(([col]) => col) : [];

  return (
    <div className="flex-1 flex flex-col bg-transparent pb-20">
      
      {/* PAGE HEADER */}
      <div className="glass-panel border-b-0 p-4 sm:p-6 shrink-0 space-y-4 shadow-sm z-10">
        
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

            {/* Saved Views & Bookmarks Button (Phase 7E) */}
            {currentDash && (
              <div className="flex items-center gap-1">
                {/* Executive Presentation Mode (Phase 7G) */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsPresentationOpen(true)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 h-8 transition-all shadow-xs"
                  title="Enter Executive Presentation Mode"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Present</span>
                </Button>

                {/* Export & Print */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportDialogOpen(true)}
                  className="text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 h-8 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  title="Export / Print Dashboard"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Export</span>
                </Button>

                {/* Share View */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShareDialogOpen(true)}
                  className="text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 h-8 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  title="Share Direct View Link"
                >
                  <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Share</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSavedViewsPanelOpen(true)}
                  className={cn(
                    "text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 h-8 transition-all",
                    activeSavedView 
                      ? "border-blue-300 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold" 
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                  title="Saved Views & Analytical Bookmarks"
                >
                  <Bookmark className={cn("w-3.5 h-3.5", activeSavedView ? "fill-blue-600 text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
                  <span>
                    {activeSavedView ? (
                      <span className="flex items-center gap-1 max-w-[140px] truncate">
                        <span>{activeSavedView.name}</span>
                        {hasUnsavedChanges && <span className="text-amber-500 font-bold" title="Modified analytical state">*</span>}
                      </span>
                    ) : (
                      'Saved Views'
                    )}
                  </span>
                  {(currentDash.savedViews || []).length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {(currentDash.savedViews || []).length}
                    </span>
                  )}
                </Button>

                {/* Quick Save Snapshot Action */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSaveDialogMode(activeSavedView && hasUnsavedChanges ? 'update' : 'create');
                    setIsSaveViewDialogOpen(true);
                  }}
                  className="h-8 w-8 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-zinc-200 dark:border-zinc-800"
                  title="Save Current State as Bookmark"
                >
                  <Save className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Add Widget Button */}
            {currentDash && (
              <div className="relative" ref={widgetMenuRef}>
                <Button
                  size="sm"
                  onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 h-8"
                >
                  <Plus className="w-4 h-4" />
                  Add Widget
                </Button>
                
                {isWidgetMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-1">
                      {[
                        { type: 'kpi', label: 'KPI', icon: Activity },
                        { type: 'bar', label: 'Bar Chart', icon: BarChart2 },
                        { type: 'line', label: 'Line Chart', icon: TrendingUp },
                        { type: 'area', label: 'Area Chart', icon: Layers },
                        { type: 'donut', label: 'Pie / Donut Chart', icon: PieChartIcon },
                        { type: 'table', label: 'Table', icon: TableIcon },
                        { type: 'text', label: 'Text', icon: FileText },
                        { type: 'filter', label: 'Filter', icon: Filter },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.type}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 rounded-md transition-colors text-zinc-700 dark:text-zinc-300"
                            onClick={() => {
                              setSelectedWidgetTypeToAdd(item.type as WidgetType);
                              setEditingWidget(null);
                              setIsWidgetMenuOpen(false);
                              setIsWidgetModalOpen(true);
                            }}
                          >
                            <Icon className="w-4 h-4 text-zinc-500" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ask AI Button */}
            {currentDash && currentDash.widgets.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAiModalOpen(true)}
                className="text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-1.5 h-8"
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

      </div>      {/* GLOBAL FILTER BAR */}
      {currentDash && showFilterBar && (
        <div className="px-6 py-2">
          <GlobalFilterBar
            filters={runtimeFilters}
            crossFilters={activeCrossFilters}
            dataset={primaryDataset}
            filteredCount={filteredPrimaryDataset?.rowCount}
            totalCount={primaryDataset?.rowCount}
            onUpdateFilters={(newFilters) => {
              setRuntimeFilters(newFilters);
            }}
            onRemoveCrossFilter={handleRemoveCrossFilter}
            onClearAllCrossFilters={handleClearAllCrossFilters}
          />
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

      {/* HIDDEN WIDGETS BANNER (Phase 7E) */}
      {currentDash && hiddenWidgetsCount > 0 && (
        <div className="mx-6 my-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>
              <strong>{hiddenWidgetsCount}</strong> visual{hiddenWidgetsCount > 1 ? 's are' : ' is'} hidden in this active view.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleUnhideAllWidgets}
            className="text-xs h-6 px-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold"
          >
            Unhide All
          </Button>
        </div>
      )}

      {/* BUILD MODE ACTIVE CANVAS ACCENT BANNER */}
      {currentDash && mode === 'build' && (
        <div className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 border-b border-blue-550/20 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0 select-none shadow-3xs animate-fade-in">
          <div className="flex items-center gap-2.5 text-blue-800 dark:text-blue-300">
            <Settings className="w-4 h-4 text-blue-500 animate-spin-slow shrink-0" />
            <span className="font-bold">
              Dashboard Builder Active: drag-to-resize, duplicate, reorder, or edit widgets dynamically. Click data points to cross-filter.
            </span>
          </div>
          <span className="text-[10px] bg-blue-500/15 border border-blue-500/20 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest font-mono">
            Drafting Mode
          </span>
        </div>
      )}

      {/* DASHBOARD GRID CONTENT */}
      <div className="p-4 sm:p-6">
        {!currentDash ? (
          /* EMPTY WORKSPACE STATE */
          <div id="empty-workspace-state" className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-md text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Build Your Dashboard</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto font-medium">
                Create a dashboard from your validated dataset.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Button
                id="btn-create-yourself"
                onClick={handleCreateNewDashboard}
                className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs w-full sm:w-auto font-bold px-4"
              >
                <Plus className="w-4 h-4 mr-1.5 shrink-0" />
                Create Yourself
              </Button>
              <Button
                id="btn-create-with-ai"
                onClick={handleCreateAiDashboard}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs w-full sm:w-auto font-bold px-4"
              >
                <Sparkles className="w-4 h-4 mr-1.5 shrink-0" />
                Create with AI
              </Button>
            </div>
          </div>
        ) : currentDash.widgets.length === 0 ? (
          /* EMPTY DASHBOARD CANVAS */
          <div className="max-w-4xl mx-auto border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-2">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Empty Dashboard Canvas</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Add widgets to start building your analytics view.
              </p>
            </div>
            <div className="relative" ref={widgetMenuRef}>
              <Button
                onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 h-9 shadow-sm flex items-center gap-1.5 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add Widget
              </Button>

              {isWidgetMenuOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 text-left">
                  <div className="p-1">
                    {[
                      { type: 'kpi', label: 'KPI', icon: Activity },
                      { type: 'bar', label: 'Bar Chart', icon: BarChart2 },
                      { type: 'line', label: 'Line Chart', icon: TrendingUp },
                      { type: 'area', label: 'Area Chart', icon: Layers },
                      { type: 'donut', label: 'Pie / Donut Chart', icon: PieChartIcon },
                      { type: 'table', label: 'Table', icon: TableIcon },
                      { type: 'text', label: 'Text', icon: FileText },
                      { type: 'filter', label: 'Filter', icon: Filter },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          className="w-full text-left px-3 py-2.5 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 rounded-md transition-colors text-zinc-700 dark:text-zinc-300 font-medium"
                          onClick={() => {
                            setSelectedWidgetTypeToAdd(item.type as WidgetType);
                            setEditingWidget(null);
                            setIsWidgetMenuOpen(false);
                            setIsWidgetModalOpen(true);
                          }}
                        >
                          <Icon className="w-4 h-4 text-zinc-500" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (

          /* WIDGETS RESPONSIVE GRID CANVAS (12 COLUMNS) */
          <div className="space-y-3 animate-fade-in max-w-7xl mx-auto">
            {/* Build Mode Toolbar Banner */}
            {mode === 'build' && (
              <div className="flex items-center justify-between bg-blue-50/80 dark:bg-blue-950/40 p-2.5 px-4 rounded-xl border border-blue-200 dark:border-blue-900 shadow-3xs">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    12-Column Layout Engine Active
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                    • Drag <GripVertical className="w-3 h-3 inline text-blue-500" /> to move • Drag corner <Maximize2 className="w-3 h-3 inline text-blue-500" /> to resize
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setMode('view')}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold h-7 px-3 flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Done Editing
                </Button>
              </div>
            )}

            {/* Grid Container */}
            <div
              ref={gridContainerRef}
              onPointerDown={(e) => {
                if (e.target === gridContainerRef.current) {
                  setSelectedWidgetId(null);
                }
              }}
              className={cn(
                "grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 sm:gap-5 w-full relative transition-all duration-200 min-h-[500px]",
                mode === 'build' && "p-4 rounded-2xl border-2 border-dashed border-blue-400/50 dark:border-blue-600/40 bg-blue-500/5 dark:bg-blue-950/20"
              )}
              style={{
                gridAutoRows: '90px'
              }}
            >
              {/* Drop Target Ghost Box Preview */}
              {(dragState || resizeState) && (
                <div
                  style={{
                    gridColumnStart: (dragState?.currentLayout || resizeState?.currentLayout!).x + 1,
                    gridColumnEnd: `span ${(dragState?.currentLayout || resizeState?.currentLayout!).w}`,
                    gridRowStart: (dragState?.currentLayout || resizeState?.currentLayout!).y + 1,
                    gridRowEnd: `span ${(dragState?.currentLayout || resizeState?.currentLayout!).h}`,
                  }}
                  className="border-2 border-dashed border-blue-500 dark:border-blue-400 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl animate-pulse pointer-events-none z-10 flex items-center justify-center"
                >
                  <div className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
                    <Move className="w-3.5 h-3.5" /> Snap Target
                  </div>
                </div>
              )}

              {/* Render Visible Widgets */}
              {visibleWidgets.map((widget, index) => {
                const validLayout = activeLayouts.find(l => l.id === widget.id)?.layout || getValidLayout(widget, index, 12);
                const isBeingDragged = dragState?.widgetId === widget.id;
                const isBeingResized = resizeState?.widgetId === widget.id;
                const isSelected = selectedWidgetId === widget.id || isBeingDragged || isBeingResized;
                const isActiveAction = isBeingDragged || isBeingResized;

                // Card visual styling
                const customRadius = widget.borderRadius === 'none' ? 'rounded-none'
                  : widget.borderRadius === 'sm' ? 'rounded-lg'
                  : widget.borderRadius === 'md' ? 'rounded-2xl'
                  : widget.borderRadius === 'lg' ? 'rounded-3xl'
                  : widget.borderRadius === 'xl' ? 'rounded-[24px]'
                  : 'rounded-2xl'; // default

                const isBorderOn = widget.borderOn !== false;
                const customBorder = !isBorderOn ? 'border-transparent'
                  : widget.borderIntensity === 'light' ? 'border-zinc-100/70 dark:border-zinc-900/30'
                  : widget.borderIntensity === 'strong' ? 'border-zinc-400 dark:border-zinc-650'
                  : 'border-zinc-200 dark:border-zinc-800'; // default medium

                const customShadow = widget.subtleShadow === 'none' ? 'shadow-none hover:shadow-none'
                  : widget.subtleShadow === 'sm' ? 'shadow-xs hover:shadow-sm'
                  : widget.subtleShadow === 'lg' ? 'shadow-md hover:shadow-xl'
                  : 'shadow-2xs hover:shadow-md'; // default md/medium

                const customPadding = widget.internalPadding === 'sm' ? 'p-3.5'
                  : widget.internalPadding === 'lg' ? 'p-7'
                  : 'p-5'; // default md/medium

                const opacityStyle = widget.backgroundOpacity !== undefined && widget.backgroundOpacity < 100
                  ? { '--tw-bg-opacity': widget.backgroundOpacity / 100 } as React.CSSProperties 
                  : undefined;

                // KPI specific styling overrides for card container
                const kpiContainerStyles: React.CSSProperties = {};
                if (widget.type === 'kpi' && !isActiveAction) {
                  if (widget.kpiBgType === 'custom' && widget.kpiBgColor) {
                    kpiContainerStyles.backgroundColor = widget.kpiBgColor;
                  }
                  if (widget.kpiTextColorType === 'custom' && widget.kpiTextColor) {
                    kpiContainerStyles.color = widget.kpiTextColor;
                  }
                  if (widget.kpiBorderType === 'glow' && widget.kpiAccentColor) {
                    kpiContainerStyles.boxShadow = `0 0 12px 2px ${widget.kpiAccentColor}35`;
                    kpiContainerStyles.borderColor = widget.kpiAccentColor;
                  } else if (widget.kpiBorderType === 'strong' && widget.kpiAccentColor) {
                    kpiContainerStyles.borderWidth = '2px';
                    kpiContainerStyles.borderColor = widget.kpiAccentColor;
                  } else if (widget.kpiBorderType === 'none') {
                    kpiContainerStyles.borderWidth = '0px';
                    kpiContainerStyles.borderColor = 'transparent';
                  } else if (widget.kpiBorderType === 'subtle') {
                    kpiContainerStyles.borderWidth = '1px';
                  }

                  if (widget.kpiCardStyle === 'filled' && widget.kpiAccentColor) {
                    kpiContainerStyles.backgroundColor = widget.kpiAccentColor;
                    kpiContainerStyles.color = '#ffffff';
                  }
                }

                return (
                  <div
                    key={widget.id}
                    style={{
                      gridColumnStart: validLayout.x + 1,
                      gridColumnEnd: `span ${validLayout.w}`,
                      gridRowStart: validLayout.y + 1,
                      gridRowEnd: `span ${validLayout.h}`,
                      zIndex: isSelected ? 40 : 10,
                      ...opacityStyle,
                      ...kpiContainerStyles
                    }}
                    onPointerDown={(e) => handleCardPointerDown(e, widget, validLayout)}
                    onPointerMove={handleCardPointerMove}
                    onPointerUp={handleCardPointerUp}
                    className={cn(
                      "flex flex-col justify-between group relative border transition-shadow duration-150 ease-out min-w-0 overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing",
                      isSelected
                        ? "ring-2 ring-blue-500 border-blue-500 shadow-2xl bg-white dark:bg-zinc-950"
                        : mode === 'build'
                          ? "border-2 border-dashed border-blue-400/60 dark:border-blue-500/40 bg-white/95 dark:bg-zinc-950/95 hover:border-blue-500 hover:shadow-md"
                          : cn("bg-white dark:bg-zinc-950/90 backdrop-blur-xs", customBorder, customShadow),
                      customRadius,
                      customPadding
                    )}
                  >
                    {/* Floating Contextual Toolbar for Selected Widget */}
                    {isSelected && (
                      <div className="no-drag absolute -top-3.5 right-3 z-50 flex items-center gap-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-1 rounded-lg shadow-xl border border-zinc-700/50 dark:border-zinc-300/50 animate-in fade-in duration-150">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWidget(widget);
                            setIsWidgetModalOpen(true);
                          }}
                          className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded text-zinc-300 dark:text-zinc-700 hover:text-white dark:hover:text-zinc-900 transition-colors flex items-center gap-1 text-[11px] font-medium"
                          title="Edit Widget"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <div className="w-[1px] h-3 bg-zinc-700 dark:bg-zinc-300 my-auto" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateWidget(widget);
                          }}
                          className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded text-zinc-300 dark:text-zinc-700 hover:text-white dark:hover:text-zinc-900 transition-colors flex items-center gap-1 text-[11px] font-medium"
                          title="Duplicate Widget"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Duplicate</span>
                        </button>

                        <div className="w-[1px] h-3 bg-zinc-700 dark:bg-zinc-300 my-auto" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWidget(widget.id);
                          }}
                          className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded text-red-400 hover:text-red-300 dark:text-red-600 dark:hover:text-red-700 transition-colors flex items-center gap-1 text-[11px] font-medium"
                          title="Delete Widget"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}

                    {/* Live Resize Dimension Tooltip */}
                    {isBeingResized && (
                      <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-950/40 backdrop-blur-3xs rounded-2xl border-2 border-blue-500 z-50 flex items-center justify-center pointer-events-none animate-fade-in">
                        <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 py-1.5 rounded-xl shadow-xl text-xs font-mono font-bold flex items-center gap-2">
                          <Maximize2 className="w-3.5 h-3.5 text-blue-400 dark:text-blue-600" />
                          <span>{validLayout.w} Cols ({Math.round((validLayout.w / 12) * 100)}%) × {validLayout.h} Rows</span>
                        </div>
                      </div>
                    )}

                    {/* Widget Header Bar */}
                    <div className="flex items-center justify-between mb-2 shrink-0 gap-1.5 pointer-events-auto">
                      <div className="flex items-center gap-1.5 truncate">
                        {widget.type !== 'kpi' && (
                          <div className="truncate">
                            <h3 className={cn(
                              "text-zinc-900 dark:text-zinc-100 truncate",
                              widget.chartTitleSize === 'sm' ? 'text-xs'
                                : widget.chartTitleSize === 'lg' ? 'text-base'
                                : 'text-sm', // default
                              widget.chartTitleWeight === 'normal' ? 'font-normal'
                                : widget.chartTitleWeight === 'medium' ? 'font-medium'
                                : widget.chartTitleWeight === 'black' ? 'font-black'
                                : 'font-semibold' // default
                            )}>
                              {widget.title}
                            </h3>
                            {widget.subtitle && (
                              <p className="text-[11px] text-zinc-400 truncate">{widget.subtitle}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* BUILD MODE EDIT CONTROLS */}
                      {mode === 'build' ? (
                        <div className="no-drag flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 opacity-90 group-hover:opacity-100 transition-opacity">
                          {/* Width Span Preset Selector */}
                          <select
                            value={Math.ceil(validLayout.w / 3)}
                            onChange={(e) => handleResizeWidget(widget.id, Number(e.target.value))}
                            className="text-[10px] bg-transparent text-zinc-600 dark:text-zinc-300 font-mono focus:outline-none cursor-pointer"
                            title="Change Width Span"
                          >
                            <option value={1}>1/4</option>
                            <option value={2}>1/2</option>
                            <option value={3}>3/4</option>
                            <option value={4}>Full</option>
                          </select>

                          {/* Hide Visual */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            onClick={() => {
                              setWidgetVisibility(prev => ({ ...prev, [widget.id]: false }));
                              showToast(`Hidden "${widget.title}" in this view`);
                            }}
                            title="Hide visual in current view"
                          >
                            <EyeOff className="w-3 h-3" />
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
                        /* VIEW MODE: Quick edit & hide options on hover */
                        <div className="no-drag opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                            onClick={() => {
                              setWidgetVisibility(prev => ({ ...prev, [widget.id]: false }));
                              showToast(`Hidden "${widget.title}" in this view`);
                            }}
                            title="Hide visual in this view"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </Button>
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
                    <div className="flex-1 min-h-0 relative">
                      <WidgetRenderer
                        widget={widget}
                        datasets={getDatasetsForWidget(widget.id)}
                        relationships={relationships}
                        filters={[]}
                        activeCrossFilters={activeCrossFilters}
                        savedKpis={savedKpis}
                        drillState={widgetDrillStates[widget.id]}
                        onDrillStateChange={(newState) => handleDrillStateChange(widget.id, newState)}
                        onOpenDrillThrough={(modalState) => setDrillThroughModal({ ...modalState, isOpen: true })}
                        onDataPointClick={(column, value, options) => handleCrossFilterClick(widget.id, column, value, options)}
                        onClearWidgetCrossFilter={() => handleClearWidgetCrossFilter(widget.id)}
                        onUpdateWidget={(updatedConfig) => handleUpdateWidget(widget.id, updatedConfig)}
                      />
                    </div>

                    {/* Resize Handles for Selected / Build Mode Widgets */}
                    {(isSelected || mode === 'build') && (
                      <>
                        {/* Bottom-Right Corner Diagonal Handle */}
                        <div
                          onPointerDown={(e) => handleResizeStart(e, widget, validLayout, 'se')}
                          onPointerMove={handleResizeMove}
                          onPointerUp={handleResizeEnd}
                          className="resize-handle absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center cursor-nwse-resize text-blue-500 hover:text-blue-600 hover:bg-blue-500/20 rounded-md transition-all z-30 touch-none group/resize"
                          title="Drag to resize widget width and height"
                        >
                          <Maximize2 className="w-3.5 h-3.5 rotate-90 transform group-hover/resize:scale-110" />
                        </div>

                        {/* Right Edge Handle */}
                        <div
                          onPointerDown={(e) => handleResizeStart(e, widget, validLayout, 'e')}
                          onPointerMove={handleResizeMove}
                          onPointerUp={handleResizeEnd}
                          className="resize-handle absolute top-6 bottom-6 right-0 w-2.5 hover:w-3.5 cursor-ew-resize bg-blue-500/0 hover:bg-blue-500/30 rounded-r-lg transition-all z-20 touch-none"
                          title="Drag right edge to adjust width"
                        />

                        {/* Bottom Edge Handle */}
                        <div
                          onPointerDown={(e) => handleResizeStart(e, widget, validLayout, 's')}
                          onPointerMove={handleResizeMove}
                          onPointerUp={handleResizeEnd}
                          className="resize-handle absolute left-6 right-6 bottom-0 h-2.5 hover:h-3.5 cursor-ns-resize bg-blue-500/0 hover:bg-blue-500/30 rounded-b-lg transition-all z-20 touch-none"
                          title="Drag bottom edge to adjust height"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        )}
      </div>

      {/* DRILL-THROUGH / VIEW DETAIL RECORDS MODAL */}
      {drillThroughModal && (
        <DrillThroughModal
          isOpen={!!drillThroughModal}
          onClose={() => setDrillThroughModal(null)}
          dataset={drillThroughModal.dataset}
          filteredRecords={drillThroughModal.records}
          widgetTitle={drillThroughModal.title}
          drillPath={drillThroughModal.drillPath}
        />
      )}

      {/* WIDGET BUILDER MODAL */}
      <WidgetBuilderModal
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        onSave={handleSaveWidget}
        datasets={fullyFilteredDatasets}
        savedKpis={savedKpis}
        activeDatasetId={primaryDataset?.id || ''}
        initialWidget={editingWidget}
        initialType={selectedWidgetTypeToAdd}
      />

      {/* AI DASHBOARD EXPLANATION MODAL */}
      {currentDash && (
        <AiDashboardModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          dashboard={currentDash}
          datasets={fullyFilteredDatasets}
          savedKpis={savedKpis}
          activeSavedView={activeSavedView}
          activeCrossFilters={activeCrossFilters}
          widgetDrillStates={widgetDrillStates}
        />
      )}

      {/* SAVED VIEWS SIDEBAR PANEL (Phase 7E) */}
      {currentDash && (
        <SavedViewsPanel
          isOpen={isSavedViewsPanelOpen}
          onClose={() => setIsSavedViewsPanelOpen(false)}
          savedViews={currentDash.savedViews || []}
          activeViewId={activeSavedViewId}
          defaultViewId={currentDash.defaultViewId}
          hasUnsavedChanges={hasUnsavedChanges}
          onLoadView={handleLoadView}
          onOpenSaveDialog={(mode) => {
            setSaveDialogMode(mode || 'create');
            setIsSaveViewDialogOpen(true);
          }}
          onQuickUpdateActiveView={handleQuickUpdateActiveView}
          onDiscardChanges={handleDiscardChanges}
          onSetDefaultView={handleSetDefaultView}
          onRemoveDefaultView={handleRemoveDefaultView}
          onRenameView={handleRenameView}
          onDuplicateView={handleDuplicateView}
          onDeleteView={handleDeleteView}
          dashboardTitle={currentDash.title}
        />
      )}

      {/* SAVE / UPDATE VIEW DIALOG (Phase 7E) */}
      {currentDash && (
        <SaveViewDialog
          isOpen={isSaveViewDialogOpen}
          onClose={() => setIsSaveViewDialogOpen(false)}
          existingViews={currentDash.savedViews || []}
          activeView={activeSavedView}
          mode={saveDialogMode}
          stateSummary={{
            filterCount: runtimeFilters.length,
            crossFilterCount: activeCrossFilters.length,
            drillCount: Object.values(widgetDrillStates).filter(d => (d.path && d.path.length > 0) || d.currentLevelIndex > 0).length,
            hiddenWidgetCount: hiddenWidgetsCount,
            customLayoutCount: 0
          }}
          onSave={handleSaveView}
        />
      )}

      {/* EXPORT DIALOG (Phase 7F) */}
      {currentDash && (
        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          dashboard={currentDash}
          activeSavedView={activeSavedView}
          targetElement={gridContainerRef.current}
          filterSummary={runtimeFilters.map(f => `${f.column}: ${f.values?.join(', ') || f.value || ''}`)}
          drillSummary={Object.values(widgetDrillStates).filter(d => d.currentLevelIndex > 0).map(d => d.path?.[d.currentLevelIndex - 1]?.label || 'Drilled')}
        />
      )}

      {/* SHARE DIALOG (Phase 7F) */}
      {currentDash && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          dashboardId={currentDash.id}
          savedViewId={activeSavedViewId || undefined}
        />
      )}

      {/* EXECUTIVE PRESENTATION MODE (Phase 7G) */}
      {currentDash && isPresentationOpen && (
        <PresentationMode
          dashboard={currentDash}
          datasets={fullyFilteredDatasets}
          relationships={relationships}
          savedKpis={savedKpis}
          activeSavedView={activeSavedView}
          runtimeFilters={runtimeFilters}
          activeCrossFilters={activeCrossFilters}
          widgetDrillStates={widgetDrillStates}
          widgetVisibility={widgetVisibility}
          onClose={() => setIsPresentationOpen(false)}
          onLoadView={handleLoadView}
          onOpenExportDialog={() => setIsExportDialogOpen(true)}
          onOpenShareDialog={() => setIsShareDialogOpen(true)}
          onOpenSequenceModal={() => setIsSequenceModalOpen(true)}
          onDrillStateChange={handleDrillStateChange}
          onCrossFilterSelect={(crossFilter) => {
            if (crossFilter.widgetId && crossFilter.values?.[0] !== undefined) {
              handleCrossFilterClick(crossFilter.widgetId, crossFilter.column, crossFilter.values[0]);
            }
          }}
        />
      )}

      {/* PRESENTATION SEQUENCE MODAL (Phase 7G) */}
      {currentDash && (
        <PresentationSequenceModal
          isOpen={isSequenceModalOpen}
          onClose={() => setIsSequenceModalOpen(false)}
          dashboard={currentDash}
          onSaveSequence={(sequenceIds, autoPlayInterval) => {
            onUpdateDashboard(currentDash.id, {
              presentationSequence: sequenceIds,
              presentationAutoPlayInterval: autoPlayInterval,
              updatedAt: Date.now()
            });
            showToast('Updated slide deck sequence');
          }}
          onStartPresentation={() => setIsPresentationOpen(true)}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900/90 text-white dark:bg-white/95 dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-2xl border border-zinc-700/50 dark:border-zinc-200 text-xs font-medium flex items-center gap-2 animate-slide-up backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
