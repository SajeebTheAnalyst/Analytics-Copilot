import React, { useMemo } from 'react';
import { KpiDefinition, KpiFormatConfig, WidgetConfig } from '@/types';
import { evaluateKpi, formatKpiResult } from '@/lib/kpiEngine';
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

  const style = kpiDefinition.style || {};
  const displayOptions = kpiDefinition.displayOptions || {
    showTarget: true,
    showAchievement: true,
    showTrend: true,
    showMiniTrend: false,
    showContext: true
  };

  const showTarget = displayOptions.showTarget !== false && result.formattedTarget;
  const showAchievement = displayOptions.showAchievement !== false && result.targetAchievementPercentage !== undefined;
  const showTrend = displayOptions.showTrend !== false && typeof result.deltaPercentage === 'number';
  const showMiniTrend = displayOptions.showMiniTrend && result.historicalData && result.historicalData.length > 1;

  const cardBgColor = (kpiDefinition.conditionalFormatting?.enabled && result.statusColor) 
    ? result.statusColor 
    : (style.bgColor || 'var(--card-bg)');
  
  const contentColor = (kpiDefinition.conditionalFormatting?.enabled && result.statusColor)
    ? '#ffffff'
    : (style.textColor || 'inherit');

  const getTrendIcon = (val: number) => {
    if (val > 0) return <TrendingUp className="w-3 h-3" />;
    if (val < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  return (
    <div 
      className="h-full flex flex-col p-4 transition-all overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-xl"
      style={{ 
        backgroundColor: cardBgColor, 
        color: contentColor,
        textAlign: style.textAlign || 'center'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-bold opacity-70 uppercase tracking-[0.15em] truncate">{widget.title || kpiDefinition.name}</h3>
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className={cn(
          "font-mono font-black tracking-tighter leading-none",
          style.fontSize === 'xl' ? 'text-4xl' : style.fontSize === 'lg' ? 'text-3xl' : 'text-2xl'
        )}>
          {result.formattedResult}
        </div>
        
        {showTrend && (
          <div className={cn(
            "flex items-center justify-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full self-center bg-black/5 dark:bg-white/5",
            result.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
          )}>
            {getTrendIcon(result.deltaPercentage as number)}
            <span>{Math.abs(result.deltaPercentage as number).toFixed(1)}%</span>
            {displayOptions.showContext && <span className="opacity-60 font-medium ml-1">vs {kpiDefinition.comparison}</span>}
          </div>
        )}

        <div className="mt-2 space-y-1">
          {showTarget && (
            <div className="text-[10px] flex items-center justify-center gap-2 opacity-70 font-medium">
              <span>Target: {result.formattedTarget}</span>
              {showAchievement && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 flex items-center gap-1",
                  result.performanceStatus === 'above' ? 'text-emerald-400' : result.performanceStatus === 'on' ? 'text-amber-400' : 'text-red-300'
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
            <div className="h-6 w-full max-w-[100px] mx-auto opacity-50">
              <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none">
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
                    const y = 22 - ((d.value - min) / (max - min || 1)) * 20;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {(result.errors && result.errors.length > 0) && (
        <div className="mt-2 text-[9px] text-rose-500 bg-rose-50/20 p-1 rounded border border-rose-100/20">
          ⚠️ {result.errors[0]}
        </div>
      )}
    </div>
  );
}
