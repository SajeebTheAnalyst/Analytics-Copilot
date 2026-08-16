import { get, set } from 'idb-keyval';
import { Dashboard, Dataset, KpiDefinition, WidgetConfig } from '@/types';

const DASHBOARD_STORAGE_KEY = 'ac_dashboards';

/**
 * Get all saved dashboards from IndexedDB
 */
export async function getSavedDashboards(): Promise<Dashboard[]> {
  try {
    const stored = await get<Dashboard[]>(DASHBOARD_STORAGE_KEY);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load saved dashboards from IndexedDB', e);
  }
  return [];
}

/**
 * Persist array of dashboards to IndexedDB
 */
export async function saveDashboards(dashboards: Dashboard[]): Promise<void> {
  try {
    await set(DASHBOARD_STORAGE_KEY, dashboards);
  } catch (e) {
    console.error('Failed to save dashboards to IndexedDB', e);
  }
}

/**
 * Create a rich Demo Dashboard populated with real KPI cards, charts, and tables
 */
export function generateDemoDashboard(dataset: Dataset, savedKpis: KpiDefinition[] = []): Dashboard {
  const dsId = dataset.id;
  const datasetKpis = savedKpis.filter(k => k.datasetId === dsId);

  // Match KPI IDs or fall back to column configurations
  const revenueKpi = datasetKpis.find(k => k.name.toLowerCase().includes('revenue'));
  const profitKpi = datasetKpis.find(k => k.name.toLowerCase().includes('profit'));
  const ordersKpi = datasetKpis.find(k => k.name.toLowerCase().includes('order') || k.name.toLowerCase().includes('count'));

  const widgets: WidgetConfig[] = [
    // 1. KPI Cards (x: 0, 3, 6, 9 | y: 0 | w: 3 | h: 2)
    {
      id: `w-kpi-rev-${Date.now()}`,
      type: 'kpi',
      title: 'Total Revenue',
      subtitle: 'Gross revenue generated across all completed sales',
      datasetId: dsId,
      kpiId: revenueKpi?.id,
      yAxisColumn: 'Revenue',
      aggregation: 'sum',
      gridSpan: 1,
      layout: { x: 0, y: 0, w: 3, h: 2 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },
    {
      id: `w-kpi-prof-${Date.now()}`,
      type: 'kpi',
      title: 'Total Gross Profit',
      subtitle: 'Net margin after subtractable cost of goods',
      datasetId: dsId,
      kpiId: profitKpi?.id,
      yAxisColumn: 'Profit',
      aggregation: 'sum',
      gridSpan: 1,
      layout: { x: 3, y: 0, w: 3, h: 2 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },
    {
      id: `w-kpi-ord-${Date.now()}`,
      type: 'kpi',
      title: 'Total Orders',
      subtitle: 'Total volume of transactions fulfilled',
      datasetId: dsId,
      kpiId: ordersKpi?.id,
      yAxisColumn: 'Order ID',
      aggregation: 'count',
      gridSpan: 1,
      layout: { x: 6, y: 0, w: 3, h: 2 },
      format: {
        type: 'number',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: false
      }
    },
    {
      id: `w-kpi-aov-${Date.now()}`,
      type: 'kpi',
      title: 'Average Order Value',
      subtitle: 'Mean value per customer order',
      datasetId: dsId,
      yAxisColumn: 'Revenue',
      aggregation: 'avg',
      gridSpan: 1,
      layout: { x: 9, y: 0, w: 3, h: 2 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 2,
        useThousandsSeparator: true,
        compactNotation: false
      }
    },

    // 2. Main Revenue Trend Chart (x: 0, y: 2, w: 6, h: 4)
    {
      id: `w-chart-trend-${Date.now()}`,
      type: 'area',
      title: 'Monthly Revenue Trend',
      subtitle: 'Revenue performance over time by order date',
      datasetId: dsId,
      xAxisColumn: 'Date',
      yAxisColumn: 'Revenue',
      aggregation: 'sum',
      gridSpan: 2,
      height: 'h-80',
      layout: { x: 0, y: 2, w: 6, h: 4 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 3. Regional Revenue Breakdown (x: 6, y: 2, w: 6, h: 4)
    {
      id: `w-chart-region-${Date.now()}`,
      type: 'bar',
      title: 'Revenue by Region',
      subtitle: 'Regional geographic sales volume comparison',
      datasetId: dsId,
      xAxisColumn: 'Region',
      yAxisColumn: 'Revenue',
      aggregation: 'sum',
      gridSpan: 2,
      height: 'h-80',
      topN: 10,
      layout: { x: 6, y: 2, w: 6, h: 4 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 4. Sales Distribution by Category (x: 0, y: 6, w: 6, h: 4)
    {
      id: `w-chart-cat-${Date.now()}`,
      type: 'donut',
      title: 'Revenue Share by Product Category',
      subtitle: 'Proportional contribution of product categories',
      datasetId: dsId,
      xAxisColumn: 'Category',
      yAxisColumn: 'Revenue',
      aggregation: 'sum',
      gridSpan: 2,
      height: 'h-80',
      layout: { x: 0, y: 6, w: 6, h: 4 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 5. Top 5 Best Selling Products (x: 6, y: 6, w: 6, h: 4)
    {
      id: `w-rank-products-${Date.now()}`,
      type: 'ranking_table',
      title: 'Top 5 Products by Revenue',
      subtitle: 'Highest performing individual product SKUs',
      datasetId: dsId,
      xAxisColumn: 'Product',
      yAxisColumn: 'Revenue',
      aggregation: 'sum',
      topN: 5,
      gridSpan: 2,
      height: 'h-80',
      layout: { x: 6, y: 6, w: 6, h: 4 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 6. Detailed Analytical Performance Table (x: 0, y: 10, w: 12, h: 4)
    {
      id: `w-table-detail-${Date.now()}`,
      type: 'table',
      title: 'Customer Order Performance Summary',
      subtitle: 'Detailed order level metrics and customer breakdown',
      datasetId: dsId,
      xAxisColumn: 'Customer',
      yAxisColumn: 'Revenue',
      aggregation: 'sum',
      gridSpan: 4,
      topN: 15,
      layout: { x: 0, y: 10, w: 12, h: 4 },
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 2,
        useThousandsSeparator: true,
        compactNotation: false
      }
    }
  ];

  return {
    id: `dash-demo-${Date.now()}`,
    title: 'Executive Sales & Revenue Dashboard',
    description: 'High-level business analytics overview generated from demo sales data',
    datasetId: dsId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    widgets,
    filters: [],
    savedViews: [
      {
        id: `view-default-${Date.now()}`,
        name: 'All Sales & Performance',
        description: 'Complete baseline view with all regional sales, profit trends, and customer breakdowns.',
        isDefault: true,
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        state: {
          schemaVersion: 1,
          globalFilters: [],
          crossFilters: []
        }
      },
      {
        id: `view-north-${Date.now()}`,
        name: 'North Region Focus',
        description: 'Filtered analytical view focusing on North regional transactions and performance.',
        isDefault: false,
        createdAt: Date.now() - 1800000,
        updatedAt: Date.now() - 1800000,
        state: {
          schemaVersion: 1,
          globalFilters: [
            {
              id: `df-demo-north`,
              datasetId: dsId,
              column: 'Region',
              operator: 'equals',
              value: 'North',
              values: ['North']
            }
          ],
          crossFilters: []
        }
      }
    ],
    defaultViewId: `view-default-${Date.now()}`,
    isDemo: true
  };
}

/**
 * Generate a deterministic AI dashboard tailored to the active dataset's schema
 */
export function generateAiDashboard(dataset: Dataset, savedKpis: KpiDefinition[] = []): Dashboard {
  const dsId = dataset.id;
  const profiles = dataset.columnProfiles;
  
  // Find numeric columns
  const numericCols = Object.entries(profiles)
    .filter(([_, p]) => p.type === 'numeric')
    .map(([name]) => name);
    
  // Find categorical/text columns
  const categoricalCols = Object.entries(profiles)
    .filter(([_, p]) => p.type === 'categorical' || p.type === 'text')
    .map(([name]) => name);

  // Find date columns
  const dateCols = Object.entries(profiles)
    .filter(([_, p]) => p.type === 'date')
    .map(([name]) => name);

  // Fallbacks if lists are empty
  const defaultNumeric = numericCols[0] || (dataset.headers[1] || dataset.headers[0]);
  const defaultCategorical = categoricalCols[0] || dataset.headers[0];
  const defaultDate = dateCols[0] || Object.entries(profiles).find(([_, p]) => p.type === 'date' || p.type === 'numeric')?.[0] || dataset.headers[0];

  // Try to find semantic matches
  const findCol = (choices: string[], keywords: string[], fallback: string): string => {
    for (const kw of keywords) {
      const match = choices.find(c => c.toLowerCase().includes(kw));
      if (match) return match;
    }
    return fallback;
  };

  const revenueCol = findCol(numericCols, ['revenue', 'sales', 'amount', 'total', 'price', 'profit'], defaultNumeric);
  const qtyCol = findCol(numericCols, ['qty', 'quantity', 'units', 'volume', 'count'], numericCols[1] || defaultNumeric);
  const marginCol = findCol(numericCols, ['profit', 'margin', 'gain', 'net'], numericCols[2] || defaultNumeric);

  const catCol1 = findCol(categoricalCols, ['category', 'type', 'genre', 'segment'], defaultCategorical);
  const catCol2 = findCol(categoricalCols, ['region', 'country', 'state', 'city', 'location'], categoricalCols[1] || defaultCategorical);
  const itemCol = findCol(categoricalCols, ['product', 'item', 'sku', 'name', 'title'], categoricalCols[2] || defaultCategorical);
  const entityCol = findCol(categoricalCols, ['customer', 'client', 'user', 'buyer', 'employee'], categoricalCols[3] || defaultCategorical);

  const dateCol = findCol(dateCols, ['date', 'time', 'created', 'order_date'], defaultDate);

  const widgets: WidgetConfig[] = [];

  // Widget 1: KPI sum of revenueCol
  widgets.push({
    id: `w-ai-kpi-1-${Date.now()}`,
    type: 'kpi',
    title: `Total ${revenueCol}`,
    subtitle: `Sum of ${revenueCol} over entire dataset`,
    datasetId: dsId,
    yAxisColumn: revenueCol,
    aggregation: 'sum',
    gridSpan: 1,
    format: {
      type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
      currencySymbol: '$',
      decimals: 0,
      useThousandsSeparator: true,
      compactNotation: true
    }
  });

  // Widget 2: KPI sum of qtyCol or distinct count of entities
  if (qtyCol !== revenueCol) {
    widgets.push({
      id: `w-ai-kpi-2-${Date.now()}`,
      type: 'kpi',
      title: `Total ${qtyCol}`,
      subtitle: `Aggregated sum of ${qtyCol}`,
      datasetId: dsId,
      yAxisColumn: qtyCol,
      aggregation: 'sum',
      gridSpan: 1,
      format: {
        type: 'number',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    });
  } else {
    widgets.push({
      id: `w-ai-kpi-2-${Date.now()}`,
      type: 'kpi',
      title: `Unique ${entityCol || 'Records'}`,
      subtitle: `Distinct count of ${entityCol || 'records'}`,
      datasetId: dsId,
      yAxisColumn: entityCol || dataset.headers[0],
      aggregation: 'distinct_count',
      gridSpan: 1,
      format: {
        type: 'number',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: false
      }
    });
  }

  // Widget 3: KPI average of revenueCol
  widgets.push({
    id: `w-ai-kpi-3-${Date.now()}`,
    type: 'kpi',
    title: `Average ${revenueCol}`,
    subtitle: `Mean ${revenueCol} per transaction`,
    datasetId: dsId,
    yAxisColumn: revenueCol,
    aggregation: 'avg',
    gridSpan: 1,
    format: {
      type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
      currencySymbol: '$',
      decimals: 2,
      useThousandsSeparator: true,
      compactNotation: false
    }
  });

  // Widget 4: KPI maximum of revenueCol
  widgets.push({
    id: `w-ai-kpi-4-${Date.now()}`,
    type: 'kpi',
    title: `Max ${revenueCol}`,
    subtitle: `Peak individual recorded ${revenueCol}`,
    datasetId: dsId,
    yAxisColumn: revenueCol,
    aggregation: 'max',
    gridSpan: 1,
    format: {
      type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
      currencySymbol: '$',
      decimals: 0,
      useThousandsSeparator: true,
      compactNotation: true
    }
  });

  // Widget 5: Area trend chart over dateCol
  widgets.push({
    id: `w-ai-trend-${Date.now()}`,
    type: 'area',
    title: `${revenueCol} Performance Trend`,
    subtitle: `${revenueCol} aggregated by ${dateCol}`,
    datasetId: dsId,
    xAxisColumn: dateCol,
    yAxisColumn: revenueCol,
    aggregation: 'sum',
    gridSpan: 2,
    height: 'h-80',
    format: {
      type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
      currencySymbol: '$',
      decimals: 0,
      useThousandsSeparator: true,
      compactNotation: true
    }
  });

  // Widget 6: Bar chart by primary categorical column
  widgets.push({
    id: `w-ai-cat1-${Date.now()}`,
    type: 'bar',
    title: `${revenueCol} by ${catCol1}`,
    subtitle: `Distribution of ${revenueCol} by ${catCol1}`,
    datasetId: dsId,
    xAxisColumn: catCol1,
    yAxisColumn: revenueCol,
    aggregation: 'sum',
    gridSpan: 2,
    height: 'h-80',
    topN: 10,
    format: {
      type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
      currencySymbol: '$',
      decimals: 0,
      useThousandsSeparator: true,
      compactNotation: true
    }
  });

  // Widget 7: Donut chart by secondary categorical column
  if (catCol2 !== catCol1) {
    widgets.push({
      id: `w-ai-cat2-${Date.now()}`,
      type: 'donut',
      title: `${revenueCol} Share by ${catCol2}`,
      subtitle: `Proportional contribution of ${catCol2}`,
      datasetId: dsId,
      xAxisColumn: catCol2,
      yAxisColumn: revenueCol,
      aggregation: 'sum',
      gridSpan: 2,
      height: 'h-80',
      format: {
        type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    });
  }

  // Widget 8: Ranking table for products/skus
  widgets.push({
    id: `w-ai-rank-${Date.now()}`,
    type: 'ranking_table',
    title: `Top Leading ${itemCol || catCol1}`,
    subtitle: `Performance ranking of ${itemCol || catCol1} by ${revenueCol}`,
    datasetId: dsId,
    xAxisColumn: itemCol || catCol1,
    yAxisColumn: revenueCol,
    aggregation: 'sum',
    topN: 10,
    gridSpan: 2,
    height: 'h-80',
    format: {
      type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
      currencySymbol: '$',
      decimals: 0,
      useThousandsSeparator: true,
      compactNotation: true
    }
  });

  // Widget 9: Granular detailed table
  widgets.push({
    id: `w-ai-table-${Date.now()}`,
    type: 'table',
    title: `${entityCol || catCol1} Performance Details`,
    subtitle: `Granular matrix of ${revenueCol} metrics grouped by ${entityCol || catCol1}`,
    datasetId: dsId,
    xAxisColumn: entityCol || catCol1,
    yAxisColumn: revenueCol,
    aggregation: 'sum',
    gridSpan: 4,
    topN: 15,
    format: {
      type: revenueCol.toLowerCase().includes('revenue') || revenueCol.toLowerCase().includes('sales') || revenueCol.toLowerCase().includes('amount') || revenueCol.toLowerCase().includes('price') ? 'currency' : 'number',
      currencySymbol: '$',
      decimals: 2,
      useThousandsSeparator: true,
      compactNotation: false
    }
  });

  // Calculate grid coordinates to cleanly align widgets (4 columns in tablet, 12 in desktop)
  widgets.forEach((w, idx) => {
    if (w.type === 'kpi') {
      w.layout = {
        x: (idx * 3) % 12,
        y: 0,
        w: 3,
        h: 2
      };
    }
  });

  let chartIdx = 0;
  widgets.filter(w => w.type !== 'kpi').forEach((w) => {
    if (w.gridSpan === 4) {
      w.layout = {
        x: 0,
        y: 2 + Math.floor(chartIdx / 2) * 4,
        w: 12,
        h: 4
      };
      chartIdx += 2;
    } else {
      w.layout = {
        x: (chartIdx % 2) * 6,
        y: 2 + Math.floor(chartIdx / 2) * 4,
        w: 6,
        h: 4
      };
      chartIdx += 1;
    }
  });

  return {
    id: `dash-ai-${Date.now()}`,
    title: `AI Generated Executive ${dataset.name} Report`,
    description: `Automated analytical intelligence dashboard custom-fitted for schema ${dataset.name}`,
    datasetId: dsId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    widgets,
    filters: []
  };
}
