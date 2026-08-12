import { Dataset, KpiDefinition, ColumnFilter } from '@/types';
import { evaluateKpi, evaluateSimpleAggregation, formatKpiValue, generateFormulaSummary } from './kpiEngine';
import { filterDataset } from './explorerEngine';

export interface PerformanceMetricSummary {
  total: number;
  avg: number;
  max: number;
  min: number;
  formattedTotal: string;
  formattedAvg: string;
}

export interface GroupRankingItem {
  rank: number;
  name: string;
  primaryValue: number;
  secondaryValue: number;
  orderCount: number;
  formattedPrimary: string;
  formattedSecondary: string;
}

export interface TrendPeriodItem {
  period: string;
  revenue: number;
  profit: number;
  orders: number;
  formattedRevenue: string;
  formattedProfit: string;
}

export interface VarianceItem {
  metricName: string;
  currentValue: number;
  previousValue: number;
  variance: number;
  variancePercent: number;
  formattedCurrent: string;
  formattedPrevious: string;
  formattedVariance: string;
  formattedPercent: string;
  isPositive: boolean;
}

export interface MisDataQualityInfo {
  healthScore: number;
  totalRows: number;
  missingValuesCount: number;
  missingValuesPercent: number;
  duplicateRowsCount: number;
  invalidDatesCount: number;
  cleaningLogsCount: number;
  disclaimer: string;
}

export interface MisExecutiveReportData {
  reportDate: string;
  datasetName: string;
  datasetRowCount: number;
  filteredRowCount: number;
  activeFilters: ColumnFilter[];
  activeFilterSummaryText: string[];
  
  // 1. Executive Summary KPIs
  executiveKpis: {
    totalRevenue: { label: string; raw: number; formatted: string; status: string; warning?: string };
    totalProfit: { label: string; raw: number; formatted: string; status: string; warning?: string };
    totalOrders: { label: string; raw: number; formatted: string; status: string; warning?: string };
    uniqueCustomers: { label: string; raw: number; formatted: string; status: string; warning?: string };
    profitMargin: { label: string; raw: number; formatted: string; status: string; warning?: string };
    avgOrderValue: { label: string; raw: number; formatted: string; status: string; warning?: string };
  };

  // 2. Evaluated Saved KPIs
  kpiPerformanceTable: Array<{
    id: string;
    name: string;
    rawResult: number | null;
    formattedResult: string;
    status: string;
    rowCountEvaluated: number;
    formulaSummary: string;
    warning?: string;
  }>;

  // 3. Performance Analysis
  performanceOverview: {
    revenue: PerformanceMetricSummary & { topCategory?: { name: string; value: number; sharePercent: number } };
    profit: PerformanceMetricSummary & { marginPercent: number };
    orders: { totalOrders: number; distinctCustomers: number; avgItemsPerOrder: number };
    customers: { distinctCount: number; topCustomer?: { name: string; revenue: number }; avgSpendPerCustomer: number };
  };

  // 4. Top / Bottom Rankings
  rankings: {
    topProductsByRevenue: GroupRankingItem[];
    topRegionsByRevenue: GroupRankingItem[];
    topProductsByProfit: GroupRankingItem[];
    bottomProductsByProfit: GroupRankingItem[];
  };

  // 5. Trend Analysis
  trendAnalysis: {
    hasDateField: boolean;
    dateColumnName: string | null;
    trendData: TrendPeriodItem[];
    message?: string;
  };

  // 6. Variance Analysis
  varianceAnalysis: {
    hasVarianceData: boolean;
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    items: VarianceItem[];
    message?: string;
  };

  // 7. Data Quality & Governance
  dataQuality: MisDataQualityInfo;

  // 8. Calculated Management Insights
  managementInsights: string[];
}

/**
 * Column Name Matcher Helper
 */
function findBestColumn(headers: string[], candidates: string[]): string | undefined {
  if (!headers || headers.length === 0) return undefined;
  const lowerHeaders = headers.map(h => ({ original: h, lower: h.toLowerCase().trim().replace(/_/g, ' ') }));

  for (const cand of candidates) {
    const candLower = cand.toLowerCase().trim().replace(/_/g, ' ');
    const exact = lowerHeaders.find(h => h.lower === candLower);
    if (exact) return exact.original;
  }

  for (const cand of candidates) {
    const candLower = cand.toLowerCase().trim().replace(/_/g, ' ');
    const partial = lowerHeaders.find(h => h.lower.includes(candLower));
    if (partial) return partial.original;
  }

  return undefined;
}

/**
 * Group dataset by column and sum measures
 */
function groupAndAggregate(
  data: Record<string, any>[],
  dimCol: string,
  measure1Col?: string,
  measure2Col?: string
): Array<{ name: string; primary: number; secondary: number; count: number }> {
  const map = new Map<string, { primary: number; secondary: number; count: number }>();

  for (const row of data) {
    const keyVal = row[dimCol];
    const key = keyVal !== null && keyVal !== undefined && keyVal !== '' ? String(keyVal).trim() : '(Unspecified)';

    let pVal = 0;
    if (measure1Col && row[measure1Col] !== null && row[measure1Col] !== undefined) {
      const num = Number(row[measure1Col]);
      if (!isNaN(num) && isFinite(num)) pVal = num;
    }

    let sVal = 0;
    if (measure2Col && row[measure2Col] !== null && row[measure2Col] !== undefined) {
      const num = Number(row[measure2Col]);
      if (!isNaN(num) && isFinite(num)) sVal = num;
    }

    const current = map.get(key) || { primary: 0, secondary: 0, count: 0 };
    map.set(key, {
      primary: current.primary + pVal,
      secondary: current.secondary + sVal,
      count: current.count + 1
    });
  }

  return Array.from(map.entries()).map(([name, stats]) => ({
    name,
    primary: stats.primary,
    secondary: stats.secondary,
    count: stats.count
  }));
}

/**
 * Main MIS Executive Report Generator
 */
export function generateMisReportData(
  dataset: Dataset,
  allDatasets: Dataset[],
  savedKpis: KpiDefinition[],
  filters: ColumnFilter[] = [],
  topN: number = 10,
  dateColumnOverride?: string
): MisExecutiveReportData {
  const headers = dataset.headers || [];
  const fullData = dataset.fullData && dataset.fullData.length > 0 ? dataset.fullData : dataset.data || [];

  // Apply filters
  const filteredData = filterDataset(fullData, filters, '', []);
  const filteredRowCount = filteredData.length;

  // Active filter summaries
  const activeFilterSummaryText = filters.map(f => `${f.column} ${f.operator} ${f.value}`);

  // Detect Core Columns
  const revCol = findBestColumn(headers, ['revenue', 'sales', 'amount', 'total_amount', 'grand_total', 'total_price', 'total']);
  const profitCol = findBestColumn(headers, ['profit', 'margin', 'net_profit', 'gain', 'earnings']);
  const orderCol = findBestColumn(headers, ['order id', 'order_id', 'invoice_id', 'transaction_id', 'id']);
  const custCol = findBestColumn(headers, ['customer', 'customer_name', 'client', 'customer_id', 'user']);
  const prodCol = findBestColumn(headers, ['product', 'product_name', 'item', 'item_name', 'sku']);
  const catCol = findBestColumn(headers, ['category', 'product_category', 'product_line', 'segment', 'department']);
  const regCol = findBestColumn(headers, ['region', 'city', 'state', 'country', 'territory', 'location', 'zone']);
  
  // Date Column Detection
  let dateCol = dateColumnOverride;
  if (!dateCol) {
    // Check columnProfiles for type === 'date'
    if (dataset.columnProfiles) {
      const dateProf = Object.entries(dataset.columnProfiles).find(([_, p]) => p.type === 'date');
      if (dateProf) dateCol = dateProf[0];
    }
    if (!dateCol) {
      dateCol = findBestColumn(headers, ['date', 'order_date', 'created_at', 'timestamp', 'transaction_date', 'month', 'year']);
    }
  }

  // 1. Executive Summary calculations
  const rawRev = revCol ? evaluateSimpleAggregation(filteredData, revCol, 'sum') ?? 0 : 0;
  const rawProfit = profitCol ? evaluateSimpleAggregation(filteredData, profitCol, 'sum') ?? 0 : 0;
  const rawOrders = orderCol ? evaluateSimpleAggregation(filteredData, orderCol, 'distinct_count') ?? filteredRowCount : filteredRowCount;
  const rawCustomers = custCol ? evaluateSimpleAggregation(filteredData, custCol, 'distinct_count') ?? 0 : 0;
  
  const rawMargin = rawRev > 0 ? (rawProfit / rawRev) * 100 : 0;
  const rawAov = rawOrders > 0 ? rawRev / rawOrders : 0;

  const executiveKpis = {
    totalRevenue: {
      label: 'Total Revenue',
      raw: rawRev,
      formatted: formatKpiValue(rawRev, { type: 'currency', currencySymbol: '$', decimals: 2 }),
      status: revCol ? 'active' : 'needs_attention',
      warning: revCol ? undefined : 'Revenue column not detected; returned $0'
    },
    totalProfit: {
      label: 'Total Profit',
      raw: rawProfit,
      formatted: formatKpiValue(rawProfit, { type: 'currency', currencySymbol: '$', decimals: 2 }),
      status: profitCol ? 'active' : 'needs_attention',
      warning: profitCol ? undefined : 'Profit column not detected; returned $0'
    },
    totalOrders: {
      label: 'Total Orders',
      raw: rawOrders,
      formatted: formatKpiValue(rawOrders, { type: 'number', decimals: 0 }),
      status: 'active'
    },
    uniqueCustomers: {
      label: 'Unique Customers',
      raw: rawCustomers,
      formatted: formatKpiValue(rawCustomers, { type: 'number', decimals: 0 }),
      status: custCol ? 'active' : 'needs_attention',
      warning: custCol ? undefined : 'Customer column not detected'
    },
    profitMargin: {
      label: 'Profit Margin',
      raw: rawMargin,
      formatted: `${rawMargin.toFixed(1)}%`,
      status: (revCol && profitCol) ? 'active' : 'needs_attention',
      warning: (revCol && profitCol) ? undefined : 'Requires both Revenue and Profit columns'
    },
    avgOrderValue: {
      label: 'Average Order Value (AOV)',
      raw: rawAov,
      formatted: formatKpiValue(rawAov, { type: 'currency', currencySymbol: '$', decimals: 2 }),
      status: revCol ? 'active' : 'needs_attention'
    }
  };

  // 2. Evaluated Saved KPIs Table
  const datasetSavedKpis = savedKpis.filter(k => k.datasetId === dataset.id || k.datasetName === dataset.name);
  const kpiPerformanceTable = datasetSavedKpis.map(kpi => {
    const res = evaluateKpi(kpi, [dataset], savedKpis);
    return {
      id: kpi.id,
      name: kpi.name,
      rawResult: res.rawResult,
      formattedResult: res.formattedResult,
      status: res.status,
      rowCountEvaluated: res.rowCountEvaluated,
      formulaSummary: res.formulaSummary,
      warning: res.errors.concat(res.warnings).join('; ') || undefined
    };
  });

  // 3. Performance Analysis Overview
  const revNums = revCol ? filteredData.map(r => Number(r[revCol])).filter(n => !isNaN(n) && isFinite(n)) : [];
  const profitNums = profitCol ? filteredData.map(r => Number(r[profitCol])).filter(n => !isNaN(n) && isFinite(n)) : [];

  const categoryGrouping = catCol ? groupAndAggregate(filteredData, catCol, revCol) : [];
  categoryGrouping.sort((a, b) => b.primary - a.primary);
  const topCat = categoryGrouping[0];

  const customerGrouping = custCol ? groupAndAggregate(filteredData, custCol, revCol) : [];
  customerGrouping.sort((a, b) => b.primary - a.primary);
  const topCust = customerGrouping[0];

  const performanceOverview = {
    revenue: {
      total: rawRev,
      avg: revNums.length > 0 ? rawRev / revNums.length : 0,
      max: revNums.length > 0 ? Math.max(...revNums) : 0,
      min: revNums.length > 0 ? Math.min(...revNums) : 0,
      formattedTotal: formatKpiValue(rawRev, { type: 'currency', currencySymbol: '$', decimals: 2 }),
      formattedAvg: formatKpiValue(revNums.length > 0 ? rawRev / revNums.length : 0, { type: 'currency', currencySymbol: '$', decimals: 2 }),
      topCategory: topCat ? {
        name: topCat.name,
        value: topCat.primary,
        sharePercent: rawRev > 0 ? (topCat.primary / rawRev) * 100 : 0
      } : undefined
    },
    profit: {
      total: rawProfit,
      avg: profitNums.length > 0 ? rawProfit / profitNums.length : 0,
      max: profitNums.length > 0 ? Math.max(...profitNums) : 0,
      min: profitNums.length > 0 ? Math.min(...profitNums) : 0,
      formattedTotal: formatKpiValue(rawProfit, { type: 'currency', currencySymbol: '$', decimals: 2 }),
      formattedAvg: formatKpiValue(profitNums.length > 0 ? rawProfit / profitNums.length : 0, { type: 'currency', currencySymbol: '$', decimals: 2 }),
      marginPercent: rawMargin
    },
    orders: {
      totalOrders: rawOrders,
      distinctCustomers: rawCustomers,
      avgItemsPerOrder: rawOrders > 0 ? filteredRowCount / rawOrders : 1
    },
    customers: {
      distinctCount: rawCustomers,
      topCustomer: topCust ? { name: topCust.name, revenue: topCust.primary } : undefined,
      avgSpendPerCustomer: rawCustomers > 0 ? rawRev / rawCustomers : 0
    }
  };

  // 4. Rankings (Top N / Bottom N)
  // Products by Revenue
  const prodDim = prodCol || catCol || headers[0];
  const prodRevGroup = groupAndAggregate(filteredData, prodDim, revCol, profitCol);
  prodRevGroup.sort((a, b) => b.primary - a.primary);

  const topProductsByRevenue: GroupRankingItem[] = prodRevGroup.slice(0, topN).map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    primaryValue: item.primary,
    secondaryValue: item.secondary,
    orderCount: item.count,
    formattedPrimary: formatKpiValue(item.primary, { type: 'currency', currencySymbol: '$', decimals: 2 }),
    formattedSecondary: formatKpiValue(item.secondary, { type: 'currency', currencySymbol: '$', decimals: 2 })
  }));

  // Regions by Revenue
  const regDim = regCol || catCol || headers[0];
  const regRevGroup = groupAndAggregate(filteredData, regDim, revCol, profitCol);
  regRevGroup.sort((a, b) => b.primary - a.primary);

  const topRegionsByRevenue: GroupRankingItem[] = regRevGroup.slice(0, topN).map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    primaryValue: item.primary,
    secondaryValue: item.secondary,
    orderCount: item.count,
    formattedPrimary: formatKpiValue(item.primary, { type: 'currency', currencySymbol: '$', decimals: 2 }),
    formattedSecondary: formatKpiValue(item.secondary, { type: 'currency', currencySymbol: '$', decimals: 2 })
  }));

  // Products by Profit (Top N)
  const prodProfitGroup = groupAndAggregate(filteredData, prodDim, profitCol, revCol);
  prodProfitGroup.sort((a, b) => b.primary - a.primary);

  const topProductsByProfit: GroupRankingItem[] = prodProfitGroup.slice(0, topN).map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    primaryValue: item.primary,
    secondaryValue: item.secondary,
    orderCount: item.count,
    formattedPrimary: formatKpiValue(item.primary, { type: 'currency', currencySymbol: '$', decimals: 2 }),
    formattedSecondary: formatKpiValue(item.secondary, { type: 'currency', currencySymbol: '$', decimals: 2 })
  }));

  // Products by Profit (Bottom N)
  const prodProfitBottomGroup = [...prodProfitGroup];
  prodProfitBottomGroup.sort((a, b) => a.primary - b.primary);

  const bottomProductsByProfit: GroupRankingItem[] = prodProfitBottomGroup.slice(0, topN).map((item, idx) => ({
    rank: idx + 1,
    name: item.name,
    primaryValue: item.primary,
    secondaryValue: item.secondary,
    orderCount: item.count,
    formattedPrimary: formatKpiValue(item.primary, { type: 'currency', currencySymbol: '$', decimals: 2 }),
    formattedSecondary: formatKpiValue(item.secondary, { type: 'currency', currencySymbol: '$', decimals: 2 })
  }));

  // 5. Trend Analysis
  let hasDateField = false;
  let trendData: TrendPeriodItem[] = [];
  let trendMessage: string | undefined = undefined;

  if (dateCol) {
    const periodMap = new Map<string, { revenue: number; profit: number; orders: number }>();

    for (const row of filteredData) {
      const rawDate = row[dateCol];
      if (rawDate !== null && rawDate !== undefined && rawDate !== '') {
        let periodKey = String(rawDate).trim();
        // Parse date string into YYYY-MM if possible
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          periodKey = `${year}-${month}`;
        }

        let pRev = 0;
        if (revCol && row[revCol]) {
          const num = Number(row[revCol]);
          if (!isNaN(num) && isFinite(num)) pRev = num;
        }

        let pProfit = 0;
        if (profitCol && row[profitCol]) {
          const num = Number(row[profitCol]);
          if (!isNaN(num) && isFinite(num)) pProfit = num;
        }

        const curr = periodMap.get(periodKey) || { revenue: 0, profit: 0, orders: 0 };
        periodMap.set(periodKey, {
          revenue: curr.revenue + pRev,
          profit: curr.profit + pProfit,
          orders: curr.orders + 1
        });
      }
    }

    if (periodMap.size > 0) {
      hasDateField = true;
      const sortedPeriods = Array.from(periodMap.keys()).sort();
      trendData = sortedPeriods.map(p => {
        const stats = periodMap.get(p)!;
        return {
          period: p,
          revenue: stats.revenue,
          profit: stats.profit,
          orders: stats.orders,
          formattedRevenue: formatKpiValue(stats.revenue, { type: 'currency', currencySymbol: '$', decimals: 0 }),
          formattedProfit: formatKpiValue(stats.profit, { type: 'currency', currencySymbol: '$', decimals: 0 })
        };
      });
    } else {
      trendMessage = "Trend analysis unavailable because no valid date field values could be parsed.";
    }
  } else {
    trendMessage = "Trend analysis unavailable because no valid date field is available in the selected dataset.";
  }

  // 6. Variance Analysis (Period over Period)
  let hasVarianceData = false;
  let currentPeriodLabel = 'Current Period';
  let previousPeriodLabel = 'Previous Period';
  let varianceItems: VarianceItem[] = [];

  if (hasDateField && trendData.length >= 2) {
    hasVarianceData = true;
    const currItem = trendData[trendData.length - 1];
    const prevItem = trendData[trendData.length - 2];

    currentPeriodLabel = currItem.period;
    previousPeriodLabel = prevItem.period;

    // Helper for variance calculation
    const calcVar = (name: string, curr: number, prev: number, isCurrency: boolean): VarianceItem => {
      const diff = curr - prev;
      const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : (curr > 0 ? 100 : 0);
      const isPos = diff >= 0;

      return {
        metricName: name,
        currentValue: curr,
        previousValue: prev,
        variance: diff,
        variancePercent: pct,
        formattedCurrent: isCurrency ? formatKpiValue(curr, { type: 'currency', currencySymbol: '$', decimals: 0 }) : formatKpiValue(curr, { type: 'number', decimals: 0 }),
        formattedPrevious: isCurrency ? formatKpiValue(prev, { type: 'currency', currencySymbol: '$', decimals: 0 }) : formatKpiValue(prev, { type: 'number', decimals: 0 }),
        formattedVariance: (diff >= 0 ? '+' : '') + (isCurrency ? formatKpiValue(diff, { type: 'currency', currencySymbol: '$', decimals: 0 }) : formatKpiValue(diff, { type: 'number', decimals: 0 })),
        formattedPercent: (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%',
        isPositive: isPos
      };
    };

    varianceItems = [
      calcVar('Total Revenue', currItem.revenue, prevItem.revenue, true),
      calcVar('Total Profit', currItem.profit, prevItem.profit, true),
      calcVar('Order Volume', currItem.orders, prevItem.orders, false)
    ];
  }

  // 7. Data Quality & Governance
  let nullCellCount = 0;
  const totalCells = dataset.rowCount * (dataset.colCount || 1);

  if (dataset.columnProfiles) {
    Object.values(dataset.columnProfiles).forEach(p => {
      nullCellCount += (p.nullCount || 0);
    });
  }

  const missingPercent = totalCells > 0 ? (nullCellCount / totalCells) * 100 : 0;
  const issuesCount = dataset.issues?.length || 0;
  const healthScore = Math.max(0, Math.round(100 - (missingPercent * 2) - (issuesCount * 5)));

  const dataQuality: MisDataQualityInfo = {
    healthScore,
    totalRows: dataset.rowCount,
    missingValuesCount: nullCellCount,
    missingValuesPercent: missingPercent,
    duplicateRowsCount: dataset.issues?.filter(i => i.type === 'duplicate_rows').reduce((a, b) => a + b.affectedRowCount, 0) || 0,
    invalidDatesCount: dataset.issues?.filter(i => i.type === 'invalid_dates').reduce((a, b) => a + b.affectedRowCount, 0) || 0,
    cleaningLogsCount: dataset.cleaningLogs?.length || 0,
    disclaimer: "Data Quality Disclaimer: Report results are based on the current cleaned dataset. Results may change if the dataset is updated or additional cleaning operations are applied."
  };

  // 8. Management Insights (Deterministic from calculated figures)
  const managementInsights: string[] = [];

  if (performanceOverview.revenue.topCategory) {
    const c = performanceOverview.revenue.topCategory;
    managementInsights.push(
      `Top Performing Category: "${c.name}" generated ${formatKpiValue(c.value, { type: 'currency', currencySymbol: '$', decimals: 0 })}, representing ${c.sharePercent.toFixed(1)}% of total revenue.`
    );
  }

  if (topRegionsByRevenue.length > 0) {
    const r = topRegionsByRevenue[0];
    managementInsights.push(
      `Regional Leadership: "${r.name}" led all regions with ${r.formattedPrimary} in sales across ${r.orderCount} transaction orders.`
    );
  }

  if (rawRev > 0) {
    managementInsights.push(
      `Profitability & Margin: Overall profit margin reached ${rawMargin.toFixed(1)}% on $${(rawRev / 1000).toFixed(1)}K revenue with an Average Order Value of ${formatKpiValue(rawAov, { type: 'currency', currencySymbol: '$', decimals: 2 })}.`
    );
  }

  if (hasVarianceData && varianceItems.length > 0) {
    const revVar = varianceItems.find(i => i.metricName === 'Total Revenue');
    if (revVar) {
      managementInsights.push(
        `Period Variance: Revenue changed by ${revVar.formattedPercent} (${revVar.formattedVariance}) comparing ${currentPeriodLabel} vs ${previousPeriodLabel}.`
      );
    }
  }

  managementInsights.push(
    `Data Governance Status: Dataset health score is ${healthScore}% with ${dataset.cleaningLogs?.length || 0} applied cleaning transformations and ${dataQuality.missingValuesCount.toLocaleString()} missing cells.`
  );

  return {
    reportDate: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    datasetName: dataset.name,
    datasetRowCount: dataset.rowCount,
    filteredRowCount,
    activeFilters: filters,
    activeFilterSummaryText,
    executiveKpis,
    kpiPerformanceTable,
    performanceOverview,
    rankings: {
      topProductsByRevenue,
      topRegionsByRevenue,
      topProductsByProfit,
      bottomProductsByProfit
    },
    trendAnalysis: {
      hasDateField,
      dateColumnName: dateCol || null,
      trendData,
      message: trendMessage
    },
    varianceAnalysis: {
      hasVarianceData,
      currentPeriodLabel,
      previousPeriodLabel,
      items: varianceItems,
      message: hasVarianceData ? undefined : "Period-over-period variance requires at least 2 distinct date periods in the active dataset."
    },
    dataQuality,
    managementInsights
  };
}
