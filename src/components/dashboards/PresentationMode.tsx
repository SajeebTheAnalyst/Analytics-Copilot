import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Layers, 
  Share2, 
  FileDown, 
  Bookmark, 
  Filter, 
  Clock, 
  Sliders,
  Sparkles,
  Focus,
  Check,
  RotateCcw,
  Palette,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Dashboard, 
  Dataset, 
  DashboardSavedView, 
  DashboardFilter, 
  DashboardCrossFilter, 
  WidgetDrillState, 
  WidgetConfig, 
  KpiDefinition, 
  RelationshipSuggestion 
} from '@/types';
import { WidgetRenderer } from './WidgetRenderer';
import { getValidLayout } from '@/lib/dashboardLayout';
import { 
  resolvePresentationSequence, 
  getSequenceIndex, 
  requestDashboardFullscreen, 
  exitDashboardFullscreen, 
  isDashboardFullscreen, 
  isInputElement 
} from '@/lib/dashboardPresentation';

export type PresentationTheme = 'standard' | 'executive' | 'minimal';

interface PresentationModeProps {
  dashboard: Dashboard;
  datasets: Dataset[];
  relationships?: RelationshipSuggestion[];
  savedKpis?: KpiDefinition[];
  activeSavedView: DashboardSavedView | null;
  runtimeFilters: DashboardFilter[];
  activeCrossFilters: DashboardCrossFilter[];
  widgetDrillStates: Record<string, WidgetDrillState>;
  widgetVisibility: Record<string, boolean>;
  onClose: () => void;
  onLoadView: (view: DashboardSavedView) => void;
  onOpenExportDialog: () => void;
  onOpenShareDialog: () => void;
  onOpenSequenceModal: () => void;
  onDrillStateChange?: (widgetId: string, newState: WidgetDrillState) => void;
  onCrossFilterSelect?: (filter: DashboardCrossFilter) => void;
}

export function PresentationMode({
  dashboard,
  datasets,
  relationships = [],
  savedKpis = [],
  activeSavedView,
  runtimeFilters,
  activeCrossFilters,
  widgetDrillStates,
  widgetVisibility,
  onClose,
  onLoadView,
  onOpenExportDialog,
  onOpenShareDialog,
  onOpenSequenceModal,
  onDrillStateChange,
  onCrossFilterSelect
}: PresentationModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Presentation UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState<number>(
    dashboard.presentationAutoPlayInterval || 10
  );
  const [autoPlayTimeLeft, setAutoPlayTimeLeft] = useState<number>(0);
  
  // Spotlight / Focus Mode
  const [focusedWidgetId, setFocusedWidgetId] = useState<string | null>(null);

  // Presentation Themes: 'standard' | 'executive' | 'minimal'
  const [presentationTheme, setPresentationTheme] = useState<PresentationTheme>('executive');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Auto-hide Controls
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Popover / Drawers
  const [showSequenceDrawer, setShowSequenceDrawer] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Live Clock Time
  const [currentTime, setCurrentTime] = useState<string>('');

  // Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Ordered Presentation Sequence of Saved Views
  const presentationSequence = useMemo(() => {
    return resolvePresentationSequence(dashboard);
  }, [dashboard]);

  const currentIndex = useMemo(() => {
    return getSequenceIndex(presentationSequence, activeSavedView?.id || null);
  }, [presentationSequence, activeSavedView?.id]);

  // Sync fullscreen change events from browser (e.g. Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isDashboardFullscreen());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Controls Auto-Hide Behavior (Mouse Inactivity)
  const resetHideControlsTimer = () => {
    setControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    // Don't hide if popover or drawer is open
    if (!showSequenceDrawer && !showFilterPopover && !showThemeMenu) {
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetHideControlsTimer();
    return () => {
      if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    };
  }, [showSequenceDrawer, showFilterPopover, showThemeMenu]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElement(e.target)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (focusedWidgetId) {
          setFocusedWidgetId(null);
        } else if (visibleWidgets.length > 0) {
          setFocusedWidgetId(visibleWidgets[0].id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (focusedWidgetId) {
          setFocusedWidgetId(null);
        } else if (showSequenceDrawer || showFilterPopover || showThemeMenu) {
          setShowSequenceDrawer(false);
          setShowFilterPopover(false);
          setShowThemeMenu(false);
        } else if (isDashboardFullscreen()) {
          exitDashboardFullscreen();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationSequence, currentIndex, focusedWidgetId, showSequenceDrawer, showFilterPopover, showThemeMenu, onClose]);

  // Auto-play timer
  useEffect(() => {
    // Automatically pause timer if focus mode is active or popover/drawer is open
    if (!isPlaying || presentationSequence.length <= 1 || focusedWidgetId || showSequenceDrawer || showFilterPopover) {
      setAutoPlayTimeLeft(0);
      return;
    }

    setAutoPlayTimeLeft(autoPlayInterval);
    const tickInterval = setInterval(() => {
      setAutoPlayTimeLeft(prev => {
        if (prev <= 1) {
          handleNextSlide();
          return autoPlayInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [isPlaying, presentationSequence.length, autoPlayInterval, currentIndex, focusedWidgetId, showSequenceDrawer, showFilterPopover]);

  const handleNextSlide = () => {
    if (presentationSequence.length === 0) return;
    const nextIdx = (currentIndex + 1) % presentationSequence.length;
    const nextView = presentationSequence[nextIdx];
    if (nextView) {
      onLoadView(nextView);
    }
  };

  const handlePrevSlide = () => {
    if (presentationSequence.length === 0) return;
    const prevIdx = (currentIndex - 1 + presentationSequence.length) % presentationSequence.length;
    const prevView = presentationSequence[prevIdx];
    if (prevView) {
      onLoadView(prevView);
    }
  };

  const handleToggleFullscreen = async () => {
    if (isDashboardFullscreen()) {
      await exitDashboardFullscreen();
    } else if (containerRef.current) {
      await requestDashboardFullscreen(containerRef.current);
    }
  };

  // Visible widgets
  const visibleWidgets = useMemo(() => {
    return dashboard.widgets.filter(w => widgetVisibility[w.id] !== false);
  }, [dashboard.widgets, widgetVisibility]);

  // Focused widget config
  const focusedWidget = useMemo(() => {
    if (!focusedWidgetId) return null;
    return dashboard.widgets.find(w => w.id === focusedWidgetId) || null;
  }, [dashboard.widgets, focusedWidgetId]);

  // Active filter summary items
  const filterSummaryItems = useMemo(() => {
    const items: { label: string; detail: string; type: 'global' | 'cross' }[] = [];
    
    runtimeFilters.forEach(f => {
      if (f.values && f.values.length > 0) {
        items.push({
          label: f.column,
          detail: f.values.join(', '),
          type: 'global'
        });
      } else if (f.value !== undefined && f.value !== null && f.value !== '') {
        items.push({
          label: f.column,
          detail: `${f.operator || '='} ${f.value}`,
          type: 'global'
        });
      }
    });

    activeCrossFilters.forEach(cf => {
      items.push({
        label: cf.column,
        detail: (cf.values && cf.values.length > 0) ? cf.values.join(', ') : '',
        type: 'cross'
      });
    });

    return items;
  }, [runtimeFilters, activeCrossFilters]);

  // Executive KPI summary metrics (Section 10)
  const executiveKpiWidgets = useMemo(() => {
    return dashboard.widgets.filter(w => w.type === 'kpi').slice(0, 4);
  }, [dashboard.widgets]);

  // Theme styling helpers
  const themeClasses = useMemo(() => {
    switch (presentationTheme) {
      case 'executive':
        return {
          bg: 'bg-slate-950 text-slate-100',
          headerBg: 'bg-slate-900/95 border-slate-800/80 backdrop-blur-md',
          cardBg: 'bg-slate-900/90 border-slate-800/80 shadow-2xl hover:border-slate-700',
          footerBg: 'bg-slate-900/95 border-slate-800/80',
          badge: 'bg-slate-800/90 text-slate-200 border-slate-700/60',
          accentText: 'text-indigo-400'
        };
      case 'minimal':
        return {
          bg: 'bg-black text-zinc-100',
          headerBg: 'bg-zinc-950/90 border-zinc-900/80 backdrop-blur-md',
          cardBg: 'bg-zinc-950/80 border-zinc-900/80 shadow-none hover:border-zinc-800',
          footerBg: 'bg-zinc-950/90 border-zinc-900/80',
          badge: 'bg-zinc-900 text-zinc-300 border-zinc-800',
          accentText: 'text-zinc-300'
        };
      case 'standard':
      default:
        return {
          bg: 'bg-zinc-950 text-zinc-100',
          headerBg: 'bg-zinc-900/90 border-zinc-800/80 backdrop-blur-md',
          cardBg: 'bg-zinc-900/90 border-zinc-800/90 shadow-xl hover:border-zinc-700',
          footerBg: 'bg-zinc-900/90 border-zinc-800/80',
          badge: 'bg-zinc-800/90 text-zinc-200 border-zinc-700/60',
          accentText: 'text-blue-400'
        };
    }
  }, [presentationTheme]);

  // Controls Visibility CSS Class
  const controlsVisibilityClass = controlsVisible 
    ? 'opacity-100 pointer-events-auto transition-opacity duration-300' 
    : 'opacity-0 hover:opacity-100 pointer-events-auto transition-opacity duration-500';

  return (
    <div 
      ref={containerRef}
      id="presentation-container"
      onMouseMove={resetHideControlsTimer}
      className={cn(
        "fixed inset-0 z-50 flex flex-col overflow-hidden select-none transition-colors duration-300 animate-fade-in",
        themeClasses.bg
      )}
    >
      {/* 1. MINIMAL EXECUTIVE PRESENTATION HEADER */}
      <header className={cn(
        "h-14 px-6 border-b flex items-center justify-between gap-4 shrink-0 z-30 transition-all",
        themeClasses.headerBg,
        presentationTheme === 'minimal' && "h-12 border-b-zinc-900",
        controlsVisibilityClass
      )}>
        {/* Left: Dashboard Info & Active Saved View */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                {dashboard.title}
              </h1>
              {activeSavedView && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 font-medium truncate flex items-center gap-1.5 shrink-0">
                  <Bookmark className="w-3 h-3 fill-blue-400 text-blue-400" />
                  <span>{activeSavedView.name}</span>
                </span>
              )}
            </div>
            {dashboard.description && presentationTheme !== 'minimal' && (
              <p className="text-[11px] text-zinc-400 truncate max-w-md">
                {dashboard.description}
              </p>
            )}
          </div>
        </div>

        {/* Center: Slide Sequence Navigation Controls & View Indicator */}
        <div className="flex items-center gap-2">
          {/* Active Filter Context Indicator Button */}
          {filterSummaryItems.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowFilterPopover(prev => !prev);
                  setShowSequenceDrawer(false);
                  setShowThemeMenu(false);
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all",
                  filterSummaryItems.length > 0 
                    ? "bg-blue-950/70 border-blue-800/80 text-blue-300 hover:bg-blue-900/80" 
                    : "bg-zinc-800/80 border-zinc-700 text-zinc-300"
                )}
                title="View Active Filter Context"
              >
                <Filter className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{filterSummaryItems.length} Filter{filterSummaryItems.length > 1 ? 's' : ''} Active</span>
              </button>

              {/* Filter Context Popover */}
              {showFilterPopover && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4 w-72 max-h-80 overflow-y-auto custom-scrollbar animate-scale-up">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-xs font-bold text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-blue-400" />
                      Filter Context
                    </span>
                    <button onClick={() => setShowFilterPopover(false)} className="text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {filterSummaryItems.map((item, idx) => (
                      <div key={idx} className="p-2 bg-zinc-950 rounded-lg border border-zinc-800/80 text-xs">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                          {item.type === 'cross' ? 'Cross-Filter Selection' : 'Global Filter'} • {item.label}
                        </div>
                        <div className="font-semibold text-zinc-200 mt-0.5 truncate">
                          {item.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Slide Deck Navigation */}
          <div className="flex items-center gap-1 bg-zinc-900/90 px-2.5 py-1 rounded-xl border border-zinc-800 shadow-inner">
            <button
              type="button"
              onClick={handlePrevSlide}
              disabled={presentationSequence.length <= 1}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors"
              title="Previous View (Left Arrow)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Slide View Indicator Button */}
            <button
              type="button"
              onClick={() => {
                setShowSequenceDrawer(prev => !prev);
                setShowFilterPopover(false);
                setShowThemeMenu(false);
              }}
              className="px-2 py-0.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-md flex items-center gap-1.5 transition-colors"
              title="View Slide Sequence"
            >
              <span>
                {presentationSequence.length > 0 ? (
                  <>View {currentIndex + 1} of {presentationSequence.length}</>
                ) : (
                  'Live View'
                )}
              </span>
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              type="button"
              onClick={handleNextSlide}
              disabled={presentationSequence.length <= 1}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors"
              title="Next View (Right Arrow)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Auto-Play Toggle */}
            {presentationSequence.length > 1 && (
              <div className="flex items-center border-l border-zinc-800 pl-2 ml-1">
                <button
                  type="button"
                  onClick={() => setIsPlaying(prev => !prev)}
                  className={cn(
                    "p-1 rounded-lg transition-colors flex items-center gap-1.5 text-xs px-2.5 font-medium",
                    isPlaying 
                      ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                  title="Auto-Play Presentation (Spacebar)"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span className="font-mono text-[11px] font-bold">{autoPlayTimeLeft}s</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Auto Play</span>
                    </>
                  )}
                </button>

                {/* Auto Play Interval Selector */}
                <select
                  value={autoPlayInterval}
                  onChange={(e) => setAutoPlayInterval(Number(e.target.value))}
                  className="bg-transparent text-[10px] font-mono text-zinc-400 hover:text-zinc-200 border-none outline-none cursor-pointer pr-1"
                  title="Auto Play Interval"
                >
                  <option value={5} className="bg-zinc-900 text-white">5s</option>
                  <option value={10} className="bg-zinc-900 text-white">10s</option>
                  <option value={20} className="bg-zinc-900 text-white">20s</option>
                  <option value={30} className="bg-zinc-900 text-white">30s</option>
                  <option value={60} className="bg-zinc-900 text-white">60s</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right: Tools, Theme Selector, Exit */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Clock Display */}
          {currentTime && (
            <div className="hidden lg:flex items-center gap-1 text-xs font-mono text-zinc-400 px-2 py-1 bg-zinc-900/60 rounded-lg border border-zinc-800">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{currentTime}</span>
            </div>
          )}

          {/* Theme Selector Dropdown */}
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowThemeMenu(prev => !prev);
                setShowSequenceDrawer(false);
                setShowFilterPopover(false);
              }}
              className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5"
              title="Change Presentation Theme"
            >
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline capitalize">{presentationTheme}</span>
            </Button>

            {showThemeMenu && (
              <div className="absolute top-10 right-0 z-50 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 w-40 text-xs animate-scale-up space-y-1">
                <div className="text-[10px] font-bold text-zinc-500 uppercase px-2 py-1">Presentation Theme</div>
                <button
                  onClick={() => { setPresentationTheme('executive'); setShowThemeMenu(false); }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between",
                    presentationTheme === 'executive' ? "bg-indigo-950/80 text-indigo-300 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <span>Executive</span>
                  {presentationTheme === 'executive' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
                <button
                  onClick={() => { setPresentationTheme('standard'); setShowThemeMenu(false); }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between",
                    presentationTheme === 'standard' ? "bg-blue-950/80 text-blue-300 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <span>Standard</span>
                  {presentationTheme === 'standard' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <button
                  onClick={() => { setPresentationTheme('minimal'); setShowThemeMenu(false); }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between",
                    presentationTheme === 'minimal' ? "bg-zinc-800 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <span>Minimal</span>
                  {presentationTheme === 'minimal' && <Check className="w-3.5 h-3.5 text-zinc-300" />}
                </button>
              </div>
            )}
          </div>

          {/* Slide Deck Order Sequence Modal */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenSequenceModal}
            className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5"
            title="Configure Slide Deck Sequence"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Deck Order</span>
          </Button>

          {/* Export & Print */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenExportDialog}
            className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5"
            title="Export Current Analytical View"
          >
            <FileDown className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Share Link */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenShareDialog}
            className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5"
            title="Share Direct View Link"
          >
            <Share2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Share</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleFullscreen}
            className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1"
            title="Toggle Native Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-zinc-400" /> : <Maximize2 className="w-4 h-4 text-zinc-400" />}
          </Button>

          {/* Exit Presentation */}
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-red-600/90 hover:bg-red-600 text-white font-semibold flex items-center gap-1 shadow-sm"
            title="Exit Presentation Mode (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </Button>
        </div>
      </header>

      {/* Slide Sequence Drawer Dropdown */}
      {showSequenceDrawer && presentationSequence.length > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-3 w-80 max-h-80 overflow-y-auto custom-scrollbar animate-scale-up">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Presentation Sequence</span>
            <span>{presentationSequence.length} Saved Views</span>
          </div>
          <div className="space-y-1">
            {presentationSequence.map((view, idx) => (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  onLoadView(view);
                  setShowSequenceDrawer(false);
                }}
                className={cn(
                  "w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                  idx === currentIndex 
                    ? "bg-blue-600/30 text-blue-200 font-semibold border border-blue-500/40" 
                    : "text-zinc-300 hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] flex items-center justify-center font-bold text-zinc-400 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="truncate">{view.name}</span>
                </div>
                {view.isDefault && (
                  <span className="text-[9px] bg-amber-950/60 text-amber-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                    Default
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. VISUAL SPOTLIGHT / FOCUS MODE OVERLAY (Section 4) */}
      {focusedWidget ? (
        <div className="flex-1 p-6 flex flex-col overflow-hidden animate-scale-up bg-zinc-950/95 relative">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <Focus className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">{focusedWidget.title}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 font-medium">
                Spotlight Focus
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenExportDialog}
                className="text-xs h-8 bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800"
              >
                <FileDown className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                Export Focused Visual
              </Button>
              <Button
                size="sm"
                onClick={() => setFocusedWidgetId(null)}
                className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Focus (Esc)</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col overflow-hidden">
            <WidgetRenderer
              widget={focusedWidget}
              datasets={datasets}
              filters={runtimeFilters}
              relationships={relationships}
              savedKpis={savedKpis}
              activeCrossFilters={activeCrossFilters}
              drillState={widgetDrillStates[focusedWidget.id]}
              onDrillStateChange={onDrillStateChange ? (ns) => onDrillStateChange(focusedWidget.id, ns) : undefined}
              onDataPointClick={onCrossFilterSelect ? (col, val) => onCrossFilterSelect({ widgetId: focusedWidget.id, column: col, operator: 'equals', values: [val] }) : undefined}
            />
          </div>
        </div>
      ) : (
        /* 3. MAIN PRESENTATION CANVAS GRID */
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar transition-opacity duration-200">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* EXECUTIVE KPI SUMMARY STRIP (Section 10) */}
            {executiveKpiWidgets.length > 0 && presentationTheme !== 'minimal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
                {executiveKpiWidgets.map(kpiWidget => {
                  return (
                    <div 
                      key={`kpi-strip-${kpiWidget.id}`}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[110px]",
                        themeClasses.cardBg
                      )}
                    >
                      <WidgetRenderer
                        widget={kpiWidget}
                        datasets={datasets}
                        filters={runtimeFilters}
                        relationships={relationships}
                        savedKpis={savedKpis}
                        activeCrossFilters={activeCrossFilters}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 12-COLUMN DASHBOARD GRID */}
            <div className="grid grid-cols-12 gap-4">
              {visibleWidgets.map((widget, index) => {
                const layout = getValidLayout(widget, index, 12);
                const colSpan = Math.min(layout.w, 12);
                const colSpanClass = 
                  colSpan === 12 ? 'col-span-12' :
                  colSpan >= 9 ? 'col-span-12 lg:col-span-9' :
                  colSpan >= 8 ? 'col-span-12 lg:col-span-8' :
                  colSpan >= 6 ? 'col-span-12 md:col-span-6' :
                  colSpan >= 4 ? 'col-span-12 sm:col-span-6 lg:col-span-4' :
                  colSpan >= 3 ? 'col-span-12 sm:col-span-6 lg:col-span-3' :
                  'col-span-12 sm:col-span-6 lg:col-span-4';

                return (
                  <div
                    key={widget.id}
                    className={cn(
                      colSpanClass,
                      "rounded-2xl p-4 flex flex-col min-h-[220px] transition-all group relative",
                      themeClasses.cardBg
                    )}
                    style={{ minHeight: `${Math.max(layout.h * 80, 220)}px` }}
                  >
                    {/* Visual Spotlight / Focus Trigger Handle */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        type="button"
                        onClick={() => setFocusedWidgetId(widget.id)}
                        className="p-1.5 rounded-lg bg-zinc-800/90 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700/80 shadow-md flex items-center gap-1 text-[10px] font-semibold"
                        title="Focus Visual in Spotlight Mode"
                      >
                        <Maximize2 className="w-3 h-3 text-blue-400" />
                        <span>Focus</span>
                      </button>
                    </div>

                    <WidgetRenderer
                      widget={widget}
                      datasets={datasets}
                      filters={runtimeFilters}
                      relationships={relationships}
                      savedKpis={savedKpis}
                      activeCrossFilters={activeCrossFilters}
                      drillState={widgetDrillStates[widget.id]}
                      onDrillStateChange={onDrillStateChange ? (ns) => onDrillStateChange(widget.id, ns) : undefined}
                      onDataPointClick={onCrossFilterSelect ? (col, val) => onCrossFilterSelect({ widgetId: widget.id, column: col, operator: 'equals', values: [val] }) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* 4. FOOTER NAVIGATION BAR */}
      <footer className={cn(
        "h-9 px-6 border-t flex items-center justify-between text-[11px] text-zinc-500 shrink-0 z-30 transition-all",
        themeClasses.footerBg,
        controlsVisibilityClass
      )}>
        <div className="flex items-center gap-4">
          <span>Shortcuts: <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono">→</kbd> Slides</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono">F</kbd> Focus</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono">Esc</kbd> Exit</span>
        </div>
        <div className="font-mono text-zinc-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Executive Presentation Mode
        </div>
      </footer>
    </div>
  );
}
