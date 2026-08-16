import React, { useState, useMemo } from 'react';
import { 
  KpiDefinition, 
  KpiStyleConfig, 
  KpiFormatConfig, 
  Dataset, 
  ColumnFilter, 
  FilterOperator,
  KpiAggregation,
  FormulaToken,
  KpiDisplayOptions
} from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  X, Type, Palette, Layout, Settings2, Filter, 
  Calendar, Calculator, Plus, Trash2, Target, Eye, 
  TrendingUp, AlertCircle, CheckCircle2 
} from 'lucide-react';

interface KPISettingsPanelProps {
  kpi: KpiDefinition;
  datasets: Dataset[];
  onClose: () => void;
  onUpdate: (updatedKpi: KpiDefinition) => void;
}

export function KPISettingsPanel({ kpi, datasets, onClose, onUpdate }: KPISettingsPanelProps) {
  const [style, setStyle] = useState<KpiStyleConfig>(kpi.style || {
    fontSize: 'xl',
    titleSize: 'md',
    textAlign: 'center',
    borderRadius: 'md',
    shadow: 'sm'
  });
  const [format, setFormat] = useState<KpiFormatConfig>(kpi.format || {
    type: 'number',
    decimals: 2,
    useThousandsSeparator: true,
    compactNotation: false
  });
  const [name, setName] = useState(kpi.name);
  const [description, setDescription] = useState(kpi.description || '');
  const [metricType, setMetricType] = useState<'simple' | 'calculated'>(kpi.metricType || 'simple');
  const [column, setColumn] = useState(kpi.column || '');
  const [aggregation, setAggregation] = useState<KpiAggregation>(kpi.aggregation || 'sum');
  const [filters, setFilters] = useState<ColumnFilter[]>(kpi.filters || []);
  const [dateRange, setDateRange] = useState<{
    type: 'all' | 'year' | 'quarter' | 'month' | 'last_30_days' | 'custom';
    start?: string;
    end?: string;
  }>(kpi.dateRange || { type: 'all' });
  const [dateColumn, setDateColumn] = useState(kpi.dateColumn || '');
  
  // New target & visualization fields
  const [targetValue, setTargetValue] = useState(kpi.targetValue);
  const [displayOptions, setDisplayOptions] = useState<KpiDisplayOptions>(kpi.displayOptions || {
    showTarget: true,
    showAchievement: true,
    showTrend: true,
    showMiniTrend: false,
    showContext: true
  });
  const [conditionalFormatting, setConditionalFormatting] = useState(kpi.conditionalFormatting || {
    enabled: false,
    aboveTargetColor: '#10b981',
    onTargetColor: '#f59e0b',
    belowTargetColor: '#ef4444',
    onTargetThreshold: 95
  });
  
  // Ratio specific
  const [ratioNumerator, setRatioNumerator] = useState({ 
    column: kpi.formulaTokens?.[0]?.column || '', 
    aggregation: kpi.formulaTokens?.[0]?.aggregation || 'sum' 
  });
  const [ratioDenominator, setRatioDenominator] = useState({ 
    column: kpi.formulaTokens?.[2]?.column || '', 
    aggregation: kpi.formulaTokens?.[2]?.aggregation || 'sum' 
  });

  const activeDataset = useMemo(
    () => datasets.find((d) => d.id === kpi.datasetId) || datasets[0],
    [datasets, kpi.datasetId]
  );

  const handleUpdate = () => {
    let formulaTokens: FormulaToken[] | undefined = undefined;
    if (metricType === 'calculated') {
      formulaTokens = [
        { id: 'num', type: 'term', column: ratioNumerator.column, aggregation: ratioNumerator.aggregation as any },
        { id: 'op', type: 'operator', operator: '/' },
        { id: 'den', type: 'term', column: ratioDenominator.column, aggregation: ratioDenominator.aggregation as any }
      ];
    }

    onUpdate({ 
      ...kpi, 
      name, 
      description,
      metricType,
      column: metricType === 'simple' ? column : undefined,
      aggregation: metricType === 'simple' ? aggregation : undefined,
      filters,
      dateRange,
      dateColumn,
      formulaTokens,
      targetValue,
      displayOptions,
      conditionalFormatting,
      style, 
      format 
    });
  };

  const addFilter = () => {
    const newFilter: ColumnFilter = {
      id: `filter-${Date.now()}`,
      column: activeDataset?.headers[0] || '',
      operator: 'equals',
      value: ''
    };
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<ColumnFilter>) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Settings2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
             </div>
             <div>
                <h2 className="text-xl font-bold leading-tight">KPI Configuration</h2>
                <p className="text-xs text-zinc-500">Dataset: {activeDataset?.name}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Type className="w-4 h-4" /> Identification
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 font-medium">KPI Name</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 font-medium">Subtitle / Description</label>
                    <input 
                        type="text" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>
            </div>
          </section>

          {/* Metric Logic */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Metric Logic
            </h3>
            
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
                <button 
                    onClick={() => setMetricType('simple')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                        metricType === 'simple' ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500"
                    )}
                >
                    Simple
                </button>
                <button 
                    onClick={() => setMetricType('calculated')}
                    className={cn(
                        "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                        metricType === 'calculated' ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500"
                    )}
                >
                    Ratio (A/B)
                </button>
            </div>

            {metricType === 'simple' ? (
                <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 font-medium">Metric Column</label>
                        <select 
                            value={column} 
                            onChange={e => setColumn(e.target.value)}
                            className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        >
                            {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 font-medium">Aggregation</label>
                        <select 
                            value={aggregation} 
                            onChange={e => setAggregation(e.target.value as any)}
                            className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                        >
                            <option value="sum">SUM</option>
                            <option value="avg">AVG</option>
                            <option value="count">COUNT</option>
                            <option value="distinct_count">DISTINCT COUNT</option>
                            <option value="min">MIN</option>
                            <option value="max">MAX</option>
                        </select>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-blue-600 font-bold uppercase">Numerator (A)</label>
                            <select 
                                value={ratioNumerator.column} 
                                onChange={e => setRatioNumerator({...ratioNumerator, column: e.target.value})}
                                className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                            >
                                {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select 
                                value={ratioNumerator.aggregation} 
                                onChange={e => setRatioNumerator({...ratioNumerator, aggregation: e.target.value as any})}
                                className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                            >
                                <option value="sum">SUM</option>
                                <option value="avg">AVG</option>
                                <option value="count">COUNT</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-red-600 font-bold uppercase">Denominator (B)</label>
                            <select 
                                value={ratioDenominator.column} 
                                onChange={e => setRatioDenominator({...ratioDenominator, column: e.target.value})}
                                className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                            >
                                {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <select 
                                value={ratioDenominator.aggregation} 
                                onChange={e => setRatioDenominator({...ratioDenominator, aggregation: e.target.value as any})}
                                className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                            >
                                <option value="sum">SUM</option>
                                <option value="avg">AVG</option>
                                <option value="count">COUNT</option>
                            </select>
                        </div>
                    </div>
                    <div className="text-center text-zinc-400 font-mono text-lg">A / B</div>
                </div>
            )}
          </section>

          {/* Performance Targets */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Target className="w-4 h-4" /> Performance Target
            </h3>
            <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 font-medium">Target Value</label>
                    <input 
                        type="number" 
                        value={targetValue || ''} 
                        onChange={e => setTargetValue(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="e.g. 5000000"
                        className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <label className="flex items-center gap-3 text-sm cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={conditionalFormatting.enabled} 
                            onChange={e => setConditionalFormatting({...conditionalFormatting, enabled: e.target.checked})}
                            className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-bold group-hover:text-blue-600 transition-colors">Enable Conditional Colors</span>
                    </label>

                    {conditionalFormatting.enabled && (
                        <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold">"On Target" Threshold (%)</label>
                                <input 
                                    type="number" 
                                    value={conditionalFormatting.onTargetThreshold} 
                                    onChange={e => setConditionalFormatting({...conditionalFormatting, onTargetThreshold: Number(e.target.value)})}
                                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <p className="text-[10px] text-zinc-400 italic">States: Below ({conditionalFormatting.onTargetThreshold}%), On, Above (100%+)</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs flex items-center gap-2"><AlertCircle className="w-3 h-3 text-red-500" /> Below</span>
                                    <input type="color" value={conditionalFormatting.belowTargetColor} onChange={e => setConditionalFormatting({...conditionalFormatting, belowTargetColor: e.target.value})} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs flex items-center gap-2"><AlertCircle className="w-3 h-3 text-amber-500" /> On Target</span>
                                    <input type="color" value={conditionalFormatting.onTargetColor} onChange={e => setConditionalFormatting({...conditionalFormatting, onTargetColor: e.target.value})} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Above</span>
                                    <input type="color" value={conditionalFormatting.aboveTargetColor} onChange={e => setConditionalFormatting({...conditionalFormatting, aboveTargetColor: e.target.value})} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </section>

          {/* Display Options */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Visibility Settings
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <label className="flex items-center gap-3 text-sm cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={displayOptions.showTarget} 
                        onChange={e => setDisplayOptions({...displayOptions, showTarget: e.target.checked})}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">Show Target Value</span>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={displayOptions.showAchievement} 
                        onChange={e => setDisplayOptions({...displayOptions, showAchievement: e.target.checked})}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">Show Achievement %</span>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={displayOptions.showTrend} 
                        onChange={e => setDisplayOptions({...displayOptions, showTrend: e.target.checked})}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">Show Trend Indicator</span>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={displayOptions.showMiniTrend} 
                        onChange={e => setDisplayOptions({...displayOptions, showMiniTrend: e.target.checked})}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">Show Sparkline Trend</span>
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={displayOptions.showContext} 
                        onChange={e => setDisplayOptions({...displayOptions, showContext: e.target.checked})}
                        className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="group-hover:text-blue-600 transition-colors">Show Period Context</span>
                </label>
            </div>
          </section>

          {/* Date Intelligence */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Date Filter
            </h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 font-medium">Date Column</label>
                    <select 
                        value={dateColumn} 
                        onChange={e => setDateColumn(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    >
                        <option value="">Select Date Column...</option>
                        {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-zinc-500 font-medium">Range</label>
                    <select 
                        value={dateRange.type} 
                        onChange={e => setDateRange({...dateRange, type: e.target.value as any})}
                        className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    >
                        <option value="all">All Time</option>
                        <option value="year">Current Year</option>
                        <option value="quarter">Current Quarter</option>
                        <option value="month">Current Month</option>
                        <option value="last_30_days">Last 30 Days</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>
                {dateRange.type === 'custom' && (
                   <div className="col-span-2 grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Start Date</label>
                            <input 
                                type="date" 
                                value={dateRange.start || ''} 
                                onChange={e => setDateRange({...dateRange, start: e.target.value})}
                                className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">End Date</label>
                            <input 
                                type="date" 
                                value={dateRange.end || ''} 
                                onChange={e => setDateRange({...dateRange, end: e.target.value})}
                                className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" 
                            />
                        </div>
                   </div>
                )}
            </div>
          </section>

          {/* Advanced Filters */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Row Filters (AND)
                </h3>
                <Button variant="ghost" size="sm" onClick={addFilter} className="text-blue-600 h-8 gap-1">
                    <Plus className="w-4 h-4" /> Add Filter
                </Button>
            </div>
            
            <div className="space-y-3">
                {filters.length === 0 ? (
                    <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-400 text-sm">
                        No filters applied. Metric will calculate from full dataset.
                    </div>
                ) : (
                    filters.map((filter, index) => (
                        <div key={filter.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 animate-in fade-in slide-in-from-top-2">
                            <div className="col-span-4">
                                <select 
                                    value={filter.column} 
                                    onChange={e => updateFilter(filter.id, { column: e.target.value })}
                                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                >
                                    {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div className="col-span-3">
                                <select 
                                    value={filter.operator} 
                                    onChange={e => updateFilter(filter.id, { operator: e.target.value as any })}
                                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                >
                                    <option value="equals">Equals</option>
                                    <option value="does_not_equal">Not Equals</option>
                                    <option value="contains">Contains</option>
                                    <option value="does_not_contain">Doesn't Contain</option>
                                    <option value="greater_than">Greater Than</option>
                                    <option value="less_than">Less Than</option>
                                    <option value="between">Between</option>
                                    <option value="before">Before</option>
                                    <option value="after">After</option>
                                    <option value="on">On Date</option>
                                </select>
                            </div>
                            <div className="col-span-4">
                                <input 
                                    type="text" 
                                    value={filter.value} 
                                    onChange={e => updateFilter(filter.id, { value: e.target.value })}
                                    placeholder="Value..."
                                    className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" 
                                />
                                {filter.operator === 'between' && (
                                     <input 
                                        type="text" 
                                        value={filter.secondaryValue || ''} 
                                        onChange={e => updateFilter(filter.id, { secondaryValue: e.target.value })}
                                        placeholder="Max value..."
                                        className="w-full p-2 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm" 
                                    />
                                )}
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <button onClick={() => removeFilter(filter.id)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </section>

          {/* Formatting */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Layout className="w-4 h-4" /> Presentation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium">Format Type</label>
                <select 
                  value={format.type} 
                  onChange={e => setFormat({...format, type: e.target.value as any})}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                >
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="percentage">Percentage</option>
                  <option value="decimal">Decimal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium">Decimals</label>
                <input 
                  type="number" 
                  value={format.decimals} 
                  onChange={e => setFormat({...format, decimals: Number(e.target.value)})} 
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none" 
                />
              </div>
            </div>
            <div className="flex gap-6 items-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <label className="flex items-center gap-3 text-sm cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={format.compactNotation} 
                  onChange={e => setFormat({...format, compactNotation: e.target.checked})} 
                  className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium group-hover:text-blue-600 transition-colors">Compact (K/M/B)</span>
              </label>
              <label className="flex items-center gap-3 text-sm cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={format.useThousandsSeparator} 
                  onChange={e => setFormat({...format, useThousandsSeparator: e.target.checked})} 
                  className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium group-hover:text-blue-600 transition-colors">Thousands separator</span>
              </label>
            </div>
            {format.type === 'currency' && (
               <div className="space-y-2">
                 <label className="text-xs text-zinc-500 font-medium">Currency Symbol</label>
                 <input 
                   type="text" 
                   value={format.currencySymbol || ''} 
                   onChange={e => setFormat({...format, currencySymbol: e.target.value})} 
                   placeholder="৳, $, €"
                   className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none" 
                 />
               </div>
            )}
          </section>

          {/* Visual Style */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Visual Identity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium block">Card Background</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={style.bgColor || '#ffffff'} onChange={e => setStyle({...style, bgColor: e.target.value})} className="w-10 h-10 border-0 p-0 bg-transparent cursor-pointer rounded-lg overflow-hidden" />
                  <input type="text" value={style.bgColor || '#ffffff'} onChange={e => setStyle({...style, bgColor: e.target.value})} className="flex-1 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium block">Metric Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={style.textColor || '#000000'} onChange={e => setStyle({...style, textColor: e.target.value})} className="w-10 h-10 border-0 p-0 bg-transparent cursor-pointer rounded-lg overflow-hidden" />
                  <input type="text" value={style.textColor || '#000000'} onChange={e => setStyle({...style, textColor: e.target.value})} className="flex-1 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium">Text Size</label>
                <select 
                  value={style.fontSize} 
                  onChange={e => setStyle({...style, fontSize: e.target.value as any})}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium">Alignment</label>
                <select 
                  value={style.textAlign} 
                  onChange={e => setStyle({...style, textAlign: e.target.value as any})}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium">Corner Shape</label>
                <select 
                  value={style.borderRadius} 
                  onChange={e => setStyle({...style, borderRadius: e.target.value as any})}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                >
                  <option value="none">Sharp</option>
                  <option value="sm">Subtle</option>
                  <option value="md">Balanced</option>
                  <option value="lg">Rounded</option>
                  <option value="xl">Pill</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex gap-4 sticky bottom-0 bg-white dark:bg-zinc-900 pb-2">
          <Button onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-7 text-lg rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            Save KPI Configuration
          </Button>
          <Button variant="outline" onClick={onClose} className="px-8 py-7 text-lg rounded-2xl border-zinc-200 dark:border-zinc-800">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
