import React, { useState } from 'react';
import { KpiDefinition, KpiStyleConfig } from '@/types';
import { Button } from '@/components/ui/button';

interface KPISettingsPanelProps {
  kpi: KpiDefinition;
  onClose: () => void;
  onUpdate: (updatedKpi: KpiDefinition) => void;
}

export function KPISettingsPanel({ kpi, onClose, onUpdate }: KPISettingsPanelProps) {
  const [style, setStyle] = useState<KpiStyleConfig>(kpi.style || {});

  const handleUpdate = () => {
    onUpdate({ ...kpi, style });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl w-96 space-y-4">
        <h2 className="text-xl font-bold">Edit KPI: {kpi.name}</h2>
        
        <div>
          <label className="block text-sm">Background Color</label>
          <input type="color" value={style.bgColor || '#ffffff'} onChange={e => setStyle({...style, bgColor: e.target.value})} className="w-full" />
        </div>
        
        <div>
          <label className="block text-sm">Text Color</label>
          <input type="color" value={style.textColor || '#000000'} onChange={e => setStyle({...style, textColor: e.target.value})} className="w-full" />
        </div>
        
        <Button onClick={handleUpdate}>Apply</Button>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
