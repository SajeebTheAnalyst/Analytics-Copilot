import React, { useState, useMemo } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  Dataset,
  KpiDefinition,
  KpiAggregation,
  ColumnFilter,
  ComparisonType,
  KpiFormatConfig,
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
  Edit2,
  Copy,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KPISettingsPanel } from './KPISettingsPanel';

const ResponsiveGridLayout = (WidthProvider as any)(Responsive);

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
  const [formMetricType] = useState<'simple'>('simple');
  const [formColumn, setFormColumn] = useState<string>(datasets[0]?.headers[0] || '');
  const [formAggregation, setFormAggregation] = useState<KpiAggregation>('sum');
  const [formComparison, setFormComparison] = useState<ComparisonType>('None');
  const [formDateColumn, setFormDateColumn] = useState<string>('');
  const [formTarget, setFormTarget] = useState<number | ''>('');
  const [isTargetEnabled, setIsTargetEnabled] = useState<boolean>(false);
  const [formFormat, setFormFormat] = useState<KpiFormatConfig>({ type: 'number', decimals: 2, compactNotation: false, useThousandsSeparator: true });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null);

  const activeDataset = useMemo(
    () => datasets.find((d) => d.id === activeDatasetId) || datasets[0],
    [datasets, activeDatasetId]
  );

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
    timeGranularity: 'month',
    targetValue: isTargetEnabled ? (Number(formTarget) || 0) : undefined,
    filters: [],
    format: formFormat,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }), [formName, formDescription, activeDatasetId, activeDataset?.name, formMetricType, formColumn, formAggregation, formComparison, formDateColumn, isTargetEnabled, formTarget]);

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
    setFormName('');
  };

  const onLayoutChange = (layout: any) => {
    const updatedKpis = savedKpis.map(kpi => {
      const item = layout.find((l: any) => l.i === kpi.id);
      if (item) {
        return { ...kpi, layout: { x: item.x, y: item.y, w: item.w, h: item.h } };
      }
      return kpi;
    });
    setSavedKpis(updatedKpis);
  };

  const handleDuplicate = (kpi: KpiDefinition) => {
    const newKpi = { ...kpi, id: `kpi-${Date.now()}`, name: `${kpi.name} (Copy)` };
    setSavedKpis([...savedKpis, newKpi]);
  };

  const handleDelete = (kpiId: string) => {
    setSavedKpis(savedKpis.filter(k => k.id !== kpiId));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">KPI Builder</h1>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="col-span-1 glass-panel p-6 rounded-xl space-y-4 h-fit">
          <h2 className="text-lg font-bold mb-4">Create New KPI</h2>
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
          <select className="w-full p-2 border rounded" value={formFormat.type} onChange={e => setFormFormat({...formFormat, type: e.target.value as any})}>
            <option value="number">Number</option>
            <option value="currency">Currency</option>
            <option value="percentage">Percentage</option>
          </select>
          <input type="number" className="w-full p-2 border rounded" value={formFormat.decimals} onChange={e => setFormFormat({...formFormat, decimals: Number(e.target.value)})} placeholder="Decimals" />
          <Button onClick={handleSave}>Save KPI</Button>
          {formErrors.length > 0 && <div className="text-red-500">{formErrors.join(', ')}</div>}
        </div>
        
        <div className="xl:col-span-3 glass-panel p-6 rounded-xl">
           <h2 className="text-lg font-bold mb-4">KPI Canvas</h2>
           <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: savedKpis.map(kpi => ({ i: kpi.id, x: kpi.layout?.x || 0, y: kpi.layout?.y || 0, w: kpi.layout?.w || 2, h: kpi.layout?.h || 2 })) }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              onLayoutChange={onLayoutChange}
           >
             {savedKpis.map(kpi => {
               const result = evaluateKpi(kpi, datasets, savedKpis);
               return (
                 <div key={kpi.id} className="bg-white dark:bg-zinc-900 border rounded-lg p-4 shadow-sm flex flex-col" style={{ backgroundColor: kpi.style?.bgColor, color: kpi.style?.textColor }}>
                   <div className="font-bold flex justify-between">
                      {kpi.name}
                      <div className="flex gap-1">
                          <button onClick={() => setSelectedKpi(kpi)}><Edit2 size={16}/></button>
                          <button onClick={() => handleDuplicate(kpi)}><Copy size={16}/></button>
                          <button onClick={() => handleDelete(kpi.id)}><Trash2 size={16}/></button>
                      </div>
                   </div>
                   <div className="text-2xl font-mono">{result.formattedResult}</div>
                   <Button size="sm" className="mt-auto" onClick={() => onAddToDashboard?.(kpi)}>Add to Dashboard</Button>
                 </div>
               );
             })}
           </ResponsiveGridLayout>
        </div>
      </div>
      
      {selectedKpi && (
          <KPISettingsPanel 
            kpi={selectedKpi} 
            onClose={() => setSelectedKpi(null)} 
            onUpdate={(updatedKpi) => {
                setSavedKpis(savedKpis.map(k => k.id === updatedKpi.id ? updatedKpi : k));
                setSelectedKpi(null);
            }} 
          />
      )}
    </div>
  );
}
