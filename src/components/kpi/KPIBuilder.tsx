import React, { useState, useMemo, useEffect } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import * as RGL from 'react-grid-layout';
import {
  Dataset,
  KpiDefinition,
  KpiAggregation,
  ComparisonType,
  KpiFormatConfig,
} from '@/types';
import {
  evaluateKpi,
  validateKpiDefinition,
} from '@/lib/kpiEngine';
import {
  addOrUpdateKpi,
} from '@/lib/kpiStorage';
import {
  Copy,
  Trash2,
  Plus,
  Settings2,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KPISettingsPanel } from './KPISettingsPanel';
import { cn } from '@/lib/utils';

const { Responsive, WidthProvider } = RGL as any;
const ResponsiveGridLayout = WidthProvider(Responsive);

interface KPIBuilderProps {
  datasets: Dataset[];
  savedKpis: KpiDefinition[];
  setSavedKpis: React.Dispatch<React.SetStateAction<KpiDefinition[]>>;
  onAddToDashboard?: (kpi: KpiDefinition) => void;
}

export function KPIBuilder({ datasets, savedKpis, setSavedKpis, onAddToDashboard }: KPIBuilderProps) {
  const [activeDatasetId, setActiveDatasetId] = useState<string>(datasets[0]?.id || '');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formColumn, setFormColumn] = useState<string>(datasets[0]?.headers[0] || '');
  const [formAggregation, setFormAggregation] = useState<KpiAggregation>('sum');
  const [formComparison, setFormComparison] = useState<ComparisonType>('None');
  const [formDateColumn, setFormDateColumn] = useState<string>('');
  const [formTarget, setFormTarget] = useState<number | ''>('');
  const [isTargetEnabled, setIsTargetEnabled] = useState<boolean>(false);
  const [formFormat, setFormFormat] = useState<KpiFormatConfig>({ 
    type: 'number', 
    decimals: 2, 
    compactNotation: false, 
    useThousandsSeparator: true 
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null);
  const [formFilters, setFormFilters] = useState<any[]>([]);
  const [formDateRange, setFormDateRange] = useState<any>({ type: 'all' });

  const activeDataset = useMemo(
    () => datasets.find((d) => d.id === activeDatasetId) || datasets[0],
    [datasets, activeDatasetId]
  );

  useEffect(() => {
    if (activeDataset && !activeDataset.headers.includes(formColumn)) {
      setFormColumn(activeDataset.headers[0] || '');
    }
    if (activeDataset && !activeDataset.headers.includes(formDateColumn)) {
        setFormDateColumn(activeDataset.headers.find(h => h.toLowerCase().includes('date')) || activeDataset.headers[0] || '');
    }
  }, [activeDataset]);

  const livePreviewDefinition: KpiDefinition = useMemo(() => ({
    id: 'preview-temp',
    name: formName || 'New Metric',
    description: formDescription,
    datasetId: activeDatasetId,
    datasetName: activeDataset?.name,
    metricType: 'simple',
    column: formColumn,
    aggregation: formAggregation,
    comparison: formComparison,
    dateColumn: formDateColumn,
    dateRange: formDateRange,
    timeGranularity: 'month',
    targetValue: isTargetEnabled ? (Number(formTarget) || 0) : undefined,
    filters: formFilters,
    format: formFormat,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }), [formName, formDescription, activeDatasetId, activeDataset?.name, formColumn, formAggregation, formComparison, formDateColumn, formDateRange, isTargetEnabled, formTarget, formFormat, formFilters]);

  const handleSave = async () => {
    const validation = validateKpiDefinition(livePreviewDefinition, datasets, savedKpis);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    
    const kpiToSave: KpiDefinition = {
      ...livePreviewDefinition,
      id: `kpi-${Date.now()}`,
      layout: { x: 0, y: Infinity, w: 3, h: 2 }
    };
    
    const updated = await addOrUpdateKpi(kpiToSave);
    setSavedKpis(updated);
    setFormErrors([]);
    setFormName('');
    setFormDescription('');
    setFormTarget('');
    setIsTargetEnabled(false);
    setFormFilters([]);
    setFormDateRange({ type: 'all' });
  };

  const onLayoutChange = (currentLayout: any[]) => {
    const updatedKpis = savedKpis.map(kpi => {
      const item = currentLayout.find((l) => l.i === kpi.id);
      if (item) {
        return { 
          ...kpi, 
          layout: { x: item.x, y: item.y, w: item.w, h: item.h } 
        };
      }
      return kpi;
    });
    
    const hasChanged = JSON.stringify(updatedKpis.map(k => k.layout)) !== JSON.stringify(savedKpis.map(k => k.layout));
    if (hasChanged) {
        setSavedKpis(updatedKpis);
    }
  };

  const handleDuplicate = async (kpi: KpiDefinition) => {
    const newKpi: KpiDefinition = { 
      ...kpi, 
      id: `kpi-${Date.now()}`, 
      name: `${kpi.name} (Copy)`,
      layout: kpi.layout ? { ...kpi.layout, y: kpi.layout.y + kpi.layout.h } : { x: 0, y: Infinity, w: 3, h: 2 }
    };
    const updated = await addOrUpdateKpi(newKpi);
    setSavedKpis(updated);
  };

  const handleDelete = (kpiId: string) => {
    if (confirm('Are you sure you want to delete this KPI?')) {
        setSavedKpis(savedKpis.filter(k => k.id !== kpiId));
    }
  };

  const getFontSizeClass = (size?: string) => {
    switch (size) {
      case 'sm': return 'text-lg';
      case 'md': return 'text-xl';
      case 'lg': return 'text-3xl';
      case 'xl': return 'text-4xl';
      default: return 'text-3xl';
    }
  };

  const getRadiusClass = (radius?: string) => {
    switch (radius) {
      case 'none': return 'rounded-none';
      case 'sm': return 'rounded-sm';
      case 'md': return 'rounded-md';
      case 'lg': return 'rounded-xl';
      case 'xl': return 'rounded-3xl';
      default: return 'rounded-xl';
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPI Builder</h1>
          <p className="text-zinc-500 mt-1">Design and arrange your key performance indicators.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Creation Panel */}
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Quick Create
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Name</label>
                <input 
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    placeholder="e.g., Total Revenue" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Dataset</label>
                <select className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg" value={activeDatasetId} onChange={e => setActiveDatasetId(e.target.value)}>
                    {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Column</label>
                    <select className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg" value={formColumn} onChange={e => setFormColumn(e.target.value)}>
                        {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Aggr.</label>
                    <select className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" value={formAggregation} onChange={e => setFormAggregation(e.target.value as KpiAggregation)}>
                        <option value="sum">SUM</option>
                        <option value="avg">AVG</option>
                        <option value="count">COUNT</option>
                        <option value="distinct_count">DISTINCT</option>
                        <option value="min">MIN</option>
                        <option value="max">MAX</option>
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Comparison</label>
                    <select className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs" value={formComparison} onChange={e => setFormComparison(e.target.value as ComparisonType)}>
                        <option value="None">No Comparison</option>
                        <option value="MoM">MoM</option>
                        <option value="YoY">YoY</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
                        Target
                        <input type="checkbox" checked={isTargetEnabled} onChange={e => setIsTargetEnabled(e.target.checked)} className="w-3 h-3" />
                    </label>
                    <input 
                        type="number" 
                        disabled={!isTargetEnabled}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm disabled:opacity-50" 
                        placeholder="e.g. 1000" 
                        value={formTarget} 
                        onChange={e => setFormTarget(e.target.value ? Number(e.target.value) : '')} 
                    />
                </div>
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Create KPI
              </Button>
              
              {formErrors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-900/30">
                    {formErrors.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Canvas */}
        <div className="xl:col-span-9">
          <div className="glass-panel p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 min-h-[700px]">
             <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900 rounded-t-2xl">
                <h2 className="font-bold flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-zinc-400" />
                    KPI Design Canvas
                </h2>
                <div className="text-xs text-zinc-400">
                    Drag to arrange • Resize to fit
                </div>
             </div>

             <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: savedKpis.map(kpi => ({ 
                    i: kpi.id, 
                    x: kpi.layout?.x || 0, 
                    y: kpi.layout?.y || 0, 
                    w: kpi.layout?.w || 3, 
                    h: kpi.layout?.h || 2 
                })) }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={60}
                draggableHandle=".drag-handle"
                onLayoutChange={onLayoutChange}
                margin={[16, 16]}
             >
               {savedKpis.map(kpi => {
                 const result = evaluateKpi(kpi, datasets, savedKpis);
                 const style = kpi.style || {};
                 
                 const showTarget = kpi.displayOptions?.showTarget !== false && result.formattedTarget;
                 const showAchievement = kpi.displayOptions?.showAchievement !== false && result.targetAchievementPercentage !== undefined;
                 const showTrend = kpi.displayOptions?.showTrend !== false && typeof result.deltaPercentage === 'number';
                 const showContext = kpi.displayOptions?.showContext !== false;
                 const showMiniTrend = kpi.displayOptions?.showMiniTrend && result.historicalData && result.historicalData.length > 1;

                 // Logic for card height awareness (rgl layout h)
                 const isSmallHeight = (kpi.layout?.h || 2) < 2;
                 const isSmallWidth = (kpi.layout?.w || 3) < 3;

                 const cardBgColor = (kpi.conditionalFormatting?.enabled && result.statusColor) 
                   ? result.statusColor 
                   : (style.bgColor || 'var(--card-bg)');
                 
                 const contentColor = (kpi.conditionalFormatting?.enabled && result.statusColor)
                   ? '#ffffff' // Light text for performance states (assuming bold colors)
                   : (style.textColor || 'inherit');

                 return (
                   <div 
                    key={kpi.id} 
                    className={cn(
                        "group relative border border-zinc-200 dark:border-zinc-800 flex flex-col transition-all hover:shadow-lg overflow-hidden",
                        getRadiusClass(style.borderRadius)
                    )} 
                    style={{ 
                        backgroundColor: cardBgColor, 
                        color: contentColor,
                        textAlign: style.textAlign || 'center'
                    }}
                   >
                     {/* Drag Handle & Actions */}
                     <div className="drag-handle absolute top-0 left-0 right-0 h-8 cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end px-2 gap-1 z-20">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedKpi(kpi); }}
                            className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-md hover:bg-white dark:hover:bg-zinc-700 shadow-sm transition-all"
                            title="Edit Style"
                        >
                            <Settings2 size={14} className="text-zinc-600 dark:text-zinc-300" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(kpi); }}
                            className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-md hover:bg-white dark:hover:bg-zinc-700 shadow-sm transition-all"
                            title="Duplicate"
                        >
                            <Copy size={14} className="text-zinc-600 dark:text-zinc-300" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(kpi.id); }}
                            className="p-1.5 bg-white/90 dark:bg-zinc-800/90 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm transition-all group/del"
                            title="Delete"
                        >
                            <Trash2 size={14} className="text-zinc-600 dark:text-zinc-300 group-hover/del:text-red-500" />
                        </button>
                     </div>

                     <div className="flex-1 flex flex-col justify-center p-4 relative z-10">
                        <div className="text-[10px] font-bold opacity-70 uppercase tracking-[0.15em] mb-1 truncate px-2">
                           {kpi.name}
                        </div>
                        
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className={cn(
                                "font-mono font-black tracking-tighter leading-none transition-all",
                                getFontSizeClass(style.fontSize)
                            )}>
                                {result.formattedResult}
                            </div>

                            {!isSmallHeight && showTrend && (
                                <div className={cn(
                                    "flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5",
                                    result.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                                )}>
                                    {result.trend === 'up' ? '↑' : '↓'}
                                    {Math.abs(Number(result.deltaPercentage)).toFixed(1)}%
                                    {showContext && <span className="opacity-60 font-medium">vs {kpi.comparison}</span>}
                                </div>
                            )}
                        </div>

                        {!isSmallHeight && !isSmallWidth && (
                            <div className="mt-3 space-y-1">
                                {showTarget && (
                                    <div className="text-[10px] flex items-center justify-center gap-2 opacity-70 font-medium">
                                        <span>Target: {result.formattedTarget}</span>
                                        {showAchievement && (
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 flex items-center gap-1",
                                                result.performanceStatus === 'above' ? 'text-emerald-500' : result.performanceStatus === 'on' ? 'text-amber-500' : 'text-red-400'
                                            )}>
                                                {result.targetAchievementPercentage?.toFixed(0)}%
                                                <span className="text-[8px] uppercase font-bold opacity-80">
                                                    {result.performanceStatus === 'above' ? 'Above' : result.performanceStatus === 'on' ? 'On Track' : 'Below'}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                )}
                                
                                {showMiniTrend && result.historicalData && (
                                    <div className="h-8 w-full max-w-[120px] mx-auto opacity-60">
                                        <svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none">
                                            <polyline
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                points={result.historicalData.map((d, i) => {
                                                    const x = (i / (result.historicalData!.length - 1)) * 100;
                                                    const min = Math.min(...result.historicalData!.map(p => p.value));
                                                    const max = Math.max(...result.historicalData!.map(p => p.value));
                                                    const y = 30 - ((d.value - min) / (max - min || 1)) * 28;
                                                    return `${x},${y}`;
                                                }).join(' ')}
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        )}

                        {kpi.description && !isSmallHeight && !isSmallWidth && (
                            <div className="text-[10px] opacity-50 mt-2 truncate px-4 font-medium italic">
                                {kpi.description}
                            </div>
                        )}
                     </div>

                     <div className="px-4 pb-4 opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-[10px] h-7 hover:bg-black/10 dark:hover:bg-white/10 font-bold border border-black/5 dark:border-white/5" 
                            onClick={(e) => { e.stopPropagation(); onAddToDashboard?.(kpi); }}
                            style={{ color: contentColor === '#ffffff' ? '#ffffff' : undefined }}
                        >
                            Add to Dashboard
                        </Button>
                     </div>
                   </div>
                 );
               })}
             </ResponsiveGridLayout>
          </div>
        </div>
      </div>
      
      {selectedKpi && (
          <KPISettingsPanel 
            kpi={selectedKpi} 
            datasets={datasets}
            onClose={() => setSelectedKpi(null)} 
            onUpdate={async (updatedKpi) => {
                const updated = await addOrUpdateKpi(updatedKpi);
                setSavedKpis(updated);
                setSelectedKpi(null);
            }} 
          />
      )}
    </div>
  );
}
