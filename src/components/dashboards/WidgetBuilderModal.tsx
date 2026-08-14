import React, { useState, useEffect } from 'react';
import { WidgetConfig, WidgetType, Dataset, KpiDefinition, KpiAggregation, KpiFormatConfig } from '@/types';
import { WidgetRenderer } from './WidgetRenderer';
import { X, Check, BarChart2, TrendingUp, PieChart as PieChartIcon, Table as TableIcon, Award, Activity, DollarSign, Hash, Percent, Layers, Sliders, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isDateColumn } from '@/lib/dateIntelligence';

interface WidgetBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: WidgetConfig) => void;
  datasets: Dataset[];
  savedKpis: KpiDefinition[];
  activeDatasetId: string;
  initialWidget?: WidgetConfig | null;
}

export function WidgetBuilderModal({
  isOpen,
  onClose,
  onSave,
  datasets,
  savedKpis,
  activeDatasetId,
  initialWidget
}: WidgetBuilderModalProps) {
  if (!isOpen) return null;

  const primaryDataset = datasets.find(d => d.id === activeDatasetId) || datasets[0];

  const [widgetType, setWidgetType] = useState<WidgetType>(initialWidget?.type || 'bar');
  const [dateAggregation, setDateAggregation] = useState<'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year' | undefined>(initialWidget?.dateAggregation);
  const [comparisonType, setComparisonType] = useState<'none' | 'yoy' | 'mom'>(initialWidget?.comparisonType || 'none');
  const [title, setTitle] = useState(initialWidget?.title || '');
  const [subtitle, setSubtitle] = useState(initialWidget?.subtitle || '');
  const [datasetId, setDatasetId] = useState(initialWidget?.datasetId || activeDatasetId);
  const [kpiId, setKpiId] = useState<string>(initialWidget?.kpiId || '');

  // Dimension & Metric
  const [xAxisColumn, setXAxisColumn] = useState<string>(initialWidget?.xAxisColumn || '');
  const [yAxisColumn, setYAxisColumn] = useState<string>(initialWidget?.yAxisColumn || '');
  const [aggregation, setAggregation] = useState<KpiAggregation>((initialWidget?.aggregation as any) || 'sum');
  const [topN, setTopN] = useState<number>(initialWidget?.topN || 0);
  const [gridSpan, setGridSpan] = useState<number>(initialWidget?.gridSpan || 2);

  const [lineMetric, setLineMetric] = useState<string>(initialWidget?.lineMetric || '');
  const [lineAggregation, setLineAggregation] = useState<KpiAggregation>(initialWidget?.lineAggregation || 'avg');
  const [lineAxis, setLineAxis] = useState<'primary' | 'secondary'>(initialWidget?.lineAxis || 'secondary');
  const [lineStyle, setLineStyle] = useState<'smooth' | 'straight' | 'step'>(initialWidget?.lineStyle || 'smooth');
  const [areaFill, setAreaFill] = useState<boolean>(initialWidget?.areaFill ?? false);
  const [showDataPoints, setShowDataPoints] = useState<'auto' | 'always' | 'never'>(initialWidget?.showDataPoints || 'auto');
  const [breakdownColumn, setBreakdownColumn] = useState<string>(initialWidget?.breakdownColumn || '');
  const [stageOrderInput, setStageOrderInput] = useState<string>(initialWidget?.stageOrder ? initialWidget.stageOrder.join(', ') : '');

  // Gauge & Scatter specific states
  const [gaugeTarget, setGaugeTarget] = useState<number>(initialWidget?.gaugeTarget ?? 100000);
  const [gaugeTargetMode, setGaugeTargetMode] = useState<'manual' | 'kpi'>(initialWidget?.gaugeTargetMode || 'manual');
  const [gaugeMin, setGaugeMin] = useState<number | 'auto'>(initialWidget?.gaugeMin ?? 'auto');
  const [gaugeMax, setGaugeMax] = useState<number | 'auto'>(initialWidget?.gaugeMax ?? 'auto');

  const [scatterXAxis, setScatterXAxis] = useState<string>(initialWidget?.scatterXAxis || '');
  const [scatterYAxis, setScatterYAxis] = useState<string>(initialWidget?.scatterYAxis || '');
  const [scatterSize, setScatterSize] = useState<string>(initialWidget?.scatterSize || '');
  const [scatterGroup, setScatterGroup] = useState<string>(initialWidget?.scatterGroup || '');
  const [scatterAggregation, setScatterAggregation] = useState<KpiAggregation>(initialWidget?.scatterAggregation || 'sum');
  const [showTrendLine, setShowTrendLine] = useState<boolean>(initialWidget?.showTrendLine ?? false);
  const [xScaleType, setXScaleType] = useState<'linear' | 'log'>(initialWidget?.xScaleType || 'linear');
  const [yScaleType, setYScaleType] = useState<'linear' | 'log'>(initialWidget?.yScaleType || 'linear');

  // Heatmap & Matrix specific states
  const [colorScale, setColorScale] = useState<'sequential' | 'diverging'>(initialWidget?.colorScale || 'sequential');
  const [showTotals, setShowTotals] = useState<boolean>(initialWidget?.showTotals ?? true);
  const [showSubtotals, setShowSubtotals] = useState<boolean>(initialWidget?.showSubtotals ?? true);
  const [matrixRowHierarchy, setMatrixRowHierarchy] = useState<string>(initialWidget?.matrixRowHierarchy || '');
  const [secondaryMetric, setSecondaryMetric] = useState<string>(initialWidget?.secondaryMetric || '');
  const [secondaryAggregation, setSecondaryAggregation] = useState<KpiAggregation>(initialWidget?.secondaryAggregation || 'sum');
  const [matrixConditionalFormat, setMatrixConditionalFormat] = useState<'databars' | 'background' | 'none'>(initialWidget?.matrixConditionalFormat || 'background');

  // Active side panel tab
  const [activeTab, setActiveTab] = useState<'data' | 'style'>('data');

  // Customization States
  const [primaryColor, setPrimaryColor] = useState<string>(initialWidget?.primaryColor || '#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState<string>(initialWidget?.secondaryColor || '#10b981');
  const [themePalette, setThemePalette] = useState<'professional' | 'ocean' | 'sunset' | 'emerald' | 'amber' | 'custom'>(initialWidget?.themePalette || 'professional');
  const [chartTitleSize, setChartTitleSize] = useState<'sm' | 'md' | 'lg'>(initialWidget?.chartTitleSize || 'md');
  const [chartTitleWeight, setChartTitleWeight] = useState<'normal' | 'medium' | 'bold' | 'black'>(initialWidget?.chartTitleWeight || 'bold');
  const [axisLabelSize, setAxisLabelSize] = useState<'sm' | 'md' | 'lg'>(initialWidget?.axisLabelSize || 'sm');
  const [dataLabelSize, setDataLabelSize] = useState<'sm' | 'md' | 'lg'>(initialWidget?.dataLabelSize || 'sm');
  const [legendSize, setLegendSize] = useState<'sm' | 'md' | 'lg'>(initialWidget?.legendSize || 'sm');
  const [showLegend, setShowLegend] = useState<boolean>(initialWidget?.showLegend ?? true);
  const [showGridLines, setShowGridLines] = useState<boolean>(initialWidget?.showGridLines ?? true);
  const [borderOn, setBorderOn] = useState<boolean>(initialWidget?.borderOn ?? true);
  const [borderRadius, setBorderRadius] = useState<'none' | 'sm' | 'md' | 'lg' | 'xl'>(initialWidget?.borderRadius || 'xl');
  const [borderIntensity, setBorderIntensity] = useState<'light' | 'medium' | 'strong'>(initialWidget?.borderIntensity || 'light');
  const [subtleShadow, setSubtleShadow] = useState<'none' | 'sm' | 'md' | 'lg'>(initialWidget?.subtleShadow || 'sm');
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(initialWidget?.backgroundOpacity ?? 100);
  const [internalPadding, setInternalPadding] = useState<'sm' | 'md' | 'lg'>(initialWidget?.internalPadding || 'md');

  // Apply Preset Palette effect
  useEffect(() => {
    if (themePalette === 'professional') {
      setPrimaryColor('#3b82f6');
      setSecondaryColor('#475569');
    } else if (themePalette === 'ocean') {
      setPrimaryColor('#0284c7');
      setSecondaryColor('#0f766e');
    } else if (themePalette === 'sunset') {
      setPrimaryColor('#f97316');
      setSecondaryColor('#e11d48');
    } else if (themePalette === 'emerald') {
      setPrimaryColor('#10b981');
      setSecondaryColor('#047857');
    } else if (themePalette === 'amber') {
      setPrimaryColor('#f59e0b');
      setSecondaryColor('#d97706');
    }
  }, [themePalette]);

  // Formatting Config
  const [formatType, setFormatType] = useState<'number' | 'currency' | 'percentage' | 'decimal'>(initialWidget?.format?.type || 'currency');
  const [currencySymbol, setCurrencySymbol] = useState(initialWidget?.format?.currencySymbol || '$');
  const [decimals, setDecimals] = useState(initialWidget?.format?.decimals ?? 0);
  const [useThousands, setUseThousands] = useState(initialWidget?.format?.useThousandsSeparator ?? true);
  const [compact, setCompact] = useState(initialWidget?.format?.compactNotation ?? true);

  const selectedDataset = datasets.find(d => d.id === datasetId || d.name === datasetId) || primaryDataset;
  const headers = selectedDataset ? selectedDataset.headers : [];

  // Default dimension & metric columns if empty
  useEffect(() => {
    if (selectedDataset && !xAxisColumn) {
      const catCol = Object.entries(selectedDataset.columnProfiles).find(([_, p]) => p.type === 'categorical' || p.type === 'text' || p.type === 'date')?.[0];
      if (catCol) setXAxisColumn(catCol);
      else if (headers.length > 0) setXAxisColumn(headers[0]);
    }
    if (selectedDataset && !yAxisColumn) {
      const numCol = Object.entries(selectedDataset.columnProfiles).find(([_, p]) => p.type === 'numeric')?.[0];
      if (numCol) setYAxisColumn(numCol);
      else if (headers.length > 1) setYAxisColumn(headers[1]);
    }
  }, [selectedDataset]);

  // Handle saved KPI selection
  useEffect(() => {
    if (widgetType === 'kpi' && kpiId) {
      const k = savedKpis.find(item => item.id === kpiId);
      if (k) {
        setTitle(k.name);
        setSubtitle(k.description || `Evaluated from ${k.datasetName || 'Active Dataset'}`);
      }
    }
  }, [kpiId, widgetType]);

  // Default title auto-fill
  useEffect(() => {
    if (!initialWidget && !title) {
      if (widgetType === 'kpi') setTitle('Key Metric Indicator');
      else if (xAxisColumn && yAxisColumn) setTitle(`${(aggregation || 'sum').toUpperCase()} of ${yAxisColumn} by ${xAxisColumn}`);
    }
  }, [widgetType, xAxisColumn, yAxisColumn, aggregation]);

  const isDateColSelected = isDateColumn(selectedDataset, xAxisColumn);

  const handleSave = () => {
    if (!title.trim()) return;

    const formatConfig: KpiFormatConfig = {
      type: formatType,
      currencySymbol,
      decimals,
      useThousandsSeparator: useThousands,
      compactNotation: compact
    };

    const newWidget: WidgetConfig = {
      id: initialWidget?.id || `w-${Date.now()}`,
      type: widgetType,
      title: title.trim(),
      subtitle: subtitle.trim(),
      datasetId: datasetId || activeDatasetId,
      kpiId: widgetType === 'kpi' ? kpiId : undefined,
      xAxisColumn: widgetType !== 'kpi' ? xAxisColumn : undefined,
      yAxisColumn: widgetType === 'kpi' ? (yAxisColumn || 'Revenue') : yAxisColumn,
      aggregation,
      topN: topN !== 0 ? topN : undefined,
      format: formatConfig,
      gridSpan,
      height: 'h-80',
      dateAggregation: widgetType !== 'kpi' && isDateColSelected ? (dateAggregation || 'month') : undefined,
      comparisonType: widgetType === 'kpi' ? comparisonType : undefined,
      primaryColor,
      secondaryColor,
      themePalette,
      chartTitleSize,
      chartTitleWeight,
      axisLabelSize,
      dataLabelSize,
      legendSize,
      showLegend,
      showGridLines,
      borderOn,
      borderRadius,
      borderIntensity,
      subtleShadow,
      backgroundOpacity,
      internalPadding,
      lineMetric: widgetType === 'combo' ? lineMetric : undefined,
      lineAggregation: widgetType === 'combo' ? lineAggregation : undefined,
      lineAxis: widgetType === 'combo' ? lineAxis : undefined,
      lineStyle: widgetType === 'line' ? lineStyle : undefined,
      areaFill: widgetType === 'line' ? areaFill : undefined,
      showDataPoints: widgetType === 'line' ? showDataPoints : undefined,
      breakdownColumn: (widgetType === 'line' || widgetType === 'scatter' || widgetType === 'heatmap' || widgetType === 'matrix') ? breakdownColumn : undefined,
      stageOrder: widgetType === 'funnel' && stageOrderInput.trim() ? stageOrderInput.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      gaugeTarget: widgetType === 'gauge' ? gaugeTarget : undefined,
      gaugeTargetMode: widgetType === 'gauge' ? gaugeTargetMode : undefined,
      gaugeMin: widgetType === 'gauge' ? gaugeMin : undefined,
      gaugeMax: widgetType === 'gauge' ? gaugeMax : undefined,
      scatterXAxis: widgetType === 'scatter' ? scatterXAxis : undefined,
      scatterYAxis: widgetType === 'scatter' ? scatterYAxis : undefined,
      scatterSize: widgetType === 'scatter' ? scatterSize : undefined,
      scatterGroup: widgetType === 'scatter' ? scatterGroup : undefined,
      scatterAggregation: widgetType === 'scatter' ? scatterAggregation : undefined,
      showTrendLine: widgetType === 'scatter' ? showTrendLine : undefined,
      xScaleType: widgetType === 'scatter' ? xScaleType : undefined,
      yScaleType: widgetType === 'scatter' ? yScaleType : undefined,
      colorScale: widgetType === 'heatmap' ? colorScale : undefined,
      showTotals: (widgetType === 'heatmap' || widgetType === 'matrix') ? showTotals : undefined,
      showSubtotals: widgetType === 'matrix' ? showSubtotals : undefined,
      matrixRowHierarchy: widgetType === 'matrix' ? matrixRowHierarchy : undefined,
      secondaryMetric: widgetType === 'matrix' ? secondaryMetric : undefined,
      secondaryAggregation: widgetType === 'matrix' ? secondaryAggregation : undefined,
      matrixConditionalFormat: widgetType === 'matrix' ? matrixConditionalFormat : undefined,
    };

    onSave(newWidget);
    onClose();
  };

  // Construct draft widget config for Live Preview
  const previewWidgetConfig: WidgetConfig = {
    id: 'preview-widget',
    type: widgetType,
    title: title || 'Widget Preview Title',
    subtitle: subtitle || 'Subtitle or metric context',
    datasetId: datasetId || activeDatasetId,
    kpiId: widgetType === 'kpi' ? kpiId : undefined,
    xAxisColumn: widgetType !== 'kpi' ? xAxisColumn : undefined,
    yAxisColumn,
    aggregation,
    topN: topN !== 0 ? topN : undefined,
    format: {
      type: formatType,
      currencySymbol,
      decimals,
      useThousandsSeparator: useThousands,
      compactNotation: compact
    },
    gridSpan,
    height: 'h-80',
    dateAggregation: widgetType !== 'kpi' && isDateColSelected ? (dateAggregation || 'month') : undefined,
    comparisonType: widgetType === 'kpi' ? comparisonType : undefined,
    primaryColor,
    secondaryColor,
    themePalette,
    chartTitleSize,
    chartTitleWeight,
    axisLabelSize,
    dataLabelSize,
    legendSize,
    showLegend,
    showGridLines,
    borderOn,
    borderRadius,
    borderIntensity,
    subtleShadow,
    backgroundOpacity,
    internalPadding,
    lineMetric: widgetType === 'combo' ? lineMetric : undefined,
    lineAggregation: widgetType === 'combo' ? lineAggregation : undefined,
    lineAxis: widgetType === 'combo' ? lineAxis : undefined,
    lineStyle: widgetType === 'line' ? lineStyle : undefined,
    areaFill: widgetType === 'line' ? areaFill : undefined,
    showDataPoints: widgetType === 'line' ? showDataPoints : undefined,
    breakdownColumn: (widgetType === 'line' || widgetType === 'scatter' || widgetType === 'heatmap' || widgetType === 'matrix') ? breakdownColumn : undefined,
    stageOrder: widgetType === 'funnel' && stageOrderInput.trim() ? stageOrderInput.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    gaugeTarget: widgetType === 'gauge' ? gaugeTarget : undefined,
    gaugeTargetMode: widgetType === 'gauge' ? gaugeTargetMode : undefined,
    gaugeMin: widgetType === 'gauge' ? gaugeMin : undefined,
    gaugeMax: widgetType === 'gauge' ? gaugeMax : undefined,
    scatterXAxis: widgetType === 'scatter' ? scatterXAxis : undefined,
    scatterYAxis: widgetType === 'scatter' ? scatterYAxis : undefined,
    scatterSize: widgetType === 'scatter' ? scatterSize : undefined,
    scatterGroup: widgetType === 'scatter' ? scatterGroup : undefined,
    scatterAggregation: widgetType === 'scatter' ? scatterAggregation : undefined,
    showTrendLine: widgetType === 'scatter' ? showTrendLine : undefined,
    xScaleType: widgetType === 'scatter' ? xScaleType : undefined,
    yScaleType: widgetType === 'scatter' ? yScaleType : undefined,
    colorScale: widgetType === 'heatmap' ? colorScale : undefined,
    showTotals: (widgetType === 'heatmap' || widgetType === 'matrix') ? showTotals : undefined,
    showSubtotals: widgetType === 'matrix' ? showSubtotals : undefined,
    matrixRowHierarchy: widgetType === 'matrix' ? matrixRowHierarchy : undefined,
    secondaryMetric: widgetType === 'matrix' ? secondaryMetric : undefined,
    secondaryAggregation: widgetType === 'matrix' ? secondaryAggregation : undefined,
    matrixConditionalFormat: widgetType === 'matrix' ? matrixConditionalFormat : undefined,
  };

  const isFormValid = title.trim() !== '' && (
    widgetType === 'kpi' ? (kpiId !== '' || yAxisColumn !== '') : (xAxisColumn !== '' && yAxisColumn !== '')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              {initialWidget ? 'Edit Widget Configuration' : 'Add New Dashboard Widget'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Configure visualization type, dimensions, metrics, formatting, and grid layout.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Modal Body: Left controls, Right live preview */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto">
          
          {/* Controls Panel */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 space-y-6 custom-scrollbar">
            
            {/* Tabs for Data vs Styling */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950 sticky top-0 z-10 pb-2 mb-1 gap-2">
              <button
                key="data-tab"
                type="button"
                onClick={() => setActiveTab('data')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-all border-b-2 text-center",
                  activeTab === 'data'
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                )}
              >
                📊 Data & Config
              </button>
              <button
                key="style-tab"
                type="button"
                onClick={() => setActiveTab('style')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-all border-b-2 text-center",
                  activeTab === 'style'
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700"
                )}
              >
                🎨 Style & Layout
              </button>
            </div>

            {activeTab === 'data' && (
              <div className="space-y-6">
                {/* Widget Type Selection */}
                <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                1. Select Widget Type
              </label>

              {/* Core Visuals */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Core Visuals</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'kpi', label: 'KPI Card', icon: Activity },
                    { type: 'bar', label: 'Bar Chart', icon: BarChart2 },
                    { type: 'column', label: 'Column Chart', icon: BarChart2 },
                    { type: 'line', label: 'Line Chart', icon: TrendingUp },
                    { type: 'area', label: 'Area Chart', icon: Layers },
                    { type: 'donut', label: 'Donut Chart', icon: PieChartIcon },
                    { type: 'pie', label: 'Pie Chart', icon: PieChartIcon },
                  ].map(item => {
                    const Icon = item.icon;
                    const selected = widgetType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setWidgetType(item.type as WidgetType)}
                        className={cn(
                          "p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all",
                          selected 
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold shadow-xs" 
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", selected ? "text-blue-600 dark:text-blue-400" : "text-zinc-400")} />
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Analytical Visuals */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Analytical Visuals</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'combo', label: 'Combo Chart', icon: TrendingUp, isImplemented: true },
                    { type: 'scatter', label: 'Scatter Plot', icon: BarChart2, isImplemented: true },
                    { type: 'waterfall', label: 'Waterfall', icon: Layers, isImplemented: true },
                    { type: 'gauge', label: 'Gauge Meter', icon: Activity, isImplemented: true },
                    { type: 'funnel', label: 'Funnel Stage', icon: Sliders, isImplemented: true },
                    { type: 'heatmap', label: 'Heatmap Grid', icon: Sliders, isImplemented: true },
                  ].map(item => {
                    const Icon = item.icon;
                    const selected = widgetType === item.type;
                    return item.isImplemented ? (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setWidgetType(item.type as WidgetType)}
                        className={cn(
                          "p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all",
                          selected 
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold shadow-xs" 
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", selected ? "text-blue-600 dark:text-blue-400" : "text-zinc-400")} />
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    ) : (
                      <div
                        key={item.type}
                        className="p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10 text-center flex flex-col items-center justify-center gap-1.5 opacity-45 relative overflow-hidden"
                      >
                        <Icon className="w-4 h-4 text-zinc-400" />
                        <span className="text-[11px] text-zinc-400 leading-tight">{item.label}</span>
                        <span className="text-[7px] font-black uppercase text-zinc-400 tracking-wider bg-zinc-150 dark:bg-zinc-800 px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 mt-1">Soon</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Category */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Data Tables</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'table', label: 'Data Table', icon: TableIcon, isImplemented: true },
                    { type: 'ranking_table', label: 'Ranking List', icon: Award, isImplemented: true },
                    { type: 'matrix', label: 'Pivot Matrix', icon: TableIcon, isImplemented: true },
                  ].map(item => {
                    const Icon = item.icon;
                    const selected = widgetType === item.type;
                    return item.isImplemented ? (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setWidgetType(item.type as WidgetType)}
                        className={cn(
                          "p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all",
                          selected 
                            ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold shadow-xs" 
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-350"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", selected ? "text-blue-600 dark:text-blue-400" : "text-zinc-400")} />
                        <span className="text-[11px] leading-tight">{item.label}</span>
                      </button>
                    ) : (
                      <div
                        key={item.type}
                        className="p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10 text-center flex flex-col items-center justify-center gap-1.5 opacity-45 relative overflow-hidden"
                      >
                        <Icon className="w-4 h-4 text-zinc-400" />
                        <span className="text-[11px] text-zinc-400 leading-tight">{item.label}</span>
                        <span className="text-[7px] font-black uppercase text-zinc-400 tracking-wider bg-zinc-150 dark:bg-zinc-800 px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 mt-1">Soon</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                2. General Details
              </label>
              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Widget Title *</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly Revenue Trend"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Subtitle / Description (Optional)</label>
                <input 
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Evaluated across completed customer orders"
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Data Source & Fields */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                3. Data Mapping & Aggregation
              </label>

              {/* Dataset Selector */}
              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Source Dataset</label>
                <select
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.rowCount.toLocaleString()} rows)</option>
                  ))}
                </select>
              </div>

              {/* KPI Link Selection if type is 'kpi' */}
              {widgetType === 'kpi' ? (
                <div className="space-y-3">
                  {savedKpis.length > 0 && (
                    <div>
                      <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Link Saved KPI (Recommended)</label>
                      <select
                        value={kpiId}
                        onChange={(e) => setKpiId(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Custom Field Metric --</option>
                        {savedKpis.map(k => (
                          <option key={k.id} value={k.id}>{k.name} ({k.metricType === 'calculated' ? 'Formula' : k.column})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!kpiId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Metric Column</label>
                        <select
                          value={yAxisColumn}
                          onChange={(e) => setYAxisColumn(e.target.value)}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Aggregation</label>
                        <select
                          value={aggregation}
                          onChange={(e) => setAggregation(e.target.value as KpiAggregation)}
                          className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="sum">SUM</option>
                          <option value="avg">AVERAGE</option>
                          <option value="count">COUNT</option>
                          <option value="distinct_count">DISTINCT COUNT</option>
                          <option value="min">MIN</option>
                          <option value="max">MAX</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Trend / Comparison Type */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-1.5 animate-fadeIn">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">📈 Trend / Comparison Mode</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['none', 'mom', 'yoy'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setComparisonType(mode)}
                          className={cn(
                            "py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all",
                            comparisonType === mode
                              ? "bg-blue-600 border-blue-600 text-white shadow-3xs"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          {mode === 'none' ? 'No Comparison' : mode === 'mom' ? 'MoM Trend' : 'YoY Trend'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Dimension & Metric for Charts / Tables */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Dimension / Category Column (X-Axis)</label>
                    <select
                      value={xAxisColumn}
                      onChange={(e) => setXAxisColumn(e.target.value)}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {isDateColSelected && (
                    <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-blue-700 dark:text-blue-400 font-bold block">📅 Date Granularity</label>
                        <span className="text-[10px] text-blue-500 font-medium">Professional BI X-Axis</span>
                      </div>
                      <select
                        value={dateAggregation || 'auto'}
                        onChange={(e) => setDateAggregation(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      >
                        <option value="auto">Auto (Adaptive)</option>
                        <option value="day">Day (e.g. Jan 15, 2025)</option>
                        <option value="week">Week (e.g. Wk Jan 12, 2025)</option>
                        <option value="month">Month (e.g. Jan 2025)</option>
                        <option value="quarter">Quarter (e.g. Q1 2025)</option>
                        <option value="year">Year (e.g. 2025)</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Metric Column (Y-Axis)</label>
                      <select
                        value={yAxisColumn}
                        onChange={(e) => setYAxisColumn(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Aggregation</label>
                      <select
                        value={aggregation}
                        onChange={(e) => setAggregation(e.target.value as KpiAggregation)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="sum">SUM</option>
                        <option value="avg">AVERAGE</option>
                        <option value="count">COUNT</option>
                        <option value="distinct_count">DISTINCT COUNT</option>
                        <option value="min">MIN</option>
                        <option value="max">MAX</option>
                      </select>
                    </div>
                  </div>

                  {/* Top N / Bottom N Option */}
                  <div>
                    <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Limit Category Rows (Top/Bottom N)</label>
                    <select
                      value={topN}
                      onChange={(e) => setTopN(Number(e.target.value))}
                      className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Show All Categories</option>
                      <option value={5}>Top 5 Performers</option>
                      <option value={10}>Top 10 Performers</option>
                      <option value={20}>Top 20 Performers</option>
                      <option value={-5}>Bottom 5 Performers</option>
                      <option value={-10}>Bottom 10 Performers</option>
                    </select>
                  </div>

                  {/* Combo Chart Specific Options */}
                  {widgetType === 'combo' && (
                    <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">📊 Combo Chart Configuration</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Line Series Metric</label>
                          <select
                            value={lineMetric}
                            onChange={(e) => setLineMetric(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- Select Line Metric --</option>
                            {headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Line Aggregation</label>
                          <select
                            value={lineAggregation}
                            onChange={(e) => setLineAggregation(e.target.value as any)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="avg">AVERAGE</option>
                            <option value="sum">SUM</option>
                            <option value="count">COUNT</option>
                            <option value="distinct_count">DISTINCT COUNT</option>
                            <option value="min">MIN</option>
                            <option value="max">MAX</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Line Axis Assignment</label>
                        <select
                          value={lineAxis}
                          onChange={(e) => setLineAxis(e.target.value as any)}
                          className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 font-semibold"
                        >
                          <option value="primary">Primary Axis (Shared Left Scale)</option>
                          <option value="secondary">Secondary Axis (Right Scale - Recommended for % / Ratios)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Advanced Line Chart Specific Options */}
                  {widgetType === 'line' && (
                    <div className="p-3 bg-blue-50/40 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/40 rounded-xl space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">📈 Advanced Line Styling</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Line Style</label>
                          <select
                            value={lineStyle}
                            onChange={(e) => setLineStyle(e.target.value as any)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="smooth">Smooth (Monotone)</option>
                            <option value="straight">Straight (Linear)</option>
                            <option value="step">Step</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Data Points</label>
                          <select
                            value={showDataPoints}
                            onChange={(e) => setShowDataPoints(e.target.value as any)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="auto">Auto (Adaptive)</option>
                            <option value="always">Always Visible</option>
                            <option value="never">Hidden</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={areaFill}
                            onChange={(e) => setAreaFill(e.target.checked)}
                            className="rounded border-zinc-300 text-blue-600"
                          />
                          Enable Area Gradient Fill Under Line
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Funnel Stage Order Configuration */}
                  {widgetType === 'funnel' && (
                    <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40 rounded-xl space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">🔻 Funnel Stage Order Configuration</span>
                      <div>
                        <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Stage Order (Comma-separated stages)</label>
                        <input
                          type="text"
                          value={stageOrderInput}
                          onChange={(e) => setStageOrderInput(e.target.value)}
                          placeholder="e.g. Visitor, Lead, Qualified, Proposal, Customer"
                          className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">Leave blank to use natural order or volume ranking.</p>
                      </div>
                    </div>
                  )}

                  {/* Gauge Configuration */}
                  {widgetType === 'gauge' && (
                    <div className="p-3 bg-violet-50/40 dark:bg-violet-950/25 border border-violet-100 dark:border-violet-900/40 rounded-xl space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider block">🎯 Gauge & Target Configuration</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Target Mode</label>
                          <select
                            value={gaugeTargetMode}
                            onChange={(e) => setGaugeTargetMode(e.target.value as any)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="manual">Manual Target</option>
                            <option value="kpi">KPI Definition Target</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Target Value</label>
                          <input
                            type="number"
                            value={gaugeTarget}
                            onChange={(e) => setGaugeTarget(Number(e.target.value))}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scatter Plot Configuration */}
                  {widgetType === 'scatter' && (
                    <div className="p-3 bg-amber-50/40 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/40 rounded-xl space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">📐 Scatter Plot Configuration</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">X-Axis Metric / Dimension</label>
                          <select
                            value={scatterXAxis}
                            onChange={(e) => setScatterXAxis(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- Select X-Axis --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Y-Axis Metric</label>
                          <select
                            value={scatterYAxis}
                            onChange={(e) => setScatterYAxis(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- Select Y-Axis --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Group / Color Dimension</label>
                          <select
                            value={breakdownColumn}
                            onChange={(e) => setBreakdownColumn(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- None (Single Series) --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Scale Type</label>
                          <select
                            value={yScaleType}
                            onChange={(e) => setYScaleType(e.target.value as any)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="linear">Linear Scale</option>
                            <option value="log">Log Scale</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={showTrendLine}
                            onChange={(e) => setShowTrendLine(e.target.checked)}
                            className="rounded border-zinc-300 text-amber-600"
                          />
                          Enable Linear Regression Trend Line ($R^2$)
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Heatmap Grid Configuration */}
                  {widgetType === 'heatmap' && (
                    <div className="p-3 bg-rose-50/40 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 rounded-xl space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">🔥 Heatmap Grid Configuration</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Column Dimension</label>
                          <select
                            value={breakdownColumn}
                            onChange={(e) => setBreakdownColumn(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- Select Column Dimension --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Color Scale</label>
                          <select
                            value={colorScale}
                            onChange={(e) => setColorScale(e.target.value as any)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="sequential">Sequential (Intensity)</option>
                            <option value="diverging">Diverging (Red - Neutral - Green)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={showTotals}
                            onChange={(e) => setShowTotals(e.target.checked)}
                            className="rounded border-zinc-300 text-rose-600"
                          />
                          Show Row, Column & Grand Totals
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Matrix Configuration */}
                  {widgetType === 'matrix' && (
                    <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">📊 Matrix & Pivot Configuration</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Column Dimension</label>
                          <select
                            value={breakdownColumn}
                            onChange={(e) => setBreakdownColumn(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- Select Column Dimension --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Secondary Row Hierarchy</label>
                          <select
                            value={matrixRowHierarchy}
                            onChange={(e) => setMatrixRowHierarchy(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- None (Single Row) --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Secondary Metric (Optional)</label>
                          <select
                            value={secondaryMetric}
                            onChange={(e) => setSecondaryMetric(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="">-- None (Single Measure) --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Conditional Formatting</label>
                          <select
                            value={matrixConditionalFormat}
                            onChange={(e) => setMatrixConditionalFormat(e.target.value as any)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200"
                          >
                            <option value="background">Heatmap Background Intensity</option>
                            <option value="databars">Data Bars</option>
                            <option value="none">Standard Plain Table</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={showTotals}
                            onChange={(e) => setShowTotals(e.target.checked)}
                            className="rounded border-zinc-300 text-indigo-600"
                          />
                          Show Totals
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          <input
                            type="checkbox"
                            checked={showSubtotals}
                            onChange={(e) => setShowSubtotals(e.target.checked)}
                            className="rounded border-zinc-300 text-indigo-600"
                          />
                          Show Subtotals
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Layout Width & Formatting */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                4. Formatting & Grid Layout
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Format Type</label>
                  <select
                    value={formatType}
                    onChange={(e) => setFormatType(e.target.value as any)}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="currency">Currency ($)</option>
                    <option value="number">Number (Standard)</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="decimal">Decimal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Grid Width Span</label>
                  <select
                    value={gridSpan}
                    onChange={(e) => setGridSpan(Number(e.target.value))}
                    className="w-full text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Quarter Width (3 Cols)</option>
                    <option value={2}>Half Width (6 Cols)</option>
                    <option value={3}>Three-Quarter Width (9 Cols)</option>
                    <option value={4}>Full Width (12 Cols)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input 
                    type="checkbox" 
                    checked={compact} 
                    onChange={(e) => setCompact(e.target.checked)}
                    className="rounded border-zinc-300 text-blue-600" 
                  />
                  Compact ($1.2M)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                  <input 
                    type="checkbox" 
                    checked={useThousands} 
                    onChange={(e) => setUseThousands(e.target.checked)}
                    className="rounded border-zinc-300 text-blue-600" 
                  />
                  Thousands Separator
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'style' && (
          <div className="space-y-5 animate-fadeIn">
                {/* section 1: Colors & Palettes */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    Theme Palette & Colors
                  </span>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'professional', label: 'Classic BI' },
                      { key: 'ocean', label: 'Ocean Blue' },
                      { key: 'sunset', label: 'Sunset Glow' },
                      { key: 'emerald', label: 'Eco Emerald' },
                      { key: 'amber', label: 'Amber Gold' },
                      { key: 'custom', label: 'Custom' }
                    ].map(pal => (
                      <button
                        key={pal.key}
                        type="button"
                        onClick={() => setThemePalette(pal.key as any)}
                        className={cn(
                          "py-2 px-1 rounded-lg border text-[11px] font-bold transition-all text-center",
                          themePalette === pal.key
                            ? "bg-blue-600 border-blue-600 text-white shadow-3xs"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        {pal.label}
                      </button>
                    ))}
                  </div>

                  {(themePalette === 'custom' || themePalette === undefined) && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 animate-fadeIn">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Primary Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={primaryColor} 
                            onChange={(e) => setPrimaryColor(e.target.value)} 
                            className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                          />
                          <input 
                            type="text" 
                            value={primaryColor} 
                            onChange={(e) => setPrimaryColor(e.target.value)} 
                            className="w-full text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 px-2 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Secondary Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={secondaryColor} 
                            onChange={(e) => setSecondaryColor(e.target.value)} 
                            className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                          />
                          <input 
                            type="text" 
                            value={secondaryColor} 
                            onChange={(e) => setSecondaryColor(e.target.value)} 
                            className="w-full text-xs font-mono bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 px-2 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* section 2: Typography */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">✍️ Typography Controls</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Title Size</label>
                      <select
                        value={chartTitleSize}
                        onChange={(e) => setChartTitleSize(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="sm">Small (12px)</option>
                        <option value="md">Medium (14px)</option>
                        <option value="lg">Large (16px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Title Weight</label>
                      <select
                        value={chartTitleWeight}
                        onChange={(e) => setChartTitleWeight(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="normal">Normal</option>
                        <option value="medium">Medium</option>
                        <option value="bold">Bold</option>
                        <option value="black">Heavy Black</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Axis Label Size</label>
                      <select
                        value={axisLabelSize}
                        onChange={(e) => setAxisLabelSize(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="sm">Small (9px)</option>
                        <option value="md">Medium (10px)</option>
                        <option value="lg">Large (11px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Data Label Size</label>
                      <select
                        value={dataLabelSize}
                        onChange={(e) => setDataLabelSize(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="sm">Small (10px)</option>
                        <option value="md">Medium (11px)</option>
                        <option value="lg">Large (12px)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* section 3: Card & Container Styles */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">🛡️ Card Frame & Container</span>
                  
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-150 dark:border-zinc-850">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-zinc-755 dark:text-zinc-300">
                      <input 
                        type="checkbox" 
                        checked={borderOn} 
                        onChange={(e) => setBorderOn(e.target.checked)}
                        className="rounded border-zinc-300 text-blue-600" 
                      />
                      Card Outer Border
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Corner Roundness</label>
                      <select
                        value={borderRadius}
                        onChange={(e) => setBorderRadius(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="none">Sharp Corners (0px)</option>
                        <option value="sm">Subtle (6px)</option>
                        <option value="md">Medium (10px)</option>
                        <option value="lg">Large (14px)</option>
                        <option value="xl">Pill Luxury (20px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Border Intensity</label>
                      <select
                        value={borderIntensity}
                        onChange={(e) => setBorderIntensity(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                        disabled={!borderOn}
                      >
                        <option value="light">Light (Slightly noticeable)</option>
                        <option value="medium">Medium (Standard)</option>
                        <option value="strong">Strong (Accent boundary)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Container Shadow</label>
                      <select
                        value={subtleShadow}
                        onChange={(e) => setSubtleShadow(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="none">No Shadow</option>
                        <option value="sm">Subtle Elevation (Small)</option>
                        <option value="md">Premium Depth (Medium)</option>
                        <option value="lg">Hover Contrast (Large)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Internal Padding</label>
                      <select
                        value={internalPadding}
                        onChange={(e) => setInternalPadding(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="sm">Compact (12px)</option>
                        <option value="md">Standard (20px)</option>
                        <option value="lg">Spacious (28px)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold">Background Opacity</label>
                      <span className="text-[10px] font-mono text-zinc-500">{backgroundOpacity}%</span>
                    </div>
                    <input 
                      type="range" 
                      min={10} 
                      max={100} 
                      step={5} 
                      value={backgroundOpacity} 
                      onChange={(e) => setBackgroundOpacity(Number(e.target.value))} 
                      className="w-full accent-blue-600 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* section 4: Grid, Legend, Visibility */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">📊 Grid lines & Legend</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-755 dark:text-zinc-300">
                      <input 
                        type="checkbox" 
                        checked={showGridLines} 
                        onChange={(e) => setShowGridLines(e.target.checked)}
                        className="rounded border-zinc-300 text-blue-600" 
                      />
                      Show Grid Lines
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-755 dark:text-zinc-300">
                      <input 
                        type="checkbox" 
                        checked={showLegend} 
                        onChange={(e) => setShowLegend(e.target.checked)}
                        className="rounded border-zinc-300 text-blue-600" 
                      />
                      Show Chart Legend
                    </label>
                  </div>

                  {showLegend && (
                    <div className="animate-fadeIn pt-1">
                      <label className="text-[10px] text-zinc-650 dark:text-zinc-400 font-bold block mb-1">Legend Font Size</label>
                      <select
                        value={legendSize}
                        onChange={(e) => setLegendSize(e.target.value as any)}
                        className="w-full text-xs bg-white dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 py-1.5 text-zinc-800 dark:text-zinc-250"
                      >
                        <option value="sm">Small (9px)</option>
                        <option value="md">Medium (10px)</option>
                        <option value="lg">Large (11px)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Live Preview Panel */}
          <div className="w-full md:w-1/2 p-6 bg-zinc-50/70 dark:bg-zinc-900/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  Live Preview
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {gridSpan === 1 ? '3 Cols' : gridSpan === 2 ? '6 Cols' : gridSpan === 3 ? '9 Cols' : '12 Cols'}
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs h-80 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title || 'Widget Title'}</h3>
                  {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
                </div>
                <div className="flex-1 mt-3 min-h-0">
                  <WidgetRenderer 
                    widget={previewWidgetConfig}
                    datasets={datasets}
                    filters={[]}
                    savedKpis={savedKpis}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!isFormValid}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {initialWidget ? 'Update Widget' : 'Add Widget to Dashboard'}
              </Button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
