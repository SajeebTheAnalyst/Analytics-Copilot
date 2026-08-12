import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dataset, RelationshipSuggestion } from '@/types';
import { detectRelationships } from '@/lib/relationshipDetector';
import { Network, ZoomIn, ZoomOut, Maximize, AlertTriangle, Check, X, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { RelationshipDetails } from './RelationshipDetails';

interface RelationshipViewProps {
  datasets: Dataset[];
  suggestions: RelationshipSuggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<RelationshipSuggestion[]>>;
}

export function RelationshipView({ datasets, suggestions, setSuggestions }: RelationshipViewProps) {
  const [selectedRel, setSelectedRel] = useState<RelationshipSuggestion | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Auto layout newly added datasets
    setPositions(prev => {
      const next = { ...prev };
      let updated = false;
      datasets.forEach((ds, idx) => {
        if (!next[ds.id]) {
          next[ds.id] = { 
            x: 50 + (idx % 3) * 350, 
            y: 50 + Math.floor(idx / 3) * 300 
          };
          updated = true;
        }
      });
      return updated ? next : prev;
    });

    // Expand all nodes by default
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

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.table-node')) return; // handled by node
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingNode) {
      setPositions(prev => ({
        ...prev,
        [isDraggingNode]: {
          x: (e.clientX - dragStart.x) / zoom,
          y: (e.clientY - dragStart.y) / zoom,
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

  const activeRelationships = useMemo(() => {
    return suggestions.filter(s => s.status !== 'rejected');
  }, [suggestions]);

  const handleStatusChange = (id: string, status: 'accepted' | 'rejected' | 'pending') => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    if (selectedRel?.id === id && status === 'rejected') {
      setSelectedRel(null);
    } else if (selectedRel?.id === id) {
      setSelectedRel({ ...selectedRel, status });
    }
  };

  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
        <Network className="w-12 h-12 mb-4 text-zinc-300 dark:text-zinc-700" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No datasets available</h2>
        <p>Import multiple datasets to detect relationships between them.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden flex"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute top-4 left-4 z-20 glass-panel glass-card p-3 max-w-sm shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Relationship Model</h3>
          </div>
          <p className="text-xs text-zinc-500">
            Detected {suggestions.length} possible relationships. Click on connections to review and approve them.
          </p>
        </div>

        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <div className="flex items-center glass-panel p-0.5 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover-elevate" onClick={() => setZoom(z => Math.min(z + 0.1, 2))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover-elevate" onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="icon" className="glass-panel shadow-sm hover-elevate" onClick={() => { setZoom(1); setPan({x:0, y:0}); }}>
            <Maximize className="w-4 h-4" />
          </Button>
        </div>

        {/* Graph Layer */}
        <div 
          className="absolute origin-top-left touch-none w-full h-full"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* Edges */}
          <svg className="absolute inset-0 overflow-visible pointer-events-none w-full h-full">
            {activeRelationships.map(rel => {
              const srcPos = positions[rel.sourceDatasetId];
              const tgtPos = positions[rel.targetDatasetId];
              if (!srcPos || !tgtPos) return null;

              // Simple center-to-center routing (in a real app we'd attach to specific columns)
              // Node width is approx 280, height is approx variable based on columns (say 200)
              const x1 = srcPos.x + 140;
              const y1 = srcPos.y + 100;
              const x2 = tgtPos.x + 140;
              const y2 = tgtPos.y + 100;

              const isSelected = selectedRel?.id === rel.id;
              const strokeColor = isSelected 
                ? '#3b82f6' 
                : rel.status === 'accepted' ? '#10b981' : '#94a3b8';

              return (
                <g key={rel.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedRel(rel)}>
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke="transparent" strokeWidth={20} 
                  />
                  <line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={strokeColor} 
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={rel.status === 'pending' ? '5,5' : 'none'}
                    className="transition-colors"
                  />
                  {/* Midpoint bubble for confidence */}
                  <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r={14} fill="white" className="dark:fill-zinc-900" stroke={strokeColor} strokeWidth={2} />
                  <text x={(x1+x2)/2} y={(y1+y2)/2} textAnchor="middle" dominantBaseline="central" fontSize="10" fill={strokeColor} fontWeight="bold">
                    {rel.confidence}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {datasets.map(dataset => {
            const pos = positions[dataset.id] || { x: 0, y: 0 };
            const isExpanded = expandedNodes[dataset.id];
            return (
              <div 
                key={dataset.id}
                className="table-node absolute glass-panel glass-card shadow-lg w-[280px] select-none"
                style={{ left: pos.x, top: pos.y }}
              >
                <div 
                  className={cn("bg-zinc-50/50 dark:bg-zinc-900/50 px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 cursor-move flex items-center justify-between", isExpanded ? "rounded-t-xl" : "rounded-xl border-b-0")}
                  onPointerDown={(e) => startNodeDrag(e, dataset.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <button 
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={() => setExpandedNodes(prev => ({ ...prev, [dataset.id]: !prev[dataset.id] }))}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                    </button>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1">{dataset.name}</h4>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded ml-2 shrink-0">
                    {dataset.type}
                  </span>
                </div>
                {isExpanded && (
                  <div className="p-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                    {dataset.headers.map(header => {
                      const isKey = activeRelationships.some(s => 
                        (s.sourceDatasetId === dataset.id && s.sourceColumn === header) ||
                        (s.targetDatasetId === dataset.id && s.targetColumn === header)
                      );
                      
                      return (
                        <div key={header} className="flex items-center justify-between py-1.5 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded">
                          <span className={cn("text-sm truncate", isKey ? "font-medium text-blue-600 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400")}>
                            {header}
                          </span>
                          {isKey && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Panel for details */}
      {selectedRel && (
        <RelationshipDetails 
          relationship={selectedRel}
          sourceDataset={datasets.find(d => d.id === selectedRel.sourceDatasetId)!}
          targetDataset={datasets.find(d => d.id === selectedRel.targetDatasetId)!}
          onClose={() => setSelectedRel(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
