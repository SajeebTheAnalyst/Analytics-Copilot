import React, { useMemo, useState } from 'react';
import { 
  WidgetConfig, Dataset, DashboardFilter, DashboardCrossFilter, RelationshipSuggestion, 
  KpiDefinition, ColumnFilter, WidgetDrillState, DrillPathStep, DrillHierarchy 
} from '@/types';
import { evaluateKpi, formatKpiValue, evaluateSimpleAggregation } from '@/lib/kpiEngine';
import { filterDataset } from '@/lib/explorerEngine';
import { isDateColumn, parseFlexibleDate, getPeriodStart, formatPeriodLabel, determineAutoGranularity } from '@/lib/dateIntelligence';
import { 
  getDrillHierarchy, applyDrillDown, getEffectiveDrillDimension, buildDrillPath, 
  getDrillBreadcrumbs, canDrillDown, canDrillUp 
} from '@/lib/dashboardDrillDown';
import { DrillThroughModal } from './DrillThroughModal';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, ComposedChart,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  AlertTriangle, Info, ChevronLeft, ChevronRight, ChevronDown, Plus, Minus, 
  ArrowUpDown, Award, BarChart2, Grid, Table as TableIcon, Layers, Maximize2, 
  X, Filter, ArrowUp, ArrowDown, ChevronsDown, RotateCcw, FileSpreadsheet, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CustomTooltip = ({ active, payload, label, formatConfig, yAxisColumn }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl text-xs space-y-2 text-zinc-100 z-50 min-w-[180px]">
        <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1">{String(label || '')}</p>
        <div className="space-y-1.5 pt-0.5">
          {payload.map((item: any, idx: number) => {
            const val = Number(item.value) || 0;
            const formatted = formatKpiValue(val, formatConfig || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false });
            return (
              <div key={idx} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color || item.fill || item.stroke || '#3b82f6' }} />
                  <span className="font-medium text-zinc-300 truncate">{item.name || item.dataKey || yAxisColumn}</span>
                </div>
                <span className="font-mono font-bold text-white shrink-0">{formatted}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-500 font-medium italic pt-1 border-t border-zinc-800/60 flex items-center gap-1">
          <span>💡</span>
          <span>Click to cross-filter dashboard</span>
        </p>
      </div>
    );
  }
  return null;
};

export function fuzzyMatchColumn(sought: string | undefined, headers: string[]): string | undefined {
  if (!sought) return undefined;
  // If exact match exists, use it first
  if (headers.includes(sought)) return sought;

  const cleanSought = sought.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanSought) return undefined;

  // Dictionary matching for common analytics semantics
  const synonyms: Record<string, string[]> = {
    revenue: ['revenue', 'sales', 'amount', 'total_amount', 'grand_total', 'price', 'profit', 'sales_amount', 'bdt', 'total'],
    profit: ['profit', 'margin', 'net_profit', 'gain', 'earnings'],
    region: ['region', 'country', 'city', 'location', 'state', 'territory', 'zone'],
    customer: ['customer', 'client', 'user', 'buyer', 'consumer'],
    order: ['order id', 'order_id', 'transaction_id', 'invoice_id', 'id', 'orderid', 'order'],
    sales: ['sales', 'revenue', 'amount', 'total_amount', 'price', 'total'],
  };

  // Find if sought has a synonym list
  let matchedGroup: string[] = [];
  for (const [key, list] of Object.entries(synonyms)) {
    if (cleanSought.includes(key) || key.includes(cleanSought)) {
      matchedGroup = list;
      break;
    }
  }

  // First pass: look for exact lowercase matches
  for (const h of headers) {
    const cleanH = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanH === cleanSought) return h;
  }

  // Second pass: look for contains/contained in for sought or any synonym
  for (const cand of [sought, ...matchedGroup]) {
    const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const h of headers) {
      const cleanH = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanH.includes(cleanCand) || cleanCand.includes(cleanH)) {
        return h;
      }
    }
  }

  return undefined;
}

interface WidgetRendererProps {
  widget: WidgetConfig;
  datasets: Dataset[];
  relationships?: RelationshipSuggestion[];
  filters: DashboardFilter[];
  activeCrossFilters?: DashboardCrossFilter[];
  savedKpis?: KpiDefinition[];
  drillState?: WidgetDrillState;
  onDrillStateChange?: (state: WidgetDrillState) => void;
  onOpenDrillThrough?: (context: {
    widgetId: string;
    title: string;
    dataset: Dataset | null;
    records: Record<string, any>[];
    drillPath: DrillPathStep[];
  }) => void;
  onDataPointClick?: (
    column: string, 
    value: string | number | boolean,
    options?: {
      operator?: 'equals' | 'in' | 'between' | 'date_period';
      dateGranularity?: 'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year';
      label?: string;
    }
  ) => void;
  onClearWidgetCrossFilter?: () => void;
  onUpdateWidget?: (updatedConfig: Partial<WidgetConfig>) => void;
}

const COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#d97706', '#6366f1'
];

// ==========================================
// HEATMAP VISUAL COMPONENT
// ==========================================
function HeatmapVisualRenderer({
  widget,
  dataset,
  filteredRows,
  rowCol,
  colCol,
  metricCol,
  agg,
  chartPrimaryColor,
  parsedAxisLabelSize,
  activeCrossFilters,
  onDataPointClick
}: {
  widget: WidgetConfig;
  dataset: Dataset;
  filteredRows: any[];
  rowCol: string;
  colCol: string;
  metricCol: string;
  agg: string;
  chartPrimaryColor: string;
  parsedAxisLabelSize: number;
  activeCrossFilters?: DashboardCrossFilter[];
  onDataPointClick?: (col: string, val: string) => void;
}) {
  const [hoveredCell, setHoveredCell] = useState<{ rowKey: string; colKey: string; value: number } | null>(null);

  const isRowDate = isDateColumn(dataset, rowCol);
  const isColDate = isDateColumn(dataset, colCol);
  const dateGranularity = widget.dateAggregation || 'month';

  const widgetCrossFilter = activeCrossFilters?.find(cf => cf.widgetId === widget.id);
  const hasActiveSelection = !!widgetCrossFilter && widgetCrossFilter.values.length > 0;
  const isRowSelected = (r: string) => hasActiveSelection && widgetCrossFilter.column === rowCol && widgetCrossFilter.values.some(v => String(v) === String(r));
  const isColSelected = (c: string) => hasActiveSelection && widgetCrossFilter.column === colCol && widgetCrossFilter.values.some(v => String(v) === String(c));

  const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotal, minVal, maxVal } = useMemo(() => {
    const rawMatrix: Record<string, Record<string, any[]>> = {};
    const rowValuesMap: Record<string, any> = {};
    const colValuesMap: Record<string, any> = {};

    filteredRows.forEach(row => {
      let rowKey = 'Unspecified';
      const rawRowVal = row[rowCol];
      if (rawRowVal !== null && rawRowVal !== undefined && rawRowVal !== '') {
        if (isRowDate) {
          const parsed = parseFlexibleDate(rawRowVal);
          rowKey = parsed ? formatPeriodLabel(parsed, dateGranularity as any, true) : String(rawRowVal);
          if (parsed) rowValuesMap[rowKey] = parsed.getTime();
        } else {
          rowKey = String(rawRowVal);
        }
      }

      let colKey = 'Unspecified';
      const rawColVal = row[colCol];
      if (rawColVal !== null && rawColVal !== undefined && rawColVal !== '') {
        if (isColDate) {
          const parsed = parseFlexibleDate(rawColVal);
          colKey = parsed ? formatPeriodLabel(parsed, dateGranularity as any, true) : String(rawColVal);
          if (parsed) colValuesMap[colKey] = parsed.getTime();
        } else {
          colKey = String(rawColVal);
        }
      }

      if (!rawMatrix[rowKey]) rawMatrix[rowKey] = {};
      if (!rawMatrix[rowKey][colKey]) rawMatrix[rowKey][colKey] = [];
      rawMatrix[rowKey][colKey].push(row);
    });

    let uniqueRowKeys = Object.keys(rawMatrix);
    if (isRowDate) {
      uniqueRowKeys.sort((a, b) => (rowValuesMap[a] || 0) - (rowValuesMap[b] || 0));
    } else {
      uniqueRowKeys.sort((a, b) => a.localeCompare(b));
    }

    const colKeySet = new Set<string>();
    Object.values(rawMatrix).forEach(cols => {
      Object.keys(cols).forEach(k => colKeySet.add(k));
    });
    let uniqueColKeys = Array.from(colKeySet);
    if (isColDate) {
      uniqueColKeys.sort((a, b) => (colValuesMap[a] || 0) - (colValuesMap[b] || 0));
    } else {
      uniqueColKeys.sort((a, b) => a.localeCompare(b));
    }

    const computedMatrix: Record<string, Record<string, number>> = {};
    const computedRowTotals: Record<string, number> = {};
    const computedColTotals: Record<string, number> = {};
    let min = Infinity;
    let max = -Infinity;

    uniqueRowKeys.forEach(r => {
      computedMatrix[r] = {};
      const allRowMatchingRows: any[] = [];

      uniqueColKeys.forEach(c => {
        const arr = rawMatrix[r]?.[c] || [];
        if (arr.length > 0) {
          const val = evaluateSimpleAggregation(arr, metricCol, agg as any) ?? 0;
          computedMatrix[r][c] = val;
          allRowMatchingRows.push(...arr);

          if (val < min) min = val;
          if (val > max) max = val;
        }
      });

      if (allRowMatchingRows.length > 0) {
        computedRowTotals[r] = evaluateSimpleAggregation(allRowMatchingRows, metricCol, agg as any) ?? 0;
      } else {
        computedRowTotals[r] = 0;
      }
    });

    uniqueColKeys.forEach(c => {
      const allColMatchingRows: any[] = [];
      uniqueRowKeys.forEach(r => {
        const arr = rawMatrix[r]?.[c] || [];
        allColMatchingRows.push(...arr);
      });
      if (allColMatchingRows.length > 0) {
        computedColTotals[c] = evaluateSimpleAggregation(allColMatchingRows, metricCol, agg as any) ?? 0;
      } else {
        computedColTotals[c] = 0;
      }
    });

    const computedGrandTotal = evaluateSimpleAggregation(filteredRows, metricCol, agg as any) ?? 0;

    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 1;

    return {
      rowKeys: uniqueRowKeys,
      colKeys: uniqueColKeys,
      matrix: computedMatrix,
      rowTotals: computedRowTotals,
      colTotals: computedColTotals,
      grandTotal: computedGrandTotal,
      minVal: min,
      maxVal: max
    };
  }, [filteredRows, rowCol, colCol, metricCol, agg, isRowDate, isColDate, dateGranularity]);

  const colorScaleMode = widget.colorScale || 'sequential';
  const showTotals = widget.showTotals !== false;

  const getCellBgAndTextColor = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) {
      return { bg: 'transparent', text: 'text-zinc-400 dark:text-zinc-600' };
    }

    const range = (maxVal - minVal) || 1;
    const ratio = Math.max(0, Math.min(1, (val - minVal) / range));

    if (colorScaleMode === 'diverging') {
      const mid = (minVal + maxVal) / 2;
      if (val >= mid) {
        const upperRange = (maxVal - mid) || 1;
        const posRatio = Math.max(0, Math.min(1, (val - mid) / upperRange));
        const alpha = 0.12 + 0.78 * posRatio;
        return {
          bg: `rgba(16, 185, 129, ${alpha})`,
          text: posRatio > 0.5 ? 'text-white font-bold' : 'text-zinc-900 dark:text-zinc-100'
        };
      } else {
        const lowerRange = (mid - minVal) || 1;
        const negRatio = Math.max(0, Math.min(1, (mid - val) / lowerRange));
        const alpha = 0.12 + 0.78 * negRatio;
        return {
          bg: `rgba(239, 68, 68, ${alpha})`,
          text: negRatio > 0.5 ? 'text-white font-bold' : 'text-zinc-900 dark:text-zinc-100'
        };
      }
    } else {
      const alpha = 0.08 + 0.82 * ratio;
      let hex = chartPrimaryColor.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16) || 37;
      const g = parseInt(hex.substring(2, 4), 16) || 99;
      const b = parseInt(hex.substring(4, 6), 16) || 235;

      return {
        bg: `rgba(${r}, ${g}, ${b}, ${alpha})`,
        text: ratio > 0.52 ? 'text-white font-bold' : 'text-zinc-800 dark:text-zinc-200'
      };
    }
  };

  const formatConfig = widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false };

  return (
    <div className="h-full flex flex-col w-full overflow-hidden text-xs">
      <div className="flex items-center justify-between pb-2 text-[10px] text-zinc-500 dark:text-zinc-400 border-b border-zinc-150 dark:border-zinc-800 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate">{rowCol}</span>
          <span>×</span>
          <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate">{colCol}</span>
          <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono uppercase text-[9px] font-bold">
            {agg}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-zinc-400 font-mono">
            {rowKeys.length} × {colKeys.length} cells
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto w-full relative custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 sticky top-0 z-20">
              <th className="p-2.5 font-bold text-zinc-600 dark:text-zinc-300 sticky left-0 bg-zinc-100 dark:bg-zinc-900 z-30 shadow-xs text-left min-w-[120px]">
                {rowCol} \ {colCol}
              </th>
              {colKeys.map(c => {
                const isSelected = isColSelected(c);
                return (
                  <th 
                    key={c} 
                    onClick={() => onDataPointClick?.(colCol, c)}
                    title={`Filter by ${colCol}: ${c}`}
                    className={cn(
                      "p-2.5 font-bold text-center min-w-[90px] max-w-[140px] truncate cursor-pointer transition-colors select-none",
                      isSelected 
                        ? "bg-blue-600 text-white shadow-xs" 
                        : "text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600"
                    )}
                  >
                    {c}
                  </th>
                );
              })}
              {showTotals && (
                <th className="p-2.5 font-extrabold text-center text-zinc-800 dark:text-zinc-100 bg-zinc-150 dark:bg-zinc-850/80 min-w-[100px]">
                  Total
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map(r => {
              const isRSelected = isRowSelected(r);
              return (
                <tr key={r} className="border-b border-zinc-100 dark:border-zinc-850/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                  <td 
                    onClick={() => onDataPointClick?.(rowCol, r)}
                    title={`Filter by ${rowCol}: ${r}`}
                    className={cn(
                      "p-2.5 font-semibold sticky left-0 z-10 border-r border-zinc-200 dark:border-zinc-800 truncate max-w-[160px] cursor-pointer transition-colors select-none",
                      isRSelected 
                        ? "bg-blue-600 text-white font-bold" 
                        : "bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    )}
                  >
                    {r}
                  </td>
                  {colKeys.map(c => {
                    const val = matrix[r]?.[c];
                    const { bg, text } = getCellBgAndTextColor(val);
                    const isCellActive = isRSelected || isColSelected(c);
                    const isDimmed = hasActiveSelection && !isCellActive;

                    return (
                      <td
                        key={c}
                        onClick={() => {
                          onDataPointClick?.(rowCol, r);
                        }}
                        onMouseEnter={() => val !== undefined && setHoveredCell({ rowKey: r, colKey: c, value: val })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={cn(
                          "p-2 text-center font-mono transition-all duration-180 cursor-pointer relative group border-r border-zinc-100 dark:border-zinc-850/30",
                          text,
                          isCellActive && "ring-2 ring-blue-500 ring-inset font-bold",
                          isDimmed && "opacity-35"
                        )}
                        style={{ backgroundColor: bg }}
                        title={`${rowCol}: ${r}\n${colCol}: ${c}\n${metricCol}: ${val !== undefined ? formatKpiValue(val, formatConfig) : 'N/A'}`}
                      >
                        {val !== undefined ? (
                          <span>{formatKpiValue(val, formatConfig)}</span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">-</span>
                        )}
                      </td>
                    );
                  })}
                  {showTotals && (
                    <td className="p-2.5 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-50/80 dark:bg-zinc-900/60 border-l border-zinc-200 dark:border-zinc-800">
                      {formatKpiValue(rowTotals[r] || 0, formatConfig)}
                    </td>
                  )}
                </tr>
              );
            })}
            {showTotals && (
              <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 font-bold bg-zinc-100/90 dark:bg-zinc-900 sticky bottom-0 z-20">
                <td className="p-2.5 font-extrabold text-zinc-900 dark:text-zinc-100 sticky left-0 bg-zinc-200 dark:bg-zinc-850 z-30">
                  Total
                </td>
                {colKeys.map(c => (
                  <td key={c} className="p-2.5 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {formatKpiValue(colTotals[c] || 0, formatConfig)}
                  </td>
                ))}
                <td className="p-2.5 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/60">
                  {formatKpiValue(grandTotal, formatConfig)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hoveredCell && (
        <div className="mt-2 p-2 bg-zinc-900 text-white rounded-lg text-[11px] flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-400">{hoveredCell.rowKey}</span>
            <span className="text-zinc-500">•</span>
            <span className="font-bold text-emerald-400">{hoveredCell.colKey}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-400">{metricCol} ({agg}):</span>
            <span className="font-mono font-bold text-white text-xs">{formatKpiValue(hoveredCell.value, formatConfig)}</span>
            {grandTotal > 0 && (
              <span className="text-[10px] text-zinc-400 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                {((hoveredCell.value / grandTotal) * 100).toFixed(1)}% of Total
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MATRIX VISUAL COMPONENT
// ==========================================
function MatrixVisualRenderer({
  widget,
  dataset,
  filteredRows,
  primaryRowCol,
  secondaryRowCol,
  colCol,
  metricCol,
  secondaryMetricCol,
  agg,
  secAgg,
  chartPrimaryColor,
  activeCrossFilters,
  onDataPointClick
}: {
  widget: WidgetConfig;
  dataset: Dataset;
  filteredRows: any[];
  primaryRowCol: string;
  secondaryRowCol?: string;
  colCol?: string;
  metricCol: string;
  secondaryMetricCol?: string;
  agg: string;
  secAgg: string;
  chartPrimaryColor: string;
  activeCrossFilters?: DashboardCrossFilter[];
  onDataPointClick?: (col: string, val: string) => void;
}) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  const isColDate = colCol ? isDateColumn(dataset, colCol) : false;
  const dateGranularity = widget.dateAggregation || 'month';

  const widgetCrossFilter = activeCrossFilters?.find(cf => cf.widgetId === widget.id);
  const hasActiveSelection = !!widgetCrossFilter && widgetCrossFilter.values.length > 0;
  const isPrimarySelected = (p: string) => hasActiveSelection && widgetCrossFilter.column === primaryRowCol && widgetCrossFilter.values.some(v => String(v) === String(p));
  const isSecondarySelected = (s: string) => hasActiveSelection && secondaryRowCol && widgetCrossFilter.column === secondaryRowCol && widgetCrossFilter.values.some(v => String(v) === String(s));
  const isColSelected = (c: string) => hasActiveSelection && colCol && widgetCrossFilter.column === colCol && widgetCrossFilter.values.some(v => String(v) === String(c));

  const handleToggleAll = (expand: boolean) => {
    setAllExpanded(expand);
    const newExpanded: Record<string, boolean> = {};
    if (expand) {
      primaryGroups.forEach(g => {
        newExpanded[g.primaryKey] = true;
      });
    }
    setExpandedRows(newExpanded);
  };

  const handleToggleRow = (key: string) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { primaryGroups, colKeys, colTotals, grandTotalPrimary, maxPrimaryCellVal } = useMemo(() => {
    const primaryMap: Record<string, {
      rows: any[];
      secondaryMap: Record<string, any[]>;
    }> = {};

    const colValuesMap: Record<string, any> = {};

    filteredRows.forEach(row => {
      const pKey = String(row[primaryRowCol] ?? 'Unspecified');
      if (!primaryMap[pKey]) {
        primaryMap[pKey] = { rows: [], secondaryMap: {} };
      }
      primaryMap[pKey].rows.push(row);

      if (secondaryRowCol) {
        const sKey = String(row[secondaryRowCol] ?? 'Unspecified');
        if (!primaryMap[pKey].secondaryMap[sKey]) {
          primaryMap[pKey].secondaryMap[sKey] = [];
        }
        primaryMap[pKey].secondaryMap[sKey].push(row);
      }

      if (colCol) {
        const rawColVal = row[colCol];
        if (rawColVal !== null && rawColVal !== undefined && rawColVal !== '') {
          if (isColDate) {
            const parsed = parseFlexibleDate(rawColVal);
            const cKey = parsed ? formatPeriodLabel(parsed, dateGranularity as any, true) : String(rawColVal);
            if (parsed) colValuesMap[cKey] = parsed.getTime();
          }
        }
      }
    });

    const colKeySet = new Set<string>();
    if (colCol) {
      filteredRows.forEach(row => {
        const rawColVal = row[colCol];
        let cKey = 'Unspecified';
        if (rawColVal !== null && rawColVal !== undefined && rawColVal !== '') {
          if (isColDate) {
            const parsed = parseFlexibleDate(rawColVal);
            cKey = parsed ? formatPeriodLabel(parsed, dateGranularity as any, true) : String(rawColVal);
          } else {
            cKey = String(rawColVal);
          }
        }
        colKeySet.add(cKey);
      });
    } else {
      colKeySet.add('Value');
    }

    let sortedColKeys = Array.from(colKeySet);
    if (colCol && isColDate) {
      sortedColKeys.sort((a, b) => (colValuesMap[a] || 0) - (colValuesMap[b] || 0));
    } else {
      sortedColKeys.sort((a, b) => a.localeCompare(b));
    }

    let maxCellVal = 0;

    const groups = Object.keys(primaryMap).map(pKey => {
      const groupData = primaryMap[pKey];
      const primaryCellValues: Record<string, number> = {};
      const secMetricPrimaryCellValues: Record<string, number> = {};

      sortedColKeys.forEach(cKey => {
        const matchingRows = groupData.rows.filter(r => {
          if (!colCol) return true;
          let rCKey = 'Unspecified';
          const rawColVal = r[colCol];
          if (rawColVal !== null && rawColVal !== undefined && rawColVal !== '') {
            if (isColDate) {
              const parsed = parseFlexibleDate(rawColVal);
              rCKey = parsed ? formatPeriodLabel(parsed, dateGranularity as any, true) : String(rawColVal);
            } else {
              rCKey = String(rawColVal);
            }
          }
          return rCKey === cKey;
        });

        const val = evaluateSimpleAggregation(matchingRows, metricCol, agg as any) ?? 0;
        primaryCellValues[cKey] = val;
        if (val > maxCellVal) maxCellVal = val;

        if (secondaryMetricCol) {
          secMetricPrimaryCellValues[cKey] = evaluateSimpleAggregation(matchingRows, secondaryMetricCol, secAgg as any) ?? 0;
        }
      });

      const totalPrimaryVal = evaluateSimpleAggregation(groupData.rows, metricCol, agg as any) ?? 0;

      const children = Object.keys(groupData.secondaryMap).map(sKey => {
        const childRows = groupData.secondaryMap[sKey];
        const childCellValues: Record<string, number> = {};
        const secMetricChildCellValues: Record<string, number> = {};

        sortedColKeys.forEach(cKey => {
          const matchingChildRows = childRows.filter(r => {
            if (!colCol) return true;
            let rCKey = 'Unspecified';
            const rawColVal = r[colCol];
            if (rawColVal !== null && rawColVal !== undefined && rawColVal !== '') {
              if (isColDate) {
                const parsed = parseFlexibleDate(rawColVal);
                rCKey = parsed ? formatPeriodLabel(parsed, dateGranularity as any, true) : String(rawColVal);
              } else {
                rCKey = String(rawColVal);
              }
            }
            return rCKey === cKey;
          });

          childCellValues[cKey] = evaluateSimpleAggregation(matchingChildRows, metricCol, agg as any) ?? 0;

          if (secondaryMetricCol) {
            secMetricChildCellValues[cKey] = evaluateSimpleAggregation(matchingChildRows, secondaryMetricCol, secAgg as any) ?? 0;
          }
        });

        const totalChildVal = evaluateSimpleAggregation(childRows, metricCol, agg as any) ?? 0;

        return {
          secondaryKey: sKey,
          childCellValues,
          secMetricChildCellValues,
          totalChildVal
        };
      });

      children.sort((a, b) => b.totalChildVal - a.totalChildVal);

      return {
        primaryKey: pKey,
        primaryCellValues,
        secMetricPrimaryCellValues,
        totalPrimaryVal,
        children
      };
    });

    groups.sort((a, b) => b.totalPrimaryVal - a.totalPrimaryVal);

    const computedColTotals: Record<string, number> = {};
    sortedColKeys.forEach(cKey => {
      const matchingColRows = filteredRows.filter(r => {
        if (!colCol) return true;
        let rCKey = 'Unspecified';
        const rawColVal = r[colCol];
        if (rawColVal !== null && rawColVal !== undefined && rawColVal !== '') {
          if (isColDate) {
            const parsed = parseFlexibleDate(rawColVal);
            rCKey = parsed ? formatPeriodLabel(parsed, dateGranularity as any, true) : String(rawColVal);
          } else {
            rCKey = String(rawColVal);
          }
        }
        return rCKey === cKey;
      });
      computedColTotals[cKey] = evaluateSimpleAggregation(matchingColRows, metricCol, agg as any) ?? 0;
    });

    const grandTot = evaluateSimpleAggregation(filteredRows, metricCol, agg as any) ?? 0;

    return {
      primaryGroups: groups,
      colKeys: sortedColKeys,
      colTotals: computedColTotals,
      grandTotalPrimary: grandTot,
      maxPrimaryCellVal: maxCellVal || 1
    };
  }, [filteredRows, primaryRowCol, secondaryRowCol, colCol, metricCol, secondaryMetricCol, agg, secAgg, isColDate, dateGranularity]);

  const condFormat = widget.matrixConditionalFormat || 'background';
  const showTotals = widget.showTotals !== false;
  const formatConfig = widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false };

  return (
    <div className="h-full flex flex-col w-full overflow-hidden text-xs">
      <div className="flex items-center justify-between pb-2 text-[10px] text-zinc-500 dark:text-zinc-400 border-b border-zinc-150 dark:border-zinc-800 mb-2 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-zinc-700 dark:text-zinc-300 truncate">{primaryRowCol}</span>
          {secondaryRowCol && (
            <>
              <span className="text-zinc-400">›</span>
              <span className="font-semibold text-zinc-600 dark:text-zinc-400 truncate">{secondaryRowCol}</span>
            </>
          )}
          {colCol && (
            <>
              <span className="text-zinc-400">×</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 truncate">{colCol}</span>
            </>
          )}
        </div>

        {secondaryRowCol && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleAll(true)}
              className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={() => handleToggleAll(false)}
              className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto w-full relative custom-scrollbar border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 sticky top-0 z-20">
              <th className="p-2.5 font-bold text-zinc-700 dark:text-zinc-300 sticky left-0 bg-zinc-100 dark:bg-zinc-900 z-30 shadow-xs min-w-[180px]">
                Hierarchy / Rows
              </th>
              {colKeys.map(c => {
                const isSelected = isColSelected(c);
                return (
                  <th 
                    key={c} 
                    onClick={() => colCol && onDataPointClick?.(colCol, c)}
                    title={colCol ? `Filter by ${colCol}: ${c}` : undefined}
                    className={cn(
                      "p-2.5 font-bold text-center min-w-[100px] max-w-[150px] truncate select-none transition-colors",
                      colCol && "cursor-pointer",
                      isSelected 
                        ? "bg-blue-600 text-white shadow-xs" 
                        : colCol ? "text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600" : "text-zinc-700 dark:text-zinc-200"
                    )}
                  >
                    {c}
                  </th>
                );
              })}
              {showTotals && (
                <th className="p-2.5 font-extrabold text-center text-zinc-800 dark:text-zinc-100 bg-zinc-150 dark:bg-zinc-850/80 min-w-[110px]">
                  Total
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {primaryGroups.map(group => {
              const isExpanded = expandedRows[group.primaryKey] || allExpanded;
              const hasChildren = group.children.length > 0 && secondaryRowCol;
              const isPSelected = isPrimarySelected(group.primaryKey);

              return (
                <React.Fragment key={group.primaryKey}>
                  <tr className={cn(
                    "border-b border-zinc-200 dark:border-zinc-800/80 font-bold transition-colors",
                    isPSelected 
                      ? "bg-blue-50/80 dark:bg-blue-950/50" 
                      : "bg-zinc-50/70 dark:bg-zinc-900/50 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/80"
                  )}>
                    <td 
                      onClick={() => onDataPointClick?.(primaryRowCol, group.primaryKey)}
                      title={`Filter by ${primaryRowCol}: ${group.primaryKey}`}
                      className={cn(
                        "p-2.5 sticky left-0 z-10 border-r border-zinc-200 dark:border-zinc-800 flex items-center gap-2 cursor-pointer select-none",
                        isPSelected 
                          ? "bg-blue-600 text-white" 
                          : "bg-zinc-50/90 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:text-blue-600"
                      )}
                    >
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRow(group.primaryKey);
                          }}
                          className={cn(
                            "p-1 rounded transition-colors",
                            isPSelected ? "hover:bg-blue-700 text-white" : "hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <span className="w-3.5 h-3.5 inline-block" />
                      )}
                      <span className="truncate max-w-[180px]" title={group.primaryKey}>
                        {group.primaryKey}
                      </span>
                    </td>

                    {colKeys.map(cKey => {
                      const val = group.primaryCellValues[cKey];
                      const ratio = Math.max(0, Math.min(1, val / maxPrimaryCellVal));
                      const isCellActive = isPSelected || isColSelected(cKey);
                      const isDimmed = hasActiveSelection && !isCellActive;

                      let styleBg = 'transparent';
                      if (condFormat === 'background' && val) {
                        styleBg = `rgba(59, 130, 246, ${0.06 + 0.35 * ratio})`;
                      }

                      return (
                        <td
                          key={cKey}
                          onClick={() => onDataPointClick?.(primaryRowCol, group.primaryKey)}
                          className={cn(
                            "p-2.5 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors",
                            isCellActive && "ring-2 ring-blue-500 ring-inset",
                            isDimmed && "opacity-35"
                          )}
                          style={{ backgroundColor: styleBg }}
                        >
                          {condFormat === 'databars' && val ? (
                            <div className="space-y-1">
                              <span>{formatKpiValue(val, formatConfig)}</span>
                              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${ratio * 100}%` }} />
                              </div>
                            </div>
                          ) : (
                            formatKpiValue(val, formatConfig)
                          )}
                        </td>
                      );
                    })}

                    {showTotals && (
                      <td className="p-2.5 text-center font-mono font-extrabold text-zinc-900 dark:text-zinc-100 bg-zinc-100/80 dark:bg-zinc-850 border-l border-zinc-200 dark:border-zinc-800">
                        {formatKpiValue(group.totalPrimaryVal, formatConfig)}
                      </td>
                    )}
                  </tr>

                  {hasChildren && isExpanded && group.children.map(child => {
                    const isSSelected = isSecondarySelected(child.secondaryKey);
                    return (
                      <tr key={child.secondaryKey} className={cn(
                        "border-b border-zinc-100 dark:border-zinc-850/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-zinc-700 dark:text-zinc-300",
                        isSSelected && "bg-blue-50/50 dark:bg-blue-950/30"
                      )}>
                        <td 
                          onClick={() => onDataPointClick?.(secondaryRowCol!, child.secondaryKey)}
                          title={`Filter by ${secondaryRowCol}: ${child.secondaryKey}`}
                          className={cn(
                            "p-2 pl-8 sticky left-0 z-10 border-r border-zinc-200 dark:border-zinc-800 font-medium truncate max-w-[180px] cursor-pointer",
                            isSSelected 
                              ? "bg-blue-600 text-white font-bold" 
                              : "bg-white dark:bg-zinc-950 hover:text-blue-600"
                          )}
                        >
                          {child.secondaryKey}
                        </td>
                        {colKeys.map(cKey => {
                          const val = child.childCellValues[cKey];
                          const isChildActive = isSSelected || isColSelected(cKey);
                          const isChildDimmed = hasActiveSelection && !isChildActive;

                          return (
                            <td
                              key={cKey}
                              onClick={() => onDataPointClick?.(secondaryRowCol!, child.secondaryKey)}
                              className={cn(
                                "p-2 text-center font-mono cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors",
                                isChildActive && "ring-1 ring-blue-500 ring-inset font-bold",
                                isChildDimmed && "opacity-35"
                              )}
                            >
                              {val !== undefined ? formatKpiValue(val, formatConfig) : '-'}
                            </td>
                          );
                        })}
                        {showTotals && (
                          <td className="p-2 text-center font-mono font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50/50 dark:bg-zinc-900/30 border-l border-zinc-200 dark:border-zinc-800">
                            {formatKpiValue(child.totalChildVal, formatConfig)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {showTotals && (
              <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 font-bold bg-zinc-100 dark:bg-zinc-900 sticky bottom-0 z-20">
                <td className="p-2.5 font-extrabold text-zinc-900 dark:text-zinc-100 sticky left-0 bg-zinc-200 dark:bg-zinc-850 z-30">
                  Grand Total
                </td>
                {colKeys.map(cKey => (
                  <td key={cKey} className="p-2.5 text-center font-mono font-extrabold text-zinc-900 dark:text-zinc-100">
                    {formatKpiValue(colTotals[cKey] || 0, formatConfig)}
                  </td>
                ))}
                <td className="p-2.5 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70">
                  {formatKpiValue(grandTotalPrimary, formatConfig)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WidgetRenderer({
  widget,
  datasets,
  filters,
  activeCrossFilters,
  savedKpis = [],
  drillState: controlledDrillState,
  onDrillStateChange,
  onOpenDrillThrough,
  onDataPointClick,
  onClearWidgetCrossFilter,
  onUpdateWidget
}: WidgetRendererProps) {
  // Find primary dataset
  const primaryDataset = datasets.find(d => d.id === widget.datasetId || d.name === widget.datasetId) || datasets[0];

  // Hierarchical Drill-Down State (Controlled or Internal)
  const [internalDrillState, setInternalDrillState] = useState<WidgetDrillState>(
    controlledDrillState || { currentLevelIndex: 0, path: [], isExpandedAll: false }
  );
  const [isDrillModeActive, setIsDrillModeActive] = useState<boolean>(false);
  const [isLocalDrillThroughOpen, setIsLocalDrillThroughOpen] = useState<boolean>(false);

  const activeDrillState = controlledDrillState || internalDrillState;

  const updateDrillState = (next: WidgetDrillState) => {
    setInternalDrillState(next);
    onDrillStateChange?.(next);
  };

  // Determine actual color choices from the widget styling configuration
  const { chartPrimaryColor, chartSecondaryColor, activePalette } = useMemo(() => {
    let primary = widget.primaryColor || '#2563eb';
    let secondary = widget.secondaryColor || '#10b981';
    let palette = COLORS;

    const palettePreset = widget.themePalette || 'professional';
    if (palettePreset === 'professional') {
      primary = '#2563eb';
      secondary = '#475569';
      palette = ['#2563eb', '#475569', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    } else if (palettePreset === 'ocean') {
      primary = '#0284c7';
      secondary = '#06b6d4';
      palette = ['#0284c7', '#06b6d4', '#0ea5e9', '#38bdf8', '#075985', '#0891b2', '#004f7c'];
    } else if (palettePreset === 'sunset') {
      primary = '#ea580c';
      secondary = '#f97316';
      palette = ['#ea580c', '#f97316', '#e11d48', '#db2777', '#fbbf24', '#f43f5e', '#be123c'];
    } else if (palettePreset === 'emerald') {
      primary = '#16a34a';
      secondary = '#10b981';
      palette = ['#16a34a', '#10b981', '#059669', '#34d399', '#15803d', '#047857', '#065f46'];
    } else if (palettePreset === 'amber') {
      primary = '#d97706';
      secondary = '#f59e0b';
      palette = ['#d97706', '#f59e0b', '#b45309', '#f59e0b', '#fbbf24', '#92400e', '#78350f'];
    } else if (palettePreset === 'custom') {
      primary = widget.primaryColor || '#2563eb';
      secondary = widget.secondaryColor || '#10b981';
      palette = [
        primary, 
        secondary, 
        '#2563eb', 
        '#10b981', 
        '#f59e0b', 
        '#8b5cf6', 
        '#ec4899'
      ];
    }

    return {
      chartPrimaryColor: primary,
      chartSecondaryColor: secondary,
      activePalette: palette
    };
  }, [widget.themePalette, widget.primaryColor, widget.secondaryColor]);

  // Determine dynamic axis/legend label sizes
  const parsedAxisLabelSize = useMemo(() => {
    return widget.axisLabelSize === 'sm' ? 9 : widget.axisLabelSize === 'lg' ? 11 : 10;
  }, [widget.axisLabelSize]);

  const parsedDataLabelSize = useMemo(() => {
    return widget.dataLabelSize === 'sm' ? 10 : widget.dataLabelSize === 'lg' ? 12 : 11;
  }, [widget.dataLabelSize]);

  const parsedLegendSize = useMemo(() => {
    return widget.legendSize === 'sm' ? 9 : widget.legendSize === 'lg' ? 11 : 10;
  }, [widget.legendSize]);

  // Local state overrides for columns
  const [overrideX, setOverrideX] = useState<string | null>(null);
  const [overrideY, setOverrideY] = useState<string | null>(null);
  const [showMapper, setShowMapper] = useState(false);

  const headers = primaryDataset?.headers || [];

  const xAxisColumn = overrideX || fuzzyMatchColumn(widget.xAxisColumn, headers) || '';
  const yAxisColumn = overrideY || fuzzyMatchColumn(widget.yAxisColumn, headers) || '';

  const isXMissing = widget.xAxisColumn && widget.type !== 'kpi' ? !headers.includes(xAxisColumn) : false;
  const isYMissing = widget.yAxisColumn ? !headers.includes(yAxisColumn) : false;

  const handleMapX = (val: string) => {
    setOverrideX(val);
    if (onUpdateWidget) {
      onUpdateWidget({ xAxisColumn: val });
    }
  };

  const handleMapY = (val: string) => {
    setOverrideY(val);
    if (onUpdateWidget) {
      onUpdateWidget({ yAxisColumn: val });
    }
  };

  // Derive Drill Hierarchy and Current Effective Visual Dimension
  const hierarchy = useMemo(() => {
    if (!primaryDataset) return null;
    return getDrillHierarchy(widget, primaryDataset);
  }, [widget, primaryDataset]);

  const effectiveDimension = useMemo(() => {
    return getEffectiveDrillDimension(widget, hierarchy, activeDrillState);
  }, [widget, hierarchy, activeDrillState]);

  const activeXAxisColumn = effectiveDimension.column || xAxisColumn;
  const isEffectiveDateCol = effectiveDimension.isDate;
  const effectiveDateGranularity = effectiveDimension.dateGranularity || widget.dateAggregation || 'month';

  const breadcrumbs = useMemo(() => {
    return getDrillBreadcrumbs(hierarchy, activeDrillState);
  }, [hierarchy, activeDrillState]);

  // Drill Navigation Actions
  const handleDrillUp = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeDrillState.path.length > 0) {
      const nextPath = activeDrillState.path.slice(0, -1);
      updateDrillState({
        currentLevelIndex: Math.max(0, activeDrillState.currentLevelIndex - 1),
        path: nextPath,
        isExpandedAll: false
      });
    } else if (activeDrillState.currentLevelIndex > 0) {
      updateDrillState({
        currentLevelIndex: activeDrillState.currentLevelIndex - 1,
        path: [],
        isExpandedAll: false
      });
    }
  };

  const handleExpandNextLevel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (hierarchy && canDrillDown(hierarchy, activeDrillState.currentLevelIndex)) {
      updateDrillState({
        currentLevelIndex: activeDrillState.currentLevelIndex + 1,
        path: activeDrillState.path,
        isExpandedAll: true
      });
    }
  };

  const handleResetDrill = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateDrillState({
      currentLevelIndex: 0,
      path: [],
      isExpandedAll: false
    });
  };

  const handleBreadcrumbClick = (targetLevelIndex: number) => {
    if (targetLevelIndex === 0) {
      handleResetDrill();
    } else {
      const nextPath = activeDrillState.path.slice(0, targetLevelIndex);
      updateDrillState({
        currentLevelIndex: targetLevelIndex,
        path: nextPath,
        isExpandedAll: false
      });
    }
  };

  const handleOpenDetailRecords = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onOpenDrillThrough) {
      onOpenDrillThrough({
        widgetId: widget.id,
        title: widget.title,
        dataset: primaryDataset,
        records: drillFilteredRows,
        drillPath: activeDrillState.path
      });
    } else {
      setIsLocalDrillThroughOpen(true);
    }
  };

  const renderColumnMapper = () => {
    return (
      <div className="h-full flex flex-col justify-center p-4 space-y-2.5 bg-zinc-50/50 dark:bg-[#0c0e16]/25 rounded-xl border border-dashed border-zinc-250 dark:border-zinc-800">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Map Widget Columns</span>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Select the matching column keys from your dataset to display inside this widget.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {widget.type !== 'kpi' && (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Dimension (X-Axis)</label>
              <select
                value={xAxisColumn}
                onChange={(e) => handleMapX(e.target.value)}
                className="w-full text-xs h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-zinc-800 dark:text-zinc-250 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select dimension...</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          )}
          <div className={cn("space-y-1", widget.type === 'kpi' ? "col-span-2" : "")}>
            <label className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider block">Metric (Y-Axis)</label>
            <select
              value={yAxisColumn}
              onChange={(e) => handleMapY(e.target.value)}
              className="w-full text-xs h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-zinc-800 dark:text-zinc-250 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select metric...</option>
              {headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="outline"
            className="text-[10px] h-6 px-2.5 font-bold bg-white dark:bg-zinc-900"
            onClick={() => setShowMapper(false)}
          >
            Done
          </Button>
        </div>
      </div>
    );
  };

  const renderEmptyState = (title: string, subtitle: string) => {
    if (showMapper) {
      return renderColumnMapper();
    }

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-50/40 dark:bg-zinc-950/20 border border-dashed border-zinc-200 dark:border-zinc-800/85 rounded-xl space-y-2 relative group overflow-hidden">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100/60 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-3xs">
          <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-0.5">
          <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 block">{title}</span>
          <span className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5 block max-w-[240px] leading-relaxed mx-auto">{subtitle}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowMapper(true)}
          className="text-[10px] h-7 px-3 border-zinc-250 hover:bg-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold shadow-3xs"
        >
          ⚙️ Map Columns
        </Button>
      </div>
    );
  };

  // 1. Process & Filter Data (Global + Widget Filters)
  const filteredRows = useMemo(() => {
    if (!primaryDataset) return [];
    const sourceRows = primaryDataset.fullData || primaryDataset.data || [];
    if (sourceRows.length === 0) return [];

    // Convert DashboardFilter[] to ColumnFilter[] for explorerEngine
    const applicableColumnFilters: ColumnFilter[] = filters
      .filter(f => (f.datasetId === primaryDataset.id || f.datasetId === primaryDataset.name) && f.value !== null && f.value !== 'all' && f.value !== '')
      .map(f => ({
        id: f.id,
        column: f.column,
        operator: f.operator || 'equals',
        value: String(f.value),
        secondaryValue: f.secondaryValue !== null && f.secondaryValue !== undefined ? String(f.secondaryValue) : undefined
      }));

    // Add widget-level filters
    if (widget.filters && widget.filters.length > 0) {
      applicableColumnFilters.push(...widget.filters);
    }
    if (widget.filter && widget.filter.value) {
      applicableColumnFilters.push({
        id: `w-filter-${widget.id}`,
        column: widget.filter.column,
        operator: widget.filter.operator as any || 'equals',
        value: String(widget.filter.value)
      });
    }

    return filterDataset(sourceRows, applicableColumnFilters, '', []);
  }, [primaryDataset, filters, widget]);

  // 2. Apply Hierarchical Drill-Down Filter
  const drillFilteredRows = useMemo(() => {
    if (!primaryDataset || !activeDrillState.path || activeDrillState.path.length === 0) {
      return filteredRows;
    }
    return applyDrillDown(filteredRows, activeDrillState.path, primaryDataset);
  }, [filteredRows, activeDrillState.path, primaryDataset]);

  // 3. Pagination & Sorting state for Table Widget
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!primaryDataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-400">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Dataset Unavailable</span>
        <span className="text-xs text-zinc-500 mt-1">The referenced dataset could not be found.</span>
      </div>
    );
  }

  // Check column missing states
  if (isXMissing || isYMissing || (widget.type !== 'kpi' && (!xAxisColumn || !yAxisColumn)) || (widget.type === 'kpi' && !yAxisColumn)) {
    return renderEmptyState(
      "Missing columns in active dataset",
      `The configured fields do not exist or could not be mapped automatically in dataset "${primaryDataset?.name || 'unknown'}".`
    );
  }

  // ==========================================
  // WIDGET TYPE 1: KPI CARD (POWER BI STANDARD)
  // ==========================================
  if (widget.type === 'kpi') {
    const kpiDetails = (() => {
      let titleText = widget.title || 'KPI Metric';
      let valueFormatted = '0';
      let rawVal = 0;
      let colToAggregate = yAxisColumn;
      let aggFn = widget.aggregation || 'sum';
      let formatConfig = widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: false };
      let formulaSummaryText = '';

      const referencedKpi = widget.kpiId ? savedKpis.find(k => k.id === widget.kpiId) : null;
      if (referencedKpi) {
        titleText = referencedKpi.name;
        const result = evaluateKpi(referencedKpi, datasets, savedKpis);
        valueFormatted = result.formattedResult;
        rawVal = result.rawResult || 0;
        aggFn = referencedKpi.aggregation || 'sum';
        colToAggregate = referencedKpi.column || yAxisColumn;
        formatConfig = referencedKpi.format;
        formulaSummaryText = result.formulaSummary;
      } else {
        rawVal = evaluateSimpleAggregation(drillFilteredRows, yAxisColumn, aggFn as any) || 0;
        valueFormatted = formatKpiValue(rawVal, formatConfig);
        formulaSummaryText = `Direct ${aggFn} of ${colToAggregate || 'rows'}`;
      }

      // Now compute Comparison trend & Sparkline!
      let comparisonText = '';
      let isPositive = true;
      let sparkPoints: { value: number }[] = [];

      const dateCols = Object.entries(primaryDataset.columnTypes)
        .filter(([_, type]) => type === 'date')
        .map(([col]) => col);

      if (colToAggregate && dateCols.length > 0) {
        const dateCol = dateCols[0];
        
        const validDates = drillFilteredRows
          .map(r => r[dateCol])
          .filter(v => v)
          .map(v => new Date(v))
          .filter(d => !isNaN(d.getTime()));

        if (validDates.length > 0) {
          const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));
          const currentYear = maxDate.getFullYear();
          const currentMonth = maxDate.getMonth();

          // Sparkline Month trend (last 8 points)
          const monthMap = new Map<string, any[]>();
          for (const r of drillFilteredRows) {
            const d = r[dateCol] ? new Date(r[dateCol]) : null;
            if (d && !isNaN(d.getTime())) {
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              if (!monthMap.has(key)) monthMap.set(key, []);
              monthMap.get(key)!.push(r);
            }
          }
          const sortedKeys = Array.from(monthMap.keys()).sort();
          sparkPoints = sortedKeys.map(key => {
            const rows = monthMap.get(key)!;
            const val = evaluateSimpleAggregation(rows, colToAggregate, aggFn as any) || 0;
            return { value: val };
          }).slice(-8);

          // Comparison
          if (widget.comparisonType && widget.comparisonType !== 'none') {
            let currentPeriodRows: any[] = [];
            let previousPeriodRows: any[] = [];
            const periodLabel = widget.comparisonType === 'mom' ? 'MoM' : 'YoY';

            if (widget.comparisonType === 'mom') {
              currentPeriodRows = drillFilteredRows.filter(r => {
                const d = r[dateCol] ? new Date(r[dateCol]) : null;
                return d && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
              });
              let prevYear = currentYear;
              let prevMonth = currentMonth - 1;
              if (prevMonth < 0) {
                prevMonth = 11;
                prevYear -= 1;
              }
              previousPeriodRows = drillFilteredRows.filter(r => {
                const d = r[dateCol] ? new Date(r[dateCol]) : null;
                return d && d.getFullYear() === prevYear && d.getMonth() === prevMonth;
              });
            } else {
              currentPeriodRows = drillFilteredRows.filter(r => {
                const d = r[dateCol] ? new Date(r[dateCol]) : null;
                return d && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
              });
              previousPeriodRows = drillFilteredRows.filter(r => {
                const d = r[dateCol] ? new Date(r[dateCol]) : null;
                return d && d.getFullYear() === currentYear - 1 && d.getMonth() === currentMonth;
              });
            }

            if (currentPeriodRows.length > 0) {
              const curVal = evaluateSimpleAggregation(currentPeriodRows, colToAggregate, aggFn as any) || 0;
              const prevVal = evaluateSimpleAggregation(previousPeriodRows, colToAggregate, aggFn as any) || 0;

              if (prevVal > 0) {
                const pct = ((curVal - prevVal) / prevVal) * 100;
                isPositive = pct >= 0;
                comparisonText = `${isPositive ? '+' : ''}${pct.toFixed(1)}% ${periodLabel}`;
              } else {
                comparisonText = 'Comparison unavailable';
              }
            } else {
              comparisonText = 'Comparison unavailable';
            }
          }
        }
      }

      return {
        title: titleText,
        value: valueFormatted,
        isInvalid: rawVal === null || isNaN(rawVal) || !isFinite(rawVal),
        comparisonText,
        isPositive,
        sparkPoints,
        formulaSummary: formulaSummaryText
      };
    })();

    if (kpiDetails.isInvalid) {
      return (
        <div className="h-full flex flex-col justify-between p-1">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              {kpiDetails.title}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-zinc-400 dark:text-zinc-600 tracking-tight leading-none pt-2">
              Unavailable
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/65 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/80 leading-normal mt-2">
              The configured measure column or referenced KPI is invalid or missing from this dataset.
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850/60 text-[9px] text-zinc-400 shrink-0 mt-2">
            <span>Direct calculation</span>
          </div>
        </div>
      );
    }

    return (
      <div 
        onClick={() => handleOpenDetailRecords()}
        title="Click to view granular detail records"
        className="h-full flex flex-col justify-between p-1 select-all cursor-pointer group/kpi"
      >
        {/* Top row: Title */}
        <div className="flex items-start justify-between gap-1.5 shrink-0">
          <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider truncate" title={kpiDetails.formulaSummary}>
            {kpiDetails.title}
          </span>
          <span className="opacity-0 group-hover/kpi:opacity-100 transition-opacity text-[10px] font-bold text-blue-500 flex items-center gap-0.5">
            <FileSpreadsheet className="w-3 h-3" />
            <span className="hidden sm:inline">Details</span>
          </span>
        </div>

        {/* Mid row: Main Metric Value */}
        <div className="flex-1 flex items-center min-h-0 my-1">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
            {kpiDetails.value}
          </span>
        </div>

        {/* Bottom row: Trend badge + sparkline inline */}
        <div className="flex items-center justify-between gap-2 border-t border-zinc-100/80 dark:border-zinc-900/60 pt-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {widget.comparisonType && widget.comparisonType !== 'none' && (
              kpiDetails.comparisonText === 'Comparison unavailable' ? (
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100/50 dark:bg-zinc-900/50 px-2 py-0.5 rounded-md border border-zinc-200/45 dark:border-zinc-800/40 shrink-0">
                  Comparison unavailable
                </span>
              ) : (
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-0.5",
                  kpiDetails.isPositive
                    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-500/20"
                )}>
                  {kpiDetails.comparisonText}
                </span>
              )
            )}
          </div>

          {/* Sparkline trend rendering */}
          {kpiDetails.sparkPoints.length > 1 && (
            <div className="w-16 h-7 opacity-75 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpiDetails.sparkPoints}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={kpiDetails.isPositive ? "#10b981" : "#ef4444"}
                    fill={kpiDetails.isPositive ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)"}
                    strokeWidth={1.2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Drill-Through Records Modal */}
        {isLocalDrillThroughOpen && (
          <DrillThroughModal
            isOpen={isLocalDrillThroughOpen}
            onClose={() => setIsLocalDrillThroughOpen(false)}
            dataset={primaryDataset}
            filteredRecords={drillFilteredRows}
            widgetTitle={widget.title || kpiDetails.title}
            drillPath={activeDrillState.path}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // CHART / TABLE AGGREGATION ENGINE
  // ==========================================
  const aggregation = widget.aggregation || 'sum';
  const isDateCol = isEffectiveDateCol;

  let aggregatedChartData: any[] = [];
  let invalidCount = 0;

  if (isDateCol) {
    let validDates: Date[] = [];
    const parsedRows = drillFilteredRows.map(row => {
      const val = row[activeXAxisColumn];
      if (val === null || val === undefined || val === '') {
        invalidCount++;
        return { row, date: null };
      }
      const date = parseFlexibleDate(val);
      if (!date) {
        invalidCount++;
        return { row, date: null };
      }
      validDates.push(date);
      return { row, date };
    });

    let level: 'day' | 'week' | 'month' | 'quarter' | 'year' = effectiveDateGranularity as any || 'month';
    if (!level || (level as string) === 'auto') {
      level = determineAutoGranularity(validDates);
    }

    const isMultipleYears = validDates.length > 0 && (() => {
      const minYear = new Date(Math.min(...validDates.map(d => d.getTime()))).getFullYear();
      const maxYear = new Date(Math.max(...validDates.map(d => d.getTime()))).getFullYear();
      return minYear !== maxYear;
    })();

    const dateGroupMap = new Map<number, { periodStart: Date; rows: Record<string, any>[] }>();

    for (const item of parsedRows) {
      if (item.date) {
        const start = getPeriodStart(item.date, level);
        const key = start.getTime();
        if (!dateGroupMap.has(key)) {
          dateGroupMap.set(key, { periodStart: start, rows: [] });
        }
        dateGroupMap.get(key)!.rows.push(item.row);
      }
    }

    const lineMetKey = widget.lineMetric;
    const lineAggFn = widget.lineAggregation || 'avg';

    aggregatedChartData = Array.from(dateGroupMap.entries()).map(([key, group]) => {
      const rawMetric = evaluateSimpleAggregation(group.rows, yAxisColumn, aggregation as any) || 0;
      const rawLineMetric = lineMetKey ? (evaluateSimpleAggregation(group.rows, lineMetKey, lineAggFn as any) || 0) : 0;
      const label = formatPeriodLabel(group.periodStart, level, isMultipleYears);
      return {
        [activeXAxisColumn]: label,
        [xAxisColumn]: label,
        [yAxisColumn]: rawMetric,
        ...(lineMetKey ? { [lineMetKey]: rawLineMetric } : {}),
        timestamp: key,
        rowCount: group.rows.length,
        formattedMetric: formatKpiValue(rawMetric, widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: true })
      };
    });

    aggregatedChartData.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Apply limit to Top N / Bottom N if specified
    if (widget.topN && widget.topN !== 0) {
      const isBottomN = widget.topN < 0;
      const limit = Math.abs(widget.topN);
      aggregatedChartData.sort((a, b) => {
        const valA = Number(a[yAxisColumn]) || 0;
        const valB = Number(b[yAxisColumn]) || 0;
        return isBottomN ? valA - valB : valB - valA;
      });
      aggregatedChartData = aggregatedChartData.slice(0, limit);
    }
  } else {
    // Group drillFilteredRows by activeXAxisColumn
    const groupedDataMap = new Map<string, Record<string, any>[]>();
    for (const row of drillFilteredRows) {
      let key = row[activeXAxisColumn];
      if (key === null || key === undefined || key === '') key = '(Blank)';
      else key = String(key);

      if (!groupedDataMap.has(key)) groupedDataMap.set(key, []);
      groupedDataMap.get(key)!.push(row);
    }

    const lineMetKey = widget.lineMetric;
    const lineAggFn = widget.lineAggregation || 'avg';

    aggregatedChartData = Array.from(groupedDataMap.entries()).map(([key, groupRows]) => {
      const rawMetric = evaluateSimpleAggregation(groupRows, yAxisColumn, aggregation as any) || 0;
      const rawLineMetric = lineMetKey ? (evaluateSimpleAggregation(groupRows, lineMetKey, lineAggFn as any) || 0) : 0;
      return {
        [activeXAxisColumn]: key,
        [xAxisColumn]: key,
        [yAxisColumn]: rawMetric,
        ...(lineMetKey ? { [lineMetKey]: rawLineMetric } : {}),
        rowCount: groupRows.length,
        formattedMetric: formatKpiValue(rawMetric, widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true, compactNotation: true })
      };
    });

    // Top N / Bottom N Sorting & Filtering
    if (widget.topN && widget.topN !== 0) {
      const isBottomN = widget.topN < 0;
      const limit = Math.abs(widget.topN);

      aggregatedChartData.sort((a, b) => {
        const valA = Number(a[yAxisColumn]) || 0;
        const valB = Number(b[yAxisColumn]) || 0;
        return isBottomN ? valA - valB : valB - valA;
      });

      aggregatedChartData = aggregatedChartData.slice(0, limit);
    } else {
      aggregatedChartData.sort((a, b) => {
        const valA = a[activeXAxisColumn];
        const valB = b[activeXAxisColumn];
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) return Number(valA) - Number(valB);
        return String(valA).localeCompare(String(valB));
      });
    }
  }

  // High Cardinality Intercept Check
  const isPieDonut = widget.type === 'pie' || widget.type === 'donut';
  const isBarOrColumn = widget.type === 'bar' || widget.type === 'column';
  const cardinality = aggregatedChartData.length;

  const isHighCardinalityPie = isPieDonut && cardinality > 12 && !widget.topN;
  const isHighCardinalityBar = isBarOrColumn && cardinality > 30 && !widget.topN;

  if (isHighCardinalityPie || isHighCardinalityBar) {
    return (
      <div id={`hc-${widget.id}`} className="h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-50/50 dark:bg-zinc-950/40 border border-amber-200/50 dark:border-amber-900/40 rounded-xl space-y-3">
        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">High Cardinality</h4>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Dimension <code className="bg-zinc-100 dark:bg-zinc-900 px-1 py-0.5 rounded text-[11px] font-mono">{activeXAxisColumn}</code> contains {cardinality.toLocaleString()} unique values.
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal">
            {isPieDonut 
              ? "Pie and Donut charts are not suitable for displaying this dimension. Rendering too many slices makes the chart unreadable."
              : "Bar charts with too many categories become dense and illegible. Apply a filter or view as a table instead."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 max-w-sm">
          {onUpdateWidget ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onUpdateWidget({ topN: 10 })}
                className="text-[11px] h-7 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                Use Top 10
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onUpdateWidget({ topN: 20 })}
                className="text-[11px] h-7 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                Use Top 20
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onUpdateWidget({ type: 'table' })}
                className="text-[11px] h-7 px-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
              >
                Use Data Table
              </Button>
            </>
          ) : (
            <span className="text-[10px] text-zinc-400 italic">
              Use the edit modal to set Top 10, Top 20, or switch to a Table layout.
            </span>
          )}
        </div>
      </div>
    );
  }

  if (aggregatedChartData.length === 0) {
    return renderEmptyState(
      'No data available',
      'The current filters, mappings, or column configurations returned no matching rows. Map alternative fields or adjust filters.'
    );
  }

  // Cross Filter Status for this Visual
  const widgetCrossFilter = activeCrossFilters?.find(cf => cf.widgetId === widget.id);
  const hasActiveSelection = !!widgetCrossFilter && widgetCrossFilter.values.length > 0;
  const isValueSelected = (val: any) => {
    if (!hasActiveSelection || !widgetCrossFilter) return false;
    return widgetCrossFilter.values.some(v => String(v) === String(val));
  };

  const hasHierarchy = hierarchy && hierarchy.levels.length > 1;
  const isDrilled = activeDrillState.path.length > 0 || activeDrillState.currentLevelIndex > 0;

  // Custom Chart Wrapper with Power BI Navigation Toolbar & Breadcrumbs Bar
  const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full h-full flex flex-col relative group/widget">
      {/* Top Controls Bar: Breadcrumbs & Power BI Drill-Down Action Buttons */}
      {(hasHierarchy || isDrilled || hasActiveSelection) && (
        <div className="flex items-center justify-between gap-2 pb-1.5 pt-0.5 px-0.5 border-b border-zinc-100 dark:border-zinc-850/60 mb-1 shrink-0 select-none">
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 overflow-x-auto custom-scrollbar max-w-[60%]">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-2.5 h-2.5 text-zinc-400 shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(crumb.levelIndex)}
                  className={cn(
                    "hover:text-blue-600 transition-colors shrink-0 truncate max-w-[90px]",
                    crumb.isCurrent 
                      ? "font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/30" 
                      : "hover:underline text-zinc-600 dark:text-zinc-400 font-medium"
                  )}
                  title={`Jump to ${crumb.label}`}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Drill Navigation Actions Toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Drill Up */}
            {hasHierarchy && (
              <button
                type="button"
                onClick={handleDrillUp}
                disabled={!canDrillUp(activeDrillState.currentLevelIndex)}
                className={cn(
                  "p-1 rounded transition-colors flex items-center justify-center",
                  canDrillUp(activeDrillState.currentLevelIndex)
                    ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shadow-3xs"
                    : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-50"
                )}
                title="Drill Up (One Level Higher)"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Drill Down Mode Toggle ("Click to drill down") */}
            {hasHierarchy && (
              <button
                type="button"
                onClick={() => setIsDrillModeActive(!isDrillModeActive)}
                className={cn(
                  "p-1 rounded transition-all flex items-center gap-1 text-[10px] font-bold",
                  isDrillModeActive
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
                title={isDrillModeActive ? "Drill Mode Active: Click visual data points to explore deeper" : "Turn on 'Click to Drill Down' mode"}
              >
                <ArrowDown className="w-3.5 h-3.5" />
                {isDrillModeActive && <span className="text-[9px] hidden sm:inline">Drill Mode</span>}
              </button>
            )}

            {/* Expand All to Next Level */}
            {hasHierarchy && (
              <button
                type="button"
                onClick={handleExpandNextLevel}
                disabled={!canDrillDown(hierarchy, activeDrillState.currentLevelIndex)}
                className={cn(
                  "p-1 rounded transition-colors flex items-center justify-center",
                  canDrillDown(hierarchy, activeDrillState.currentLevelIndex)
                    ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-50"
                )}
                title="Expand to next hierarchy level (all items)"
              >
                <ChevronsDown className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Reset Drill */}
            {isDrilled && (
              <button
                type="button"
                onClick={handleResetDrill}
                className="p-1 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Reset hierarchy to root level"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}

            {/* Drill-Through / View Raw Records */}
            <button
              type="button"
              onClick={handleOpenDetailRecords}
              className="p-1 rounded text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center gap-1 text-[10px] font-semibold"
              title="Drill-Through: View filtered detail records"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Records</span>
            </button>

            {/* Active Cross Filter Indicator */}
            {hasActiveSelection && (
              <div className="flex items-center gap-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-3xs">
                <Filter className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">
                  {widgetCrossFilter.label || widgetCrossFilter.values.join(', ')}
                </span>
                {onClearWidgetCrossFilter && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearWidgetCrossFilter();
                    }}
                    title="Clear Visual Filter"
                    className="ml-0.5 hover:bg-white/20 rounded p-0.5"
                  >
                    <X className="w-2 h-2" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Visual Container */}
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>

      {/* Drill-Through Records Modal */}
      {isLocalDrillThroughOpen && (
        <DrillThroughModal
          isOpen={isLocalDrillThroughOpen}
          onClose={() => setIsLocalDrillThroughOpen(false)}
          dataset={primaryDataset}
          filteredRecords={drillFilteredRows}
          widgetTitle={widget.title}
          drillPath={activeDrillState.path}
        />
      )}
    </div>
  );

  // Click Handler for Cross-filtering & Drill-down
  const handlePointClick = (entry: any, customColumn?: any) => {
    if (!entry) return;
    const targetCol = typeof customColumn === 'string' ? customColumn : activeXAxisColumn;
    const targetVal = entry[targetCol] !== undefined 
      ? entry[targetCol] 
      : (entry.payload && entry.payload[targetCol] !== undefined ? entry.payload[targetCol] : entry.name || entry.x || entry.category);

    const rawTimestamp = entry.timestamp || (entry.payload && entry.payload.timestamp) || undefined;

    // 1. If Drill Down Mode is Active and hierarchy allows drilling
    if (isDrillModeActive && hierarchy && canDrillDown(hierarchy, activeDrillState.currentLevelIndex)) {
      const nextPath = buildDrillPath(
        activeDrillState.path,
        hierarchy,
        activeDrillState.currentLevelIndex,
        targetVal,
        String(targetVal),
        rawTimestamp
      );
      updateDrillState({
        currentLevelIndex: activeDrillState.currentLevelIndex + 1,
        path: nextPath,
        isExpandedAll: false
      });
      return;
    }

    // 2. Standard Cross-filtering
    if (onDataPointClick && targetCol && targetVal !== undefined && targetVal !== null) {
      onDataPointClick(targetCol, String(targetVal), {
        dateGranularity: isEffectiveDateCol ? effectiveDateGranularity : undefined,
        label: `${targetCol}: ${targetVal}`
      });
    }
  };

  // ==========================================
  // WIDGET TYPE 2: RANKING TABLE
  // ==========================================
  if (widget.type === 'ranking_table') {
    const maxVal = Math.max(...aggregatedChartData.map(d => Number(d[yAxisColumn]) || 0), 1);

    return (
      <div className="h-full flex flex-col overflow-y-auto custom-scrollbar pr-1 space-y-2">
        {aggregatedChartData.map((item, idx) => {
          const val = Number(item[yAxisColumn]) || 0;
          const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
          const catName = String(item[xAxisColumn]);
          const isSelected = isValueSelected(catName);
          const isDimmed = hasActiveSelection && !isSelected;

          return (
            <div 
              key={idx}
              onClick={() => handlePointClick(item)}
              title="Click to cross-filter dashboard"
              className={cn(
                "p-3 rounded-xl border bg-white dark:bg-zinc-900/40 cursor-pointer shadow-3xs hover:shadow-2xs transition-all duration-200 group relative overflow-hidden",
                isSelected 
                  ? "border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 ring-2 ring-blue-500/30" 
                  : "border-zinc-200/60 dark:border-zinc-800/60 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 hover:border-blue-500/25 dark:hover:border-blue-500/20",
                isDimmed && "opacity-40"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 truncate">
                  <span className={cn(
                    "w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 shadow-3xs",
                    idx === 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-350 border border-amber-200/50 dark:border-amber-800/40" :
                    idx === 1 ? "bg-zinc-150 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50" :
                    idx === 2 ? "bg-amber-100/60 text-amber-900 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/40" :
                    "bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-500 border border-zinc-100 dark:border-zinc-900"
                  )}>
                    {idx + 1}
                  </span>
                  <span className={cn(
                    "text-xs font-bold truncate transition-colors",
                    isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  )}>
                    {catName}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0 bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-100 dark:border-zinc-900/80">
                  {item.formattedMetric}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100/80 dark:bg-zinc-950 rounded-full overflow-hidden border border-zinc-150/40 dark:border-zinc-900/20">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isSelected 
                      ? "bg-blue-600 dark:bg-blue-500" 
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 group-hover:from-blue-600 group-hover:to-indigo-600"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Tooltip hint on hover */}
              <div className="absolute right-2 bottom-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-0.5">
                <span>{isSelected ? 'Selected' : 'Filter'}</span>
                <span className="text-[10px]">➔</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ==========================================
  // WIDGET TYPE 3: ANALYTICAL TABLE WIDGET
  // ==========================================
  if (widget.type === 'table') {
    let sortedTableData = [...aggregatedChartData];
    if (sortCol) {
      sortedTableData.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];
        if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
          return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }

    const totalPages = Math.ceil(sortedTableData.length / pageSize) || 1;
    const paginatedData = sortedTableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const toggleSort = (col: string) => {
      if (sortCol === col) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortCol(col);
        setSortDir('desc');
      }
    };

    return (
      <div className="h-full flex flex-col justify-between overflow-hidden">
        <div className="overflow-x-auto flex-1 custom-scrollbar border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-blue-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all select-none" onClick={() => toggleSort(xAxisColumn)}>
                  <div className="flex items-center gap-1.5">
                    <span>{xAxisColumn}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right cursor-pointer hover:text-blue-600 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all select-none" onClick={() => toggleSort(yAxisColumn)}>
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{yAxisColumn} ({(aggregation || 'sum').toUpperCase()})</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right select-none text-zinc-400 font-medium">Rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850/40">
              {paginatedData.map((row, i) => {
                const rowVal = String(row[xAxisColumn]);
                const isSelected = isValueSelected(rowVal);
                const isDimmed = hasActiveSelection && !isSelected;

                return (
                  <tr 
                    key={i} 
                    onClick={() => handlePointClick(row)}
                    title="Click to cross-filter dashboard"
                    className={cn(
                      "cursor-pointer transition-colors group",
                      isSelected ? "bg-blue-500/10 dark:bg-blue-500/20" : "hover:bg-blue-500/5 dark:hover:bg-blue-500/10",
                      isDimmed && "opacity-40"
                    )}
                  >
                    <td className={cn(
                      "py-2.5 px-4 font-bold truncate max-w-[200px] transition-colors",
                      isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    )}>
                      {rowVal}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {row.formattedMetric}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-zinc-400 dark:text-zinc-550">
                      {row.rowCount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span>Page {currentPage} of {totalPages}</span>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-6 h-6" 
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="w-6 h-6" 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDGET TYPE 4: PIE / DONUT CHARTS
  // ==========================================
  if (widget.type === 'pie' || widget.type === 'donut') {
    const isHighCardinality = aggregatedChartData.length > 10;

    return (
      <div className="h-full flex flex-col">
        {isHighCardinality && (
          <div className="mb-2 text-[11px] text-amber-750 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/40 flex items-center gap-1.5 shrink-0">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="font-medium">High category count ({aggregatedChartData.length}). Recommend applying a Top N filter.</span>
          </div>
        )}
        <div className="flex-1 min-h-0 relative">
          <ChartWrapper>
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Pie
                data={aggregatedChartData}
                cx="50%"
                cy="50%"
                innerRadius={widget.type === 'donut' ? 45 : 0}
                outerRadius={70}
                paddingAngle={widget.type === 'donut' ? 2 : 0}
                dataKey={yAxisColumn}
                nameKey={xAxisColumn}
                onClick={(entry: any) => handlePointClick(entry)}
                cursor="pointer"
              >
                {aggregatedChartData.map((entry, index) => {
                  const entryVal = entry[xAxisColumn];
                  const isSelected = isValueSelected(entryVal);
                  const isDimmed = hasActiveSelection && !isSelected;

                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={activePalette[index % activePalette.length]} 
                      opacity={isDimmed ? 0.35 : 1}
                      stroke={isSelected ? '#2563eb' : undefined}
                      strokeWidth={isSelected ? 3 : 0}
                    />
                  );
                })}
              </Pie>
              <Tooltip 
                content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
              />
              {widget.showLegend !== false && (
                <Legend 
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: `${parsedLegendSize}px`, opacity: 0.9 }} 
                />
              )}
            </PieChart>
          </ChartWrapper>
        </div>
      </div>
    );
  }

  // ==========================================
  // WIDGET TYPE 5: LINE & AREA CHARTS
  // ==========================================
  if (widget.type === 'line' || widget.type === 'area') {
    const lineType = widget.lineStyle === 'straight' ? 'linear' : widget.lineStyle === 'step' ? 'step' : 'monotone';
    const showDots = widget.showDataPoints === 'always' ? { r: 3.5, fill: chartPrimaryColor } : widget.showDataPoints === 'never' ? false : (aggregatedChartData.length <= 25 ? { r: 2.5, fill: chartPrimaryColor } : false);
    const useArea = widget.type === 'area' || widget.areaFill;

    return (
      <ChartWrapper>
        {useArea ? (
          <AreaChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartPrimaryColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartPrimaryColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            {widget.showGridLines !== false && (
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
            )}
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip 
              content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
            />
            {widget.showLegend !== false && (
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: `${parsedLegendSize}px`, opacity: 0.8 }} />
            )}
            <Area 
              type={lineType} 
              dataKey={yAxisColumn} 
              name={yAxisColumn}
              stroke={chartPrimaryColor} 
              strokeWidth={2.5} 
              fillOpacity={1} 
              fill={`url(#grad-${widget.id})`}
              onClick={(e: any) => handlePointClick(e)}
            />
          </AreaChart>
        ) : (
          <LineChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            {widget.showGridLines !== false && (
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
            )}
            <XAxis dataKey={xAxisColumn} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip 
              content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
            />
            {widget.showLegend !== false && (
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: `${parsedLegendSize}px`, opacity: 0.8 }} />
            )}
            <Line 
              type={lineType} 
              dataKey={yAxisColumn} 
              name={yAxisColumn}
              stroke={chartPrimaryColor} 
              strokeWidth={2.5} 
              dot={showDots} 
              activeDot={{ r: 6 }}
              onClick={(e: any) => handlePointClick(e)}
            />
          </LineChart>
        )}
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE 5B: COMBO CHART (BAR + LINE)
  // ==========================================
  if (widget.type === 'combo') {
    const lineMetricKey = widget.lineMetric || yAxisColumn;
    const hasSecondaryAxis = widget.lineAxis === 'secondary';

    return (
      <ChartWrapper>
        <ComposedChart data={aggregatedChartData} margin={{ top: 10, right: hasSecondaryAxis ? 25 : 15, left: -10, bottom: 5 }}>
          {widget.showGridLines !== false && (
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
          )}
          <XAxis dataKey={xAxisColumn} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          {hasSecondaryAxis && (
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          )}
          <Tooltip 
            content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
          />
          {widget.showLegend !== false && (
            <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: `${parsedLegendSize}px`, opacity: 0.9 }} />
          )}
          <Bar 
            yAxisId="left"
            dataKey={yAxisColumn} 
            name={yAxisColumn}
            fill={chartPrimaryColor} 
            radius={[4, 4, 0, 0]}
            onClick={(e: any) => handlePointClick(e)}
          >
            {aggregatedChartData.map((entry, index) => {
              const isSelected = isValueSelected(entry[xAxisColumn]);
              const isDimmed = hasActiveSelection && !isSelected;
              return (
                <Cell 
                  key={`combo-bar-${index}`} 
                  fill={chartPrimaryColor} 
                  opacity={isDimmed ? 0.35 : 1}
                  stroke={isSelected ? '#2563eb' : undefined}
                  strokeWidth={isSelected ? 2 : 0}
                />
              );
            })}
          </Bar>
          <Line 
            yAxisId={hasSecondaryAxis ? "right" : "left"}
            type="monotone" 
            dataKey={lineMetricKey} 
            name={lineMetricKey}
            stroke={chartSecondaryColor} 
            strokeWidth={2.5} 
            dot={{ r: 3, fill: chartSecondaryColor }}
            activeDot={{ r: 6 }}
            onClick={(e: any) => handlePointClick(e)}
          />
        </ComposedChart>
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE 6: BAR CHART (HORIZONTAL)
  // ==========================================
  if (widget.type === 'bar') {
    return (
      <ChartWrapper>
        <BarChart 
          layout="vertical" 
          data={aggregatedChartData} 
          margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
        >
          {widget.showGridLines !== false && (
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" opacity={0.15} />
          )}
          <XAxis type="number" tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <YAxis type="category" dataKey={xAxisColumn} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
            content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
          />
          {widget.showLegend && (
            <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: `${parsedLegendSize}px`, opacity: 0.8 }} />
          )}
          <Bar 
            dataKey={yAxisColumn} 
            fill={chartPrimaryColor} 
            radius={[0, 4, 4, 0]}
            onClick={(e: any) => handlePointClick(e)}
            cursor="pointer"
          >
            {aggregatedChartData.map((entry, index) => {
              const isSelected = isValueSelected(entry[xAxisColumn]);
              const isDimmed = hasActiveSelection && !isSelected;
              return (
                <Cell 
                  key={`bar-${index}`} 
                  fill={chartPrimaryColor} 
                  opacity={isDimmed ? 0.35 : 1}
                  stroke={isSelected ? '#2563eb' : undefined}
                  strokeWidth={isSelected ? 2 : 0}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE 7: COLUMN CHART (VERTICAL BARS)
  // ==========================================
  if (widget.type === 'column') {
    return (
      <ChartWrapper>
        <BarChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
          {widget.showGridLines !== false && (
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
          )}
          <XAxis dataKey={xAxisColumn} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip 
            cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
            content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
          />
          {widget.showLegend && (
            <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: `${parsedLegendSize}px`, opacity: 0.8 }} />
          )}
          <Bar 
            dataKey={yAxisColumn} 
            fill={chartPrimaryColor} 
            radius={[4, 4, 0, 0]}
            onClick={(e: any) => handlePointClick(e)}
            cursor="pointer"
          >
            {aggregatedChartData.map((entry, index) => {
              const isSelected = isValueSelected(entry[xAxisColumn]);
              const isDimmed = hasActiveSelection && !isSelected;
              return (
                <Cell 
                  key={`col-${index}`} 
                  fill={chartPrimaryColor} 
                  opacity={isDimmed ? 0.35 : 1}
                  stroke={isSelected ? '#2563eb' : undefined}
                  strokeWidth={isSelected ? 2 : 0}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE: WATERFALL CHART
  // ==========================================
  if (widget.type === 'waterfall') {
    if (!yAxisColumn || aggregatedChartData.length === 0) {
      return (
        <ChartWrapper>
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="font-semibold text-sm">Unable to build waterfall</p>
            <p className="text-xs">{yAxisColumn ? `${yAxisColumn} contains no valid numerical values.` : 'Please configure a valid metric column.'}</p>
          </div>
        </ChartWrapper>
      );
    }

    let runningTotal = 0;
    const waterfallData = aggregatedChartData.map((d) => {
      const val = Number(d[yAxisColumn]) || 0;
      const prevRunning = runningTotal;
      runningTotal += val;
      const isPositive = val >= 0;
      const base = isPositive ? prevRunning : runningTotal;
      const height = Math.abs(val);
      return {
        [xAxisColumn]: d[xAxisColumn],
        change: val,
        base: base,
        height: height,
        runningTotal: runningTotal,
        type: isPositive ? 'positive' : 'negative',
        formattedChange: formatKpiValue(val, widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true }),
        formattedRunning: formatKpiValue(runningTotal, widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true })
      };
    });

    const WaterfallTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="p-3 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl text-xs space-y-2 text-zinc-100 z-50 min-w-[180px]">
            <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1">{String(label || '')}</p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Change:</span>
              <span className={cn("font-bold font-mono", data.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {data.change >= 0 ? `+${data.formattedChange}` : data.formattedChange}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-1">
              <span className="text-zinc-400">Running Total:</span>
              <span className="font-bold font-mono text-white">{data.formattedRunning}</span>
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <ChartWrapper>
        <BarChart data={waterfallData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
          {widget.showGridLines !== false && (
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
          )}
          <XAxis dataKey={xAxisColumn} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
          <Tooltip content={<WaterfallTooltip />} />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="height" stackId="waterfall" radius={[4, 4, 0, 0]} onClick={(data: any) => handlePointClick({ [xAxisColumn]: data?.[xAxisColumn] || data?.payload?.[xAxisColumn], [yAxisColumn]: data?.change || data?.payload?.change })}>
            {waterfallData.map((entry, index) => {
              const isSelected = isValueSelected(entry[xAxisColumn]);
              const isDimmed = hasActiveSelection && !isSelected;
              return (
                <Cell 
                  key={`waterfall-${index}`} 
                  fill={entry.type === 'positive' ? '#10b981' : '#f43f5e'} 
                  opacity={isDimmed ? 0.35 : 1}
                  stroke={isSelected ? '#2563eb' : undefined}
                  strokeWidth={isSelected ? 2 : 0}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE: FUNNEL CHART
  // ==========================================
  if (widget.type === 'funnel') {
    if (!xAxisColumn || !yAxisColumn || aggregatedChartData.length === 0) {
      return (
        <ChartWrapper>
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="font-semibold text-sm">Not enough data for this visualization.</p>
            <p className="text-xs">Configure stage and value columns properly.</p>
          </div>
        </ChartWrapper>
      );
    }

    const rawStages = [...aggregatedChartData];
    if (widget.stageOrder && widget.stageOrder.length > 0) {
      rawStages.sort((a, b) => {
        const idxA = widget.stageOrder!.indexOf(String(a[xAxisColumn]));
        const idxB = widget.stageOrder!.indexOf(String(b[xAxisColumn]));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    } else {
      rawStages.sort((a, b) => (Number(b[yAxisColumn]) || 0) - (Number(a[yAxisColumn]) || 0));
    }

    const firstValue = Number(rawStages[0]?.[yAxisColumn]) || 1;
    const funnelStages = rawStages.map((stage, idx, arr) => {
      const val = Number(stage[yAxisColumn]) || 0;
      const prevVal = idx > 0 ? (Number(arr[idx - 1][yAxisColumn]) || 1) : val;
      const stageConversion = idx === 0 ? 100 : (prevVal > 0 ? (val / prevVal) * 100 : 0);
      const overallConversion = firstValue > 0 ? (val / firstValue) * 100 : 0;
      const widthPct = Math.max(15, Math.min(100, (val / firstValue) * 100));
      return {
        name: String(stage[xAxisColumn]),
        value: val,
        prevValue: prevVal,
        stageConversion,
        overallConversion,
        widthPct,
        formattedValue: formatKpiValue(val, widget.format || { type: 'number', decimals: 0, useThousandsSeparator: true })
      };
    });

    return (
      <ChartWrapper>
        <div className="h-full flex flex-col justify-center space-y-2.5 py-2 overflow-y-auto pr-1">
          {funnelStages.map((stage, idx) => {
            const isSelected = isValueSelected(stage.name);
            const isDimmed = hasActiveSelection && !isSelected;

            return (
              <div 
                key={idx} 
                onClick={() => handlePointClick({ [xAxisColumn]: stage.name, [yAxisColumn]: stage.value })}
                className={cn(
                  "group relative flex flex-col items-center cursor-pointer transition-all",
                  isDimmed && "opacity-40"
                )}
              >
                {/* Stage Bar */}
                <div 
                  style={{ width: `${stage.widthPct}%` }}
                  className={cn(
                    "relative h-9 rounded-xl shadow-sm flex items-center justify-between px-3.5 transition-all",
                    isSelected
                      ? "bg-blue-600 dark:bg-blue-500 ring-2 ring-blue-500 shadow-md"
                      : "bg-blue-500 dark:bg-blue-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:shadow-md"
                  )}
                >
                  <span className="text-xs font-bold text-white truncate drop-shadow-xs">{stage.name}</span>
                  <span className="text-xs font-mono font-extrabold text-white">{stage.formattedValue}</span>
                </div>

                {/* Conversion Metrics Footer below stage */}
                <div className="w-full flex items-center justify-between px-2 text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  <span>{idx === 0 ? 'Starting Volume' : `Stage Conv: ${stage.stageConversion.toFixed(1)}%`}</span>
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">Overall: {stage.overallConversion.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE: GAUGE CHART
  // ==========================================
  if (widget.type === 'gauge') {
    if (!yAxisColumn) {
      return (
        <ChartWrapper>
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="font-semibold text-sm">Configure a valid numeric metric.</p>
            <p className="text-xs">Please select a metric column for the gauge.</p>
          </div>
        </ChartWrapper>
      );
    }

    const actualVal = evaluateSimpleAggregation(filteredRows, yAxisColumn, aggregation || 'sum');
    const targetVal = widget.gaugeTarget ?? 100000;
    const achievementPct = targetVal > 0 ? (actualVal / targetVal) * 100 : 0;
    const variance = actualVal - targetVal;

    const formattedActual = formatKpiValue(actualVal, widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true });
    const formattedTarget = formatKpiValue(targetVal, widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true });
    const formattedVariance = formatKpiValue(Math.abs(variance), widget.format || { type: 'number', decimals: 2, useThousandsSeparator: true });

    let stateLabel = 'Poor (<60%)';
    let stateColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    let arcColor = 'bg-rose-500';
    if (achievementPct >= 100) {
      stateLabel = 'Excellent (100%+)';
      stateColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      arcColor = 'bg-emerald-500';
    } else if (achievementPct >= 80) {
      stateLabel = 'Good (80-100%)';
      stateColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      arcColor = 'bg-emerald-500';
    } else if (achievementPct >= 60) {
      stateLabel = 'Warning (60-80%)';
      stateColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      arcColor = 'bg-amber-500';
    }

    const fillPercentage = Math.min(100, Math.max(0, achievementPct));

    return (
      <ChartWrapper>
        <div 
          onClick={() => handlePointClick({ metric: yAxisColumn, actual: actualVal, target: targetVal, achievement: achievementPct })}
          className="h-full flex flex-col items-center justify-center p-4 cursor-pointer group"
        >
          <div className="w-full max-w-xs space-y-3 text-center">
            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border", stateColor)}>
              <span>{stateLabel}</span>
            </div>

            <div className="space-y-1">
              <span className="text-3xl font-black font-mono tracking-tight text-zinc-900 dark:text-zinc-100">{formattedActual}</span>
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>Target: <strong className="text-zinc-700 dark:text-zinc-300 font-mono">{formattedTarget}</strong></span>
                <span>•</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{achievementPct.toFixed(1)}%</span>
              </div>
            </div>

            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5 border border-zinc-200 dark:border-zinc-700">
              <div 
                className={cn("h-full rounded-full transition-all duration-700 shadow-xs", arcColor)} 
                style={{ width: `${fillPercentage}%` }}
              />
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] bg-zinc-900 text-zinc-100 p-2.5 rounded-xl shadow-xl space-y-1 text-left">
              <div className="flex justify-between"><span>Actual:</span><span className="font-mono font-bold">{formattedActual}</span></div>
              <div className="flex justify-between"><span>Target:</span><span className="font-mono font-bold">{formattedTarget}</span></div>
              <div className="flex justify-between"><span>Achievement:</span><span className="font-mono font-bold">{achievementPct.toFixed(1)}%</span></div>
              <div className="flex justify-between border-t border-zinc-800 pt-1"><span>Variance:</span><span className={cn("font-mono font-bold", variance >= 0 ? "text-emerald-400" : "text-rose-400")}>{variance >= 0 ? `+${formattedVariance}` : `-${formattedVariance}`}</span></div>
            </div>
          </div>
        </div>
      </ChartWrapper>
    );
  }

  // ==========================================
  // WIDGET TYPE: SCATTER PLOT
  // ==========================================
  if (widget.type === 'scatter') {
    const xCol = widget.scatterXAxis || xAxisColumn;
    const yCol = widget.scatterYAxis || yAxisColumn;
    const groupCol = widget.breakdownColumn;

    if (!xCol || !yCol || filteredRows.length === 0) {
      return (
        <ChartWrapper>
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-zinc-500 dark:text-zinc-400 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="font-semibold text-sm">Insufficient data for scatter plot</p>
            <p className="text-xs">Please configure valid numeric X-axis and Y-axis metrics.</p>
          </div>
        </ChartWrapper>
      );
    }

    let scatterPoints = filteredRows.map((row, index) => {
      const xVal = Number(row[xCol]);
      const yVal = Number(row[yCol]);
      return {
        id: index,
        x: isNaN(xVal) ? 0 : xVal,
        y: isNaN(yVal) ? 0 : yVal,
        group: groupCol ? String(row[groupCol] || 'Other') : 'All Points',
        raw: row
      };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y));

    if (widget.yScaleType === 'log' && scatterPoints.some(p => p.y <= 0)) {
      return (
        <ChartWrapper>
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-rose-500 dark:text-rose-400 space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
            <p className="font-semibold text-sm">Log scale requires positive values.</p>
            <p className="text-xs text-zinc-500">Some values in {yCol} are zero or negative.</p>
          </div>
        </ChartWrapper>
      );
    }

    const yValues = scatterPoints.map(p => p.y);
    const meanY = yValues.reduce((a, b) => a + b, 0) / (yValues.length || 1);
    const varianceY = yValues.reduce((a, b) => a + Math.pow(b - meanY, 2), 0) / (yValues.length || 1);
    const stdDevY = Math.sqrt(varianceY);

    scatterPoints = scatterPoints.map(p => ({
      ...p,
      isOutlier: Math.abs(p.y - meanY) > 2.5 * stdDevY
    }));

    let rSquared = 0;
    if (widget.showTrendLine && scatterPoints.length > 1) {
      const n = scatterPoints.length;
      const sumX = scatterPoints.reduce((acc, p) => acc + p.x, 0);
      const sumY = scatterPoints.reduce((acc, p) => acc + p.y, 0);
      const sumXY = scatterPoints.reduce((acc, p) => acc + p.x * p.y, 0);
      const sumXX = scatterPoints.reduce((acc, p) => acc + p.x * p.x, 0);
      const denominator = (n * sumXX - sumX * sumX);
      if (denominator !== 0) {
        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;
        const meanYVal = sumY / n;
        const ssTot = scatterPoints.reduce((acc, p) => acc + Math.pow(p.y - meanYVal, 2), 0);
        const ssRes = scatterPoints.reduce((acc, p) => acc + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
        rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;
      }
    }

    const ScatterCustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="p-3 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl text-xs space-y-1.5 text-zinc-100 z-50 min-w-[180px]">
            <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1">{data.group}</p>
            <div className="flex justify-between gap-4"><span className="text-zinc-400">{xCol}:</span><span className="font-mono font-bold text-white">{data.x.toLocaleString()}</span></div>
            <div className="flex justify-between gap-4"><span className="text-zinc-400">{yCol}:</span><span className="font-mono font-bold text-white">{data.y.toLocaleString()}</span></div>
            {data.isOutlier && (
              <div className="pt-1 text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                <span>⚠️ Potential Outlier</span>
              </div>
            )}
          </div>
        );
      }
      return null;
    };

    return (
      <ChartWrapper>
        <div className="h-full flex flex-col">
          {widget.showTrendLine && rSquared > 0 && (
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 px-2 pb-1 flex justify-between">
              <span>Linear Regression Trend Line Active</span>
              <span className="font-mono font-semibold">R² = {rSquared.toFixed(3)}</span>
            </div>
          )}
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                {widget.showGridLines !== false && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.15} />
                )}
                <XAxis dataKey="x" name={xCol} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="y" name={yCol} scale={widget.yScaleType || 'linear'} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ScatterCustomTooltip />} />
                <Scatter name="Points" data={scatterPoints} fill={chartPrimaryColor} onClick={(e: any) => handlePointClick({ x: e?.x || e?.payload?.x, y: e?.y || e?.payload?.y, group: e?.group || e?.payload?.group })} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartWrapper>
    );
  }

  // ==========================================
  // HEATMAP GRID VISUAL RENDERER
  // ==========================================
  if (widget.type === 'heatmap') {
    const rowCol = overrideX || fuzzyMatchColumn(widget.xAxisColumn, headers) || '';
    const colCol = fuzzyMatchColumn(widget.breakdownColumn || widget.lineAxis, headers) || '';
    const metricCol = overrideY || fuzzyMatchColumn(widget.yAxisColumn, headers) || '';
    const agg = widget.aggregation || 'sum';

    if (!rowCol) return renderEmptyState("Select Row Dimension", "Choose a row dimension column (e.g. Product Category, Region).");
    if (!colCol) return renderEmptyState("Select Column Dimension", "Choose a column dimension (e.g. Month, Channel) in widget settings.");
    if (!metricCol) return renderEmptyState("Select Value Metric", "Choose a numerical metric column to compute heatmap intensity.");
    if (filteredRows.length === 0) return renderEmptyState("No Data Available", "No matching rows found in dataset for current filters.");

    return (
      <ChartWrapper>
        <HeatmapVisualRenderer
          widget={widget}
          dataset={primaryDataset}
          filteredRows={filteredRows}
          rowCol={rowCol}
          colCol={colCol}
          metricCol={metricCol}
          agg={agg}
          chartPrimaryColor={chartPrimaryColor}
          parsedAxisLabelSize={parsedAxisLabelSize}
          activeCrossFilters={activeCrossFilters}
          onDataPointClick={handlePointClick}
        />
      </ChartWrapper>
    );
  }

  // ==========================================
  // MATRIX & PIVOT VISUAL RENDERER
  // ==========================================
  if (widget.type === 'matrix') {
    const primaryRowCol = overrideX || fuzzyMatchColumn(widget.xAxisColumn, headers) || '';
    const secondaryRowCol = fuzzyMatchColumn(widget.matrixRowHierarchy, headers) || '';
    const colCol = fuzzyMatchColumn(widget.breakdownColumn || widget.lineAxis, headers) || '';
    const metricCol = overrideY || fuzzyMatchColumn(widget.yAxisColumn, headers) || '';
    const secondaryMetricCol = fuzzyMatchColumn(widget.secondaryMetric, headers) || '';
    const agg = widget.aggregation || 'sum';
    const secAgg = widget.secondaryAggregation || 'sum';

    if (!primaryRowCol) return renderEmptyState("Select Primary Row Dimension", "Choose a primary row dimension column (e.g. Region, Country).");
    if (!metricCol) return renderEmptyState("Select Primary Metric", "Choose a numerical metric column to display in matrix.");
    if (filteredRows.length === 0) return renderEmptyState("No Data Available", "No matching rows found in dataset for current filters.");

    return (
      <ChartWrapper>
        <MatrixVisualRenderer
          widget={widget}
          dataset={primaryDataset}
          filteredRows={filteredRows}
          primaryRowCol={primaryRowCol}
          secondaryRowCol={secondaryRowCol}
          colCol={colCol}
          metricCol={metricCol}
          secondaryMetricCol={secondaryMetricCol}
          agg={agg}
          secAgg={secAgg}
          chartPrimaryColor={chartPrimaryColor}
          activeCrossFilters={activeCrossFilters}
          onDataPointClick={handlePointClick}
        />
      </ChartWrapper>
    );
  }

  // Default catch-all
  return (
    <ChartWrapper>
      <BarChart data={aggregatedChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
        {widget.showGridLines !== false && (
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.15} />
        )}
        <XAxis dataKey={xAxisColumn} tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: parsedAxisLabelSize, fill: '#888888' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
        <Tooltip 
          cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
          content={<CustomTooltip formatConfig={widget.format} yAxisColumn={yAxisColumn} />}
        />
        {widget.showLegend && (
          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: `${parsedLegendSize}px`, opacity: 0.8 }} />
        )}
        <Bar 
          dataKey={yAxisColumn} 
          fill={chartPrimaryColor} 
          radius={[4, 4, 0, 0]}
          onClick={handlePointClick}
          cursor="pointer"
        />
      </BarChart>
    </ChartWrapper>
  );
}
