import React, { useState, useEffect } from 'react';
import { WidgetConfig, WidgetType, Dataset, KpiDefinition, KpiAggregation, KpiFormatConfig } from '@/types';
import { WidgetRenderer } from './WidgetRenderer';
import { X, Check, BarChart2, TrendingUp, PieChart as PieChartIcon, Table as TableIcon, Award, Activity, DollarSign, Hash, Percent, Layers, Sliders, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      height: 'h-80'
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
    height: 'h-80'
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
            
            {/* Widget Type Selection */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
                1. Select Widget Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'kpi', label: 'KPI Card', icon: Activity },
                  { type: 'bar', label: 'Bar Chart', icon: BarChart2 },
                  { type: 'line', label: 'Line Chart', icon: TrendingUp },
                  { type: 'area', label: 'Area Chart', icon: Layers },
                  { type: 'donut', label: 'Donut / Pie', icon: PieChartIcon },
                  { type: 'ranking_table', label: 'Ranking List', icon: Award },
                  { type: 'table', label: 'Data Table', icon: TableIcon },
                ].map(item => {
                  const Icon = item.icon;
                  const selected = widgetType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setWidgetType(item.type as WidgetType)}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all",
                        selected 
                          ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold shadow-xs" 
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
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
