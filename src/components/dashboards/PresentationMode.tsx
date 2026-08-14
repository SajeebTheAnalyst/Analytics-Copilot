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
  Sparkles, 
  Clock, 
  Info,
  Sliders
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlayTimeLeft, setAutoPlayTimeLeft] = useState<number>(0);
  const [showSequenceDrawer, setShowSequenceDrawer] = useState(false);

  // Ordered Presentation Sequence of Saved Views
  const presentationSequence = useMemo(() => {
    return resolvePresentationSequence(dashboard);
  }, [dashboard]);

  const currentIndex = useMemo(() => {
    return getSequenceIndex(presentationSequence, activeSavedView?.id || null);
  }, [presentationSequence, activeSavedView?.id]);

  const intervalSeconds = dashboard.presentationAutoPlayInterval || 10;

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
        handleToggleFullscreen();
      } else if (e.key === 'Escape') {
        if (isDashboardFullscreen()) {
          exitDashboardFullscreen();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationSequence, currentIndex, onClose]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || presentationSequence.length <= 1) {
      setAutoPlayTimeLeft(0);
      return;
    }

    setAutoPlayTimeLeft(intervalSeconds);
    const tickInterval = setInterval(() => {
      setAutoPlayTimeLeft(prev => {
        if (prev <= 1) {
          handleNextSlide();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [isPlaying, presentationSequence.length, intervalSeconds, currentIndex]);

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

  // Active filter summary strings
  const filterChips = useMemo(() => {
    const chips: string[] = [];
    runtimeFilters.forEach(f => {
      if (f.values && f.values.length > 0) {
        chips.push(`${f.column}: ${f.values.join(', ')}`);
      } else if (f.value !== undefined && f.value !== null && f.value !== '') {
        chips.push(`${f.column} ${f.operator || '='} ${f.value}`);
      }
    });
    activeCrossFilters.forEach(cf => {
      chips.push(`${cf.column}: ${cf.value}`);
    });
    return chips;
  }, [runtimeFilters, activeCrossFilters]);

  // Executive KPI summary metrics
  const executiveKpis = useMemo(() => {
    const kpiWidgets = dashboard.widgets.filter(w => w.type === 'kpi');
    return kpiWidgets.slice(0, 4);
  }, [dashboard.widgets]);

  return (
    <div 
      ref={containerRef}
      id="presentation-container"
      className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden select-none animate-fade-in"
    >
      {/* Minimal Executive Presentation Header */}
      <header className="h-14 px-6 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
        {/* Left: Title & Active View Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white truncate">
                {dashboard.title}
              </h1>
              {activeSavedView && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 font-medium truncate flex items-center gap-1">
                  <Bookmark className="w-2.5 h-2.5 fill-blue-400" />
                  {activeSavedView.name}
                </span>
              )}
            </div>
            {dashboard.subtitle && (
              <p className="text-[11px] text-zinc-400 truncate">
                {dashboard.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center: Slide Sequence & Navigation Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 px-3 py-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={presentationSequence.length <= 1}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Slide Indicator Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setShowSequenceDrawer(prev => !prev)}
            className="px-2 py-0.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-md flex items-center gap-1.5 transition-colors"
            title="View Slide Sequence"
          >
            <span>
              {presentationSequence.length > 0 ? (
                <>Slide {currentIndex + 1} / {presentationSequence.length}</>
              ) : (
                'Live View'
              )}
            </span>
            <Layers className="w-3 h-3 text-zinc-500" />
          </button>

          <button
            type="button"
            onClick={handleNextSlide}
            disabled={presentationSequence.length <= 1}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors"
            title="Next Slide (Right Arrow)"
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
                  "p-1 rounded-lg transition-colors flex items-center gap-1 text-xs px-2",
                  isPlaying 
                    ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
                title="Auto-Play Presentation (Spacebar)"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span className="font-mono text-[10px]">{autoPlayTimeLeft}s</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="text-[10px]">Play</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Tools & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Deck Sequence Manager */}
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
            title="Export / Print Current State"
          >
            <FileDown className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Share View */}
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
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-zinc-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-zinc-400" />
            )}
          </Button>

          {/* Exit Presentation */}
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex items-center gap-1 border border-zinc-700"
            title="Exit Presentation Mode (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </Button>
        </div>
      </header>

      {/* Slide Sequence Quick Drawer Dropdown */}
      {showSequenceDrawer && presentationSequence.length > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-3 w-80 max-h-80 overflow-y-auto custom-scrollbar animate-scale-up">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            <span>Slide Deck Outline</span>
            <span>{presentationSequence.length} slides</span>
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
                  "w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors",
                  idx === currentIndex 
                    ? "bg-blue-600/30 text-blue-200 font-semibold border border-blue-500/40" 
                    : "text-zinc-300 hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-4 h-4 rounded-full bg-zinc-800 text-[10px] flex items-center justify-center font-bold text-zinc-400 shrink-0">
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

      {/* Active Filter Context Ribbon */}
      {filterChips.length > 0 && (
        <div className="px-6 py-2 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
          <Filter className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-[11px] font-semibold text-zinc-400 shrink-0">Active Context:</span>
          {filterChips.map((chip, i) => (
            <span 
              key={i}
              className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-800/90 text-zinc-200 border border-zinc-700/60 shrink-0"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* Main Presentation Canvas Container */}
      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-zinc-950">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 12-Column Responsive Dashboard Grid (Interactive presentation without drag/resize clutter) */}
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
                    "bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 shadow-xl flex flex-col min-h-[220px] transition-all hover:border-zinc-700"
                  )}
                  style={{ minHeight: `${Math.max(layout.h * 80, 220)}px` }}
                >
                  <WidgetRenderer
                    widget={widget}
                    dataset={datasets.find(d => d.id === widget.datasetId) || datasets[0]}
                    allDatasets={datasets}
                    relationships={relationships}
                    savedKpis={savedKpis}
                    activeCrossFilters={activeCrossFilters}
                    drillState={widgetDrillStates[widget.id]}
                    onDrillStateChange={onDrillStateChange ? (ns) => onDrillStateChange(widget.id, ns) : undefined}
                    onCrossFilterSelect={onCrossFilterSelect}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Minimal Footer Navigation Bar */}
      <footer className="h-9 px-6 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>Shortcuts: <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded">←</kbd> <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded">→</kbd> Slides</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded">F</kbd> Fullscreen</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded">Esc</kbd> Exit</span>
        </div>
        <div className="font-mono text-zinc-400">
          Deterministic BI Presentation Engine
        </div>
      </footer>
    </div>
  );
}
