import React, { useMemo } from 'react';
import { KpiDefinition, KpiFormatConfig, WidgetConfig } from '@/types';
import { evaluateKpi, formatKpiValue } from '@/lib/kpiEngine';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIWidgetProps {
  widget: WidgetConfig;
  kpiDefinition: KpiDefinition;
  datasets: any[];
  savedKpis: KpiDefinition[];
}

export function KPIWidget({ widget, kpiDefinition, datasets, savedKpis }: KPIWidgetProps) {
  const result = useMemo(() => {
    return evaluateKpi(kpiDefinition, datasets, savedKpis);
  }, [kpiDefinition, datasets, savedKpis]);

  const formatConfig: KpiFormatConfig = widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false };

  // Comparison/Trend logic
  const showComparison = widget.comparisonType !== 'none' && kpiDefinition.comparison !== 'None';
  
  const getTrendIcon = (val: number) => {
    if (val > 0) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
    if (val < 0) return <TrendingDown className="w-3 h-3 text-rose-500" />;
    return <Minus className="w-3 h-3 text-zinc-400" />;
  };

  return (
    <div className="h-full flex flex-col p-4 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate uppercase tracking-wider">{widget.title}</h3>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-2xl font-black font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
          {result.formattedResult}
        </div>
        
        {showComparison && result.deltaPercentage !== undefined && result.deltaPercentage !== 'comparisonUnavailable' && (
          <div className="flex items-center gap-1 mt-1 text-[10px] font-medium">
            {getTrendIcon(result.deltaPercentage)}
            <span className={cn(
              "font-mono",
              result.deltaPercentage > 0 ? "text-emerald-600 dark:text-emerald-400" : 
              result.deltaPercentage < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
            )}>
              {Math.abs(result.deltaPercentage).toFixed(1)}% {widget.comparisonType === 'yoy' ? 'YoY' : 'MoM'}
            </span>
          </div>
        )}
      </div>

      {kpiDefinition.status !== 'active' && (
        <div className="mt-2 text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded border border-rose-100 dark:border-rose-900/50">
          ⚠️ KPI Unavailable: {kpiDefinition.statusReason || 'Invalid'}
        </div>
      )}
    </div>
  );
}
