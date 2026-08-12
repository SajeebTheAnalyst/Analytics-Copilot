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
    // 1. KPI Cards (Grid Span 1 = 3 cols in 12 col layout)
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
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 2,
        useThousandsSeparator: true,
        compactNotation: false
      }
    },

    // 2. Main Revenue Trend Chart (Grid Span 2 = 6 cols / half width)
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
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 3. Regional Revenue Breakdown (Grid Span 2 = 6 cols / half width)
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
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 4. Sales Distribution by Category (Grid Span 2 = 6 cols)
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
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 5. Top 5 Best Selling Products (Grid Span 2 = 6 cols)
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
      format: {
        type: 'currency',
        currencySymbol: '$',
        decimals: 0,
        useThousandsSeparator: true,
        compactNotation: true
      }
    },

    // 6. Detailed Analytical Performance Table (Grid Span 4 = 12 cols / full width)
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
    isDemo: true
  };
}
