import React, { useState, useMemo } from 'react';
import {
  Dataset,
  KpiDefinition,
  KpiAggregation,
  ColumnFilter,
  ComparisonType,
} from '@/types';
import {
  evaluateKpi,
  validateKpiDefinition,
  generateFormulaSummary,
} from '@/lib/kpiEngine';
import {
  addOrUpdateKpi,
} from '@/lib/kpiStorage';
import {
  TrendingUp,
  Plus,
  Calculator,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Edit2,
  Copy,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KPIBuilderProps {
  datasets: Dataset[];
  savedKpis: KpiDefinition[];
  setSavedKpis: React.Dispatch<React.SetStateAction<KpiDefinition[]>>;
}

export function KPIBuilder({ datasets, savedKpis, setSavedKpis }: KPIBuilderProps) {
  // Form State
  const [activeDatasetId, setActiveDatasetId] = useState<string>(datasets[0]?.id || '');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formMetricType] = useState<'simple'>('simple');
  const [formColumn, setFormColumn] = useState<string>(datasets[0]?.headers[0] || '');
  const [formAggregation, setFormAggregation] = useState<KpiAggregation>('sum');
  const [formComparison, setFormComparison] = useState<ComparisonType>('None');
  const [formDateColumn, setFormDateColumn] = useState<string>('');
  const [formTarget, setFormTarget] = useState<number | ''>('');
  const [isTargetEnabled, setIsTargetEnabled] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const activeDataset = useMemo(
    () => datasets.find((d) => d.id === activeDatasetId) || datasets[0],
    [datasets, activeDatasetId]
  );

  // Live Preview Definition
  const livePreviewDefinition: KpiDefinition = useMemo(() => ({
    id: 'preview-temp',
    name: formName || 'New Metric',
    description: formDescription,
    datasetId: activeDatasetId,
    datasetName: activeDataset?.name,
    metricType: formMetricType,
    column: formColumn,
    aggregation: formAggregation,
    comparison: formComparison,
    dateColumn: formComparison !== 'None' ? formDateColumn : undefined,
    targetValue: isTargetEnabled ? (Number(formTarget) || 0) : undefined,
    filters: [],
    format: { type: 'number', decimals: 2 },
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }), [formName, formDescription, activeDatasetId, activeDataset?.name, formMetricType, formColumn, formAggregation, formComparison, formDateColumn, isTargetEnabled, formTarget]);

  // Evaluate Preview
  const previewResult = useMemo(() => {
    return evaluateKpi(livePreviewDefinition, datasets, savedKpis);
  }, [livePreviewDefinition, datasets, savedKpis]);

  const handleSave = async () => {
    const validation = validateKpiDefinition(livePreviewDefinition, datasets, savedKpis);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    
    const kpiToSave: KpiDefinition = {
      ...livePreviewDefinition,
      id: `kpi-${Date.now()}`,
    };
    
    const updated = await addOrUpdateKpi(kpiToSave);
    setSavedKpis(updated);
    setFormErrors([]);
    // Reset form
    setFormName('');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KPI Builder</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="md:col-span-2 glass-panel p-6 rounded-xl space-y-4">
          <input className="w-full p-2 border rounded" placeholder="KPI Name" value={formName} onChange={e => setFormName(e.target.value)} />
          <select className="w-full p-2 border rounded" value={activeDatasetId} onChange={e => setActiveDatasetId(e.target.value)}>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="w-full p-2 border rounded" value={formColumn} onChange={e => setFormColumn(e.target.value)}>
            {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <select className="w-full p-2 border rounded" value={formAggregation} onChange={e => setFormAggregation(e.target.value as KpiAggregation)}>
            <option value="sum">SUM</option>
            <option value="avg">AVERAGE</option>
            <option value="count">COUNT</option>
            <option value="min">MIN</option>
            <option value="max">MAX</option>
          </select>
          <select className="w-full p-2 border rounded" value={formComparison} onChange={e => setFormComparison(e.target.value as ComparisonType)}>
            <option value="None">None</option>
            <option value="MoM">MoM</option>
            <option value="YoY">YoY</option>
          </select>
          {formComparison !== 'None' && (
            <select className="w-full p-2 border rounded" value={formDateColumn} onChange={e => setFormDateColumn(e.target.value)}>
              {activeDataset?.headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={isTargetEnabled} onChange={e => setIsTargetEnabled(e.target.checked)} />
            <label>Enable Target</label>
            {isTargetEnabled && <input type="number" className="p-2 border rounded" value={formTarget} onChange={e => setFormTarget(Number(e.target.value))} />}
          </div>
          <Button onClick={handleSave}>Save KPI</Button>
          {formErrors.length > 0 && <div className="text-red-500">{formErrors.join(', ')}</div>}
        </div>
        
        {/* Preview Panel */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-bold mb-4">Preview</h2>
          <div className="p-4 border rounded">
            <p className="text-sm">{formName || 'KPI Name'}</p>
            <p className="text-2xl font-bold">{previewResult.currentValue}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
