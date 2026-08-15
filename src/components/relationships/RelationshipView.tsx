import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { RelationshipSuggestions } from '../workspace/RelationshipSuggestions';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  AlertTriangle, 
  Check, 
  X, 
  EyeOff, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Search, 
  Key, 
  Table, 
  HelpCircle, 
  FileText, 
  ArrowUpRight, 
  ShieldAlert, 
  Sparkles,
  RefreshCw,
  Info,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { RelationshipDetails } from './RelationshipDetails';
import { ManualRelationshipModal } from './ManualRelationshipModal';
import { DatasetModelDetails } from './DatasetModelDetails';
import { ModelHealthPanel } from './ModelHealthPanel';
import { validateRelationship } from '@/lib/relationshipDiscovery';
import { evaluateModelIntegrity } from '@/lib/modelIntegrityEngine';

interface RelationshipViewProps {
  datasets: Dataset[];
  suggestions: RelationshipSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<RelationshipSuggestion[]>>;
  onOpenDataset?: (id: string) => void;
  onNavigateView?: (view: any) => void;
}

export function RelationshipView({ 
  datasets, 
  suggestions, 
  setSuggestions,
  onOpenDataset,
  onNavigateView
}: RelationshipViewProps) {
  const [selectedRel, setSelectedRel] = useState<RelationshipSuggestion | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [showHealthPanel, setShowHealthPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Evaluation for Health Panel status
  const modelHealth = useMemo(() => evaluateModelIntegrity(datasets, suggestions), [datasets, suggestions]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 1. Persisted Layout Position States
  const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>(() => {
    try {
      const saved = localStorage.getItem('dataset-model-positions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dataset-model-zoom');
      return saved ? parseFloat(saved) : 1;
    } catch {
      return 1;
    }
  });

  const [pan, setPan] = useState<{ x: number, y: number }>(() => {
    try {
      const saved = localStorage.getItem('dataset-model-pan');
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  });

  // Save layout position on change
  useEffect(() => {
    if (Object.keys(positions).length > 0) {
      localStorage.setItem('dataset-model-positions', JSON.stringify(positions));
    }
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('dataset-model-zoom', String(zoom));
  }, [zoom]);

  useEffect(() => {
    localStorage.setItem('dataset-model-pan', JSON.stringify(pan));
  }, [pan]);

  // Handle auto layout coordinates for fresh sheets
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev };
      let updated = false;
      datasets.forEach((ds, idx) => {
        if (!next[ds.id]) {
          next[ds.id] = { 
            x: 80 + (idx % 3) * 360, 
            y: 80 + Math.floor(idx / 3) * 320 
          };
          updated = true;
        }
      });
      return updated ? next : prev;
    });

    // Expand nodes by default
    setExpandedNodes(prev => {
      const next = { ...prev };
      datasets.forEach(ds => {
        if (next[ds.id] === undefined) {
          next[ds.id] = true;
        }
      });
      return next;
    });
  }, [datasets]);

  // 2. Memoized Relationship Filter & Live Health Evaluation
  const activeRelationships = useMemo(() => {
    return suggestions.filter(s => s.status !== 'rejected');
  }, [suggestions]);

  const relationshipHealth = useMemo(() => {
    const healthMap: Record<string, { isValid: boolean; hasWarnings: boolean; errors: string[]; warnings: string[] }> = {};
    
    suggestions.forEach(rel => {
      const src = datasets.find(d => d.id === rel.sourceDatasetId);
      const tgt = datasets.find(d => d.id === rel.targetDatasetId);
      if (!src || !tgt) {
        healthMap[rel.id] = { isValid: false, hasWarnings: false, errors: ['Source/target dataset missing'], warnings: [] };
        return;
      }
      
      const validation = validateRelationship(src, rel.sourceColumn, tgt, rel.targetColumn, rel.type);
      healthMap[rel.id] = {
        isValid: validation.isValid,
        hasWarnings: validation.warnings.length > 0,
        errors: validation.errors,
        warnings: validation.warnings
      };
    });
    
    return healthMap;
  }, [suggestions, datasets]);

  // 3. Mathematical Edge Attachment Router
  const getCardHeight = (id: string) => {
    const isExpanded = expandedNodes[id];
    if (!isExpanded) return 55;
    const ds = datasets.find(d => d.id === id);
    if (!ds) return 220;
    const cols = ds.headers.slice(0, 5);
    return 65 + cols.length * 36 + (ds.headers.length > 5 ? 32 : 0);
  };

  const getEdgePoints = (
    p1: { x: number, y: number }, 
    p2: { x: number, y: number }, 
    id1: string, 
    id2: string
  ) => {
    const w1 = 280;
    const h1 = getCardHeight(id1);
    const w2 = 280;
    const h2 = getCardHeight(id2);

    const c1x = p1.x + w1 / 2;
    const c1y = p1.y + h1 / 2;
    const c2x = p2.x + w2 / 2;
    const c2y = p2.y + h2 / 2;

    const dx = c2x - c1x;
    const dy = c2y - c1y;

    let x1 = c1x, y1 = c1y, x2 = c2x, y2 = c2y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        x1 = p1.x + w1;
        x2 = p2.x;
      } else {
        x1 = p1.x;
        x2 = p2.x + w2;
      }
    } else {
      if (dy > 0) {
        y1 = p1.y + h1;
        y2 = p2.y;
      } else {
        y1 = p1.y;
        y2 = p2.y + h2;
      }
    }

    return { x1, y1, x2, y2 };
  };

  // 4. Interactive Selection & Connection Highlighting Bounds
  const highlightInfo = useMemo(() => {
    if (!selectedDatasetId) return null;
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(selectedDatasetId);
    
    const connectedEdgeIds = new Set<string>();
    activeRelationships.forEach(rel => {
      if (rel.sourceDatasetId === selectedDatasetId) {
        connectedNodeIds.add(rel.targetDatasetId);
        connectedEdgeIds.add(rel.id);
      }
      if (rel.targetDatasetId === selectedDatasetId) {
        connectedNodeIds.add(rel.sourceDatasetId);
        connectedEdgeIds.add(rel.id);
      }
    });

    return {
      nodeIds: connectedNodeIds,
      edgeIds: connectedEdgeIds
    };
  }, [selectedDatasetId, activeRelationships]);

  const matchingDatasetIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return new Set(
      datasets.filter(d => d.name.toLowerCase().includes(q)).map(d => d.id)
    );
  }, [datasets, searchQuery]);

  // Primary key logic detection
  const isPrimaryKeyCandidate = (header: string, dataset: Dataset) => {
    const norm = header.toLowerCase();
    const isIdName = norm === 'id' || norm === 'key' || norm.endsWith('id') || norm.endsWith('key') || norm.endsWith('code');
    const profile = dataset.columnProfiles?.[header];
    if (profile) {
      const isUnique = profile.uniqueCount >= dataset.rowCount * 0.95 && profile.nullCount === 0;
      return isIdName || isUnique;
    }
    return isIdName;
  };

  // Drag-and-drop actions
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.table-node') || (e.target as HTMLElement).closest('.node-btn')) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingNode) {
      setPositions(prev => ({
        ...prev,
        [isDraggingNode]: {
          x: Math.round((e.clientX - dragStart.x) / zoom),
          y: Math.round((e.clientY - dragStart.y) / zoom),
        }
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingNode(null);
    setIsPanning(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const startNodeDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setIsDraggingNode(id);
    const pos = positions[id] || { x: 0, y: 0 };
    setDragStart({
      x: e.clientX - pos.x * zoom,
      y: e.clientY - pos.y * zoom
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Zoom Fit calculations
  const fitToView = () => {
    const ids = Object.keys(positions);
    if (ids.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    ids.forEach(id => {
      const pos = positions[id];
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + 280);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + getCardHeight(id));
    });

    const padding = 60;
    const graphWidth = maxX - minX + padding * 2;
    const graphHeight = maxY - minY + padding * 2;

    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;

    const newZoom = Math.max(0.4, Math.min(1.5, Math.min(containerWidth / graphWidth, containerHeight / graphHeight)));
    const newPanX = (containerWidth - graphWidth * newZoom) / 2 - minX * newZoom + padding * newZoom;
    const newPanY = (containerHeight - graphHeight * newZoom) / 2 - minY * newZoom + padding * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleStatusChange = (id: string, status: 'accepted' | 'rejected' | 'pending') => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    if (selectedRel?.id === id && status === 'rejected') {
      setSelectedRel(null);
    } else if (selectedRel?.id === id) {
      setSelectedRel({ ...selectedRel, status });
    }
  };

  const handleCreateRelationship = (newRel: RelationshipSuggestion) => {
    setSuggestions(prev => [...prev, newRel]);
    setSelectedRel(newRel);
  };

  const handleUpdateRelationship = (id: string, updated: Partial<RelationshipSuggestion>) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    setSelectedRel(prev => prev && prev.id === id ? { ...prev, ...updated } : prev);
  };

  const handleDeleteRelationship = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
    setSelectedRel(null);
  };

  // 5. Render Core View States
  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/10 dark:bg-[#09090b] h-full relative overflow-hidden">
        {/* Ambient Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-500/30 group">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <Network className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight">Model Data Relationships</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 mb-6 leading-relaxed">
            Load multiple datasets to connect schemas and build cross-table formulas.
          </p>
          <Button
            onClick={() => onNavigateView ? onNavigateView('data-manager') : onOpenDataset?.("")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9.5 text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm rounded-lg cursor-pointer animate-in fade-in"
          >
            Import Dataset
          </Button>
        </div>
      </div>
    );
  }

  // Handle single-dataset model state
  if (datasets.length === 1) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50/20 dark:bg-[#09090b] p-8">
        <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center shadow-xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
            <Network className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">No Relationships Yet</h3>
          <p className="text-xs text-zinc-500 mb-5 max-w-xs leading-relaxed">
            You need at least two sheets or data tables loaded in the workspace to construct database connections and formulas.
          </p>
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-150 dark:border-zinc-850 text-left text-[11px] text-zinc-500 space-y-2 mb-6 w-full">
            <div className="font-bold text-zinc-700 dark:text-zinc-300">Active dataset in session:</div>
            <div className="flex items-center gap-2 font-mono">
              <Table className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">{datasets[0].name}</span>
              <span className="text-[10px] bg-zinc-150 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-sans shrink-0 ml-auto">
                {datasets[0].rowCount} rows
              </span>
            </div>
          </div>
          <Button 
            disabled
            className="w-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-semibold h-10 gap-1.5 cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            + Create Relationship
          </Button>
          <p className="text-[10px] text-zinc-400 mt-2.5">Import more datasets in the sheets manager to unlock relationships.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-transparent overflow-hidden">
      
      {/* Canvas Working Space */}
      <div 
        className="flex-1 relative overflow-hidden flex bg-zinc-50/40 dark:bg-[#060608]/20 select-none"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        
        {/* Left Control Floating Overlay */}
        <div className="absolute top-4 left-4 z-20 bg-white/90 dark:bg-[#09090b]/95 border border-zinc-200 dark:border-zinc-800 p-4 w-72 rounded-2xl shadow-xl flex flex-col gap-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
              <Network className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">Data Model Canvas</h3>
              <p className="text-[10px] text-zinc-400 leading-none mt-0.5">Visualize connections between sheets</p>
            </div>
          </div>

          {/* Quick Search Tool */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search dataset..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 leading-relaxed font-medium">
            Active connections mapping tables together: <span className="font-bold text-zinc-800 dark:text-zinc-200">{activeRelationships.length} active</span>
          </div>

          <Button 
            size="sm" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer h-9 rounded-xl"
            onClick={() => setIsManualModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Relationship
          </Button>

          <Button 
            size="sm" 
            variant="outline"
            className="w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs font-bold gap-1.5 shadow-sm cursor-pointer h-9 rounded-xl border border-zinc-200 dark:border-zinc-800"
            onClick={() => setShowHealthPanel(true)}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Check Model Health
          </Button>
        </div>

        {/* Right Zoom / Action Floating Overlays */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <div className="flex items-center bg-white/95 dark:bg-[#09090b]/95 border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-xl shadow-lg backdrop-blur-md">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer" 
              onClick={() => setZoom(z => Math.min(z + 0.1, 1.8))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span className="text-[11px] font-bold w-12 text-center text-zinc-700 dark:text-zinc-300">
              {Math.round(zoom * 100)}%
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer" 
              onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-white/95 dark:bg-[#09090b]/95 border-zinc-200 dark:border-zinc-800 shadow-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer text-zinc-700 dark:text-zinc-300" 
            onClick={fitToView}
            title="Fit Canvas to View"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        </div>

        {/* Canvas Empty State Message overlays if no links exist */}
        {activeRelationships.length === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-blue-50/90 dark:bg-blue-950/90 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded-2xl max-w-sm text-center shadow-lg backdrop-blur-xs flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-left">
              <div className="text-xs font-bold text-blue-900 dark:text-blue-100">Establish Active Model links</div>
              <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-snug">Connect your datasets to build an analytical model and generate dashboards.</p>
            </div>
          </div>
        )}

        {/* Graph Render Transform Layer */}
        <div 
          className="absolute origin-top-left touch-none w-full h-full"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          
          {/* SVG Connection links rendering Layer */}
          <svg className="absolute inset-0 overflow-visible pointer-events-none w-full h-full z-0">
            {activeRelationships.map(rel => {
              const srcPos = positions[rel.sourceDatasetId];
              const tgtPos = positions[rel.targetDatasetId];
              if (!srcPos || !tgtPos) return null;

              // Anchor connection points on card boundaries
              const { x1, y1, x2, y2 } = getEdgePoints(srcPos, tgtPos, rel.sourceDatasetId, rel.targetDatasetId);

              const isSelected = selectedRel?.id === rel.id;
              
              // Calculate highlights and dims
              const isDimmed = highlightInfo 
                ? !highlightInfo.edgeIds.has(rel.id) 
                : false;

              // Health evaluation formatting
              const health = relationshipHealth[rel.id];
              let strokeColor = '#3b82f6'; // default blue
              let animateDash = false;

              if (!health?.isValid) {
                strokeColor = '#ef4444'; // Red for invalid
              } else if (health?.hasWarnings) {
                strokeColor = '#f59e0b'; // Amber for warning
              } else if (rel.status === 'accepted') {
                strokeColor = '#10b981'; // Emerald for active
              } else {
                strokeColor = '#94a3b8'; // Grey for suggested/pending
                animateDash = true;
              }

              if (isSelected) {
                strokeColor = '#3b82f6'; // Bright selection blue
              }

              // Path computation (subtle S-curve or direct diagonal)
              const dx = x2 - x1;
              const dy = y2 - y1;
              const midX = x1 + dx / 2;
              const midY = y1 + dy / 2;
              const controlDist = Math.min(100, Math.abs(dx) * 0.4);
              const pathString = `M ${x1} ${y1} C ${x1 + (dx > 0 ? controlDist : -controlDist)} ${y1}, ${x2 - (dx > 0 ? controlDist : -controlDist)} ${y2}, ${x2} ${y2}`;

              return (
                <g 
                  key={rel.id} 
                  className={cn(
                    "pointer-events-auto cursor-pointer transition-opacity duration-300",
                    isDimmed ? "opacity-15" : "opacity-100 hover:opacity-100"
                  )} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRel(rel);
                    setSelectedDatasetId(null);
                  }}
                >
                  {/* Broad transparent path helper for easier hover target */}
                  <path 
                    d={pathString}
                    fill="none" 
                    stroke="transparent" 
                    strokeWidth={16} 
                  />
                  {/* Primary visible connection line */}
                  <path 
                    d={pathString}
                    fill="none"
                    stroke={strokeColor} 
                    strokeWidth={isSelected ? 4 : 2}
                    strokeDasharray={animateDash ? '5,5' : 'none'}
                    className={cn(
                      "transition-all duration-300",
                      isSelected && "drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]"
                    )}
                  />

                  {/* Cardinality Badge Bubble at midpoint */}
                  <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                    <rect 
                      x={-24} 
                      y={-10} 
                      width={48} 
                      height={20} 
                      rx={6} 
                      fill="white" 
                      className="fill-white dark:fill-zinc-950" 
                      stroke={strokeColor} 
                      strokeWidth={1.5} 
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                    />
                    <text 
                      textAnchor="middle" 
                      dominantBaseline="central" 
                      fontSize="9" 
                      fill={strokeColor} 
                      fontWeight="black"
                      className="font-sans font-mono tracking-wide select-none"
                    >
                      {rel.type}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Draggable Dataset Table cards Layer */}
          {datasets.map(dataset => {
            const pos = positions[dataset.id] || { x: 0, y: 0 };
            const isExpanded = expandedNodes[dataset.id];
            
            // Check selections and highlight states
            const isSelected = selectedDatasetId === dataset.id;
            const isConnected = highlightInfo?.nodeIds.has(dataset.id);
            const isSearched = matchingDatasetIds?.has(dataset.id);
            
            let isDimmed = false;
            if (highlightInfo && !isConnected) {
              isDimmed = true;
            }
            if (matchingDatasetIds && !isSearched) {
              isDimmed = true;
            }

            // Visible columns filter limit
            const visibleCols = isExpanded 
              ? dataset.headers 
              : dataset.headers.slice(0, 5);

            const hasMoreCols = dataset.headers.length > 5;

            return (
              <div 
                key={dataset.id}
                className={cn(
                  "table-node absolute w-[280px] select-none rounded-xl bg-white dark:bg-[#0c0c0e] border transition-all duration-300",
                  isSelected 
                    ? "border-blue-500 shadow-xl ring-2 ring-blue-500/10 z-20 scale-102" 
                    : isConnected
                    ? "border-emerald-500/80 shadow-md ring-2 ring-emerald-500/5 z-10"
                    : isSearched
                    ? "border-amber-500/80 shadow-md ring-2 ring-amber-500/5 z-10 animate-pulse"
                    : "border-zinc-200 dark:border-zinc-800 shadow-sm z-0",
                  isDimmed && "opacity-25 hover:opacity-100"
                )}
                style={{ left: pos.x, top: pos.y }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDatasetId(dataset.id);
                  setSelectedRel(null);
                }}
              >
                {/* Card Title drag Handle */}
                <div 
                  className={cn(
                    "px-3.5 py-3 border-b cursor-grab active:cursor-grabbing flex items-center justify-between rounded-t-xl transition-colors",
                    isSelected 
                      ? "bg-blue-50/20 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30" 
                      : "bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-200/60 dark:border-zinc-800/60"
                  )}
                  onPointerDown={(e) => startNodeDrag(e, dataset.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <Table className={cn("w-4 h-4 shrink-0", isSelected ? "text-blue-500" : "text-zinc-400")} />
                    <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate flex-1" title={dataset.name}>
                      {dataset.name}
                    </h4>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md ml-2 shrink-0">
                    {dataset.rowCount} rows
                  </span>
                </div>

                {/* Columns Field list view */}
                <div className="p-1.5 max-h-[300px] overflow-y-auto custom-scrollbar space-y-0.5">
                  {visibleCols.map(header => {
                    const isKey = activeRelationships.some(s => 
                      (s.sourceDatasetId === dataset.id && s.sourceColumn === header) ||
                      (s.targetDatasetId === dataset.id && s.targetColumn === header)
                    );
                    
                    const isPKCandidate = isPrimaryKeyCandidate(header, dataset);
                    const profile = dataset.columnProfiles?.[header];
                    const type = profile?.type || 'text';

                    return (
                      <div 
                        key={header} 
                        className={cn(
                          "flex items-center justify-between py-1.5 px-2.5 rounded-lg text-[11px] transition-colors",
                          isKey 
                            ? "bg-blue-50/40 dark:bg-blue-950/10 font-bold" 
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                          {isPKCandidate ? (
                            <span title="Primary identifier key" className="inline-flex shrink-0">
                              <Key className="w-3 h-3 text-amber-500" />
                            </span>
                          ) : (
                            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0"></div>
                          )}
                          <span className={cn(
                            "truncate font-mono", 
                            isKey ? "text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400"
                          )}>
                            {header}
                          </span>
                        </div>
                        
                        <span className="text-[9px] uppercase font-mono text-zinc-400/80 font-bold shrink-0">
                          {type}
                        </span>
                      </div>
                    );
                  })}

                  {/* Show more indicator tab */}
                  {hasMoreCols && !isExpanded && (
                    <button
                      type="button"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNodes(prev => ({ ...prev, [dataset.id]: true }));
                      }}
                      className="node-btn w-full text-center py-1.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg flex items-center justify-center gap-1 mt-0.5 cursor-pointer"
                    >
                      <span>+ {dataset.headers.length - 5} more columns</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {hasMoreCols && isExpanded && (
                    <button
                      type="button"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedNodes(prev => ({ ...prev, [dataset.id]: false }));
                      }}
                      className="node-btn w-full text-center py-1.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg flex items-center justify-center gap-1 mt-0.5 cursor-pointer"
                    >
                      <span>Show less</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

        </div>

      </div>

      {/* Side details panels switcher (Properties Sidebar) */}
      {showHealthPanel ? (
        <ModelHealthPanel 
          datasets={datasets}
          suggestions={suggestions}
          onReviewRelationship={(rel) => {
            setSelectedRel(rel);
            setShowHealthPanel(false);
          }}
          onOpenDataset={(id) => {
            setSelectedDatasetId(id);
            setShowHealthPanel(false);
          }}
          onCreateRelationship={() => {
            setIsManualModalOpen(true);
            setShowHealthPanel(false);
          }}
          onClose={() => setShowHealthPanel(false)}
        />
      ) : selectedRel ? (
        <RelationshipDetails 
          relationship={selectedRel}
          sourceDataset={datasets.find(d => d.id === selectedRel.sourceDatasetId)!}
          targetDataset={datasets.find(d => d.id === selectedRel.targetDatasetId)!}
          onClose={() => setSelectedRel(null)}
          onStatusChange={handleStatusChange}
          onUpdate={handleUpdateRelationship}
          onDelete={handleDeleteRelationship}
          datasets={datasets}
        />
      ) : selectedDatasetId ? (
        <DatasetModelDetails
          dataset={datasets.find(d => d.id === selectedDatasetId)!}
          onClose={() => setSelectedDatasetId(null)}
          onOpenDataset={(id) => {
            if (onOpenDataset) {
              onOpenDataset(id);
            }
          }}
          activeRelationships={activeRelationships}
        />
      ) : (
        <RelationshipSuggestions 
          suggestions={suggestions}
          datasets={datasets}
          onAccept={(id) => handleStatusChange(id, 'accepted')}
          onDismiss={(id) => handleStatusChange(id, 'rejected')}
          onReview={(s) => setSelectedRel(s)}
          className="w-80 border-t-0 border-r-0 border-b-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] flex flex-col shrink-0 overflow-hidden rounded-none shadow-2xl relative z-30"
        />
      )}

      {/* Manual Builder Modal Dialog */}
      <ManualRelationshipModal
        datasets={datasets}
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleCreateRelationship}
      />

    </div>
  );
}
