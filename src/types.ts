export type RiskLevel = 'low' | 'medium' | 'high';
export type DatasetCleaningStatus = 'original' | 'issues-found' | 'cleaning-suggested' | 'cleaned' | 'cleaning-in-progress';

export interface CleaningIssue {
  id: string;
  datasetId: string;
  column?: string;
  type: 
    | 'duplicate_rows' 
    | 'missing_values' 
    | 'empty_columns' 
    | 'empty_rows' 
    | 'invalid_dates' 
    | 'mixed_dates' 
    | 'numeric_as_text' 
    | 'whitespace' 
    | 'inconsistent_case' 
    | 'outliers' 
    | 'inconsistent_categorical' 
    | 'orphan_records' 
    | 'mixed_types';
  title: string;
  description: string;
  affectedRowCount: number;
  affectedCellCount?: number;
  suggestedAction: string;
  riskLevel: RiskLevel;
  sampleBefore: string[];
  sampleAfter: string[];
  status: 'pending' | 'approved' | 'rejected' | 'applied';
}

export interface CleaningLog {
  id: string;
  timestamp: number;
  datasetId: string;
  datasetName: string;
  issueId: string;
  operation: string;
  column?: string;
  rowsAffected: number;
  cellsAffected?: number;
  previousHealthScore?: number;
  newHealthScore?: number;
  previousData: Record<string, any>[]; // Snapshot for undo
}

export interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "date" | "boolean" | "text" | "unknown";
  nullCount: number;
  uniqueCount: number;
  exampleValue: string | number | boolean | null;
}

export type ColumnType = ColumnProfile['type'];

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  sheetName?: string;
  type: string;
  size: number;
  uploadTime: number;
  updatedAt?: number;
  rowCount: number;
  colCount: number;
  headers: string[];
  data: Record<string, any>[]; // Top 100 rows for preview
  fullData: Record<string, any>[]; // Full dataset for cleaning
  originalData: Record<string, any>[]; // Immutable original dataset
  columnTypes: Record<string, ColumnProfile['type']>;
  columnProfiles: Record<string, ColumnProfile>;
  columnFormats?: Record<string, any>;
  formulas?: Record<string, string>; // { [calculatedColumnHeader]: formulaString }
  
  cleaningStatus?: DatasetCleaningStatus;
  cleaningLogs?: CleaningLog[];
  issues?: CleaningIssue[];
}

export interface RelationshipSuggestion {
  id: string;
  sourceDatasetId: string;
  targetDatasetId: string;
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
  type: '1:1' | '1:N' | 'N:1' | 'N:M';
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  warnings: string[];
}

export type ViewState = 
  | 'data-manager' 
  | 'cleaning' 
  | 'explorer' 
  | 'relationships' 
  | 'kpi-builder' 
  | 'dashboards' 
  | 'mis-report' 
  | 'data-dictionary';

export type WidgetType = 'kpi' | 'line' | 'bar' | 'column' | 'area' | 'scatter' | 'donut' | 'pie' | 'table' | 'ranking_table' | 'combo' | 'waterfall' | 'gauge' | 'funnel' | 'heatmap' | 'matrix';
export type AggregationFunction = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct_count';

export type KpiStatus = 'active' | 'needs_attention' | 'invalid';
export type KpiAggregation = 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max';
export type KpiFormatType = 'number' | 'currency' | 'percentage' | 'decimal';

export interface KpiFormatConfig {
  type: KpiFormatType;
  currencySymbol?: string; // e.g. '$'
  decimals: number; // e.g. 0, 1, 2, 3
  useThousandsSeparator?: boolean;
  compactNotation?: boolean; // e.g. 1.25M
}

export type FormulaOperator = '+' | '-' | '*' | '/' | '(' | ')';

export interface FormulaToken {
  id: string;
  type: 'term' | 'kpi_ref' | 'operator' | 'constant';
  aggregation?: KpiAggregation;
  column?: string;
  kpiId?: string;
  kpiName?: string;
  operator?: FormulaOperator;
  value?: number;
}

export interface KpiDefinition {
  id: string;
  name: string;
  description: string;
  datasetId: string;
  datasetName?: string;
  metricType: 'simple' | 'calculated';
  
  // Simple Metric
  column?: string;
  aggregation?: KpiAggregation;

  // Calculated Metric Formula Tokens
  formulaTokens?: FormulaToken[];

  // Definition Filters
  filters: ColumnFilter[];
  inheritExplorerFilters?: boolean;

  // Presentation Formatting
  format: KpiFormatConfig;

  // Status & Health
  status: KpiStatus;
  statusReason?: string;

  createdAt: number;
  updatedAt: number;

  // Optional usage tracing
  usedBy?: { type: 'dashboard' | 'report' | 'ai'; name: string }[];
}

export interface WidgetLayout {
  x: number; // grid column (0..11)
  y: number; // grid row (0..N)
  w: number; // grid width (1..12)
  h: number; // grid height units
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  subtitle?: string;
  datasetId: string;
  layout?: WidgetLayout; // Phase 7A Grid Layout (x, y, w, h)
  kpiId?: string; // Optional KPI reference for 'kpi' type
  xAxisColumn?: string; // Category, date, or dimension column
  yAxisColumn?: string; // Numeric metric column
  aggregation?: AggregationFunction;
  filter?: { column: string; value: string | number; operator: 'equals' | 'greater' | 'less' | 'contains' };
  filters?: ColumnFilter[]; // Advanced widget filters
  topN?: number; // Positive for Top N (5, 10, 20), negative for Bottom N (-5, -10, -20)
  sortDirection?: 'asc' | 'desc';
  format?: KpiFormatConfig;
  gridSpan?: number; // 1 | 2 | 3 | 4 (where 1 = 3 cols, 2 = 6 cols, 3 = 9 cols, 4 = 12 cols in a 12-col layout)
  height?: string;
  dateAggregation?: 'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  comparisonType?: 'none' | 'yoy' | 'mom';

  // Combo & Advanced Line Chart properties
  lineMetric?: string;
  lineAggregation?: AggregationFunction;
  lineAxis?: 'primary' | 'secondary';
  lineStyle?: 'smooth' | 'straight' | 'step';
  areaFill?: boolean;
  showDataPoints?: 'auto' | 'always' | 'never';
  showDataLabels?: boolean;
  breakdownColumn?: string; // For multi-series (e.g. Region)
  stageOrder?: string[]; // For funnel stage custom ordering

  // Gauge properties
  gaugeTarget?: number;
  gaugeTargetMode?: 'manual' | 'kpi';
  gaugeMin?: number | 'auto';
  gaugeMax?: number | 'auto';

  // Scatter properties
  scatterXAxis?: string;
  scatterYAxis?: string;
  scatterSize?: string;
  scatterGroup?: string;
  scatterAggregation?: AggregationFunction;
  showTrendLine?: boolean;
  xScaleType?: 'linear' | 'log';
  yScaleType?: 'linear' | 'log';

  // Heatmap & Matrix properties
  colorScale?: 'sequential' | 'diverging';
  showTotals?: boolean;
  showSubtotals?: boolean;
  matrixRowHierarchy?: string; // Optional 2nd level row dimension for Matrix hierarchy
  secondaryMetric?: string; // Optional 2nd value metric for Matrix
  secondaryAggregation?: AggregationFunction;
  matrixConditionalFormat?: 'databars' | 'background' | 'none';
  
  // Professional Visual Customization
  primaryColor?: string;
  secondaryColor?: string;
  themePalette?: 'professional' | 'ocean' | 'sunset' | 'emerald' | 'amber' | 'custom';
  chartTitleSize?: 'sm' | 'md' | 'lg';
  chartTitleWeight?: 'normal' | 'medium' | 'bold' | 'black';
  axisLabelSize?: 'sm' | 'md' | 'lg';
  dataLabelSize?: 'sm' | 'md' | 'lg';
  legendSize?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  showGridLines?: boolean;
  borderOn?: boolean;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderIntensity?: 'light' | 'medium' | 'strong';
  subtleShadow?: 'none' | 'sm' | 'md' | 'lg';
  backgroundOpacity?: number; // 0 to 100
  internalPadding?: 'sm' | 'md' | 'lg';

  // Phase 7D: Drill-Down & Drill-Through properties
  hierarchy?: string[]; // Categorical hierarchy fields (e.g. ['Region', 'Country', 'City'])
  enableDrillDown?: boolean;
  expandAllDrill?: boolean;
}

export type DateDrillGranularity = 'year' | 'quarter' | 'month' | 'day';

export interface DrillLevel {
  id: string;
  name: string;
  column: string;
  isDate?: boolean;
  dateGranularity?: DateDrillGranularity;
}

export interface DrillHierarchy {
  id: string;
  name: string;
  type: 'date' | 'categorical';
  levels: DrillLevel[];
}

export interface DrillPathStep {
  levelIndex: number;
  column: string;
  value: string | number | boolean;
  label: string;
  isDate?: boolean;
  dateGranularity?: DateDrillGranularity;
}

export interface WidgetDrillState {
  currentLevelIndex: number;
  path: DrillPathStep[];
  isExpandedAll?: boolean;
}

export interface DrillThroughModalState {
  isOpen: boolean;
  widgetId?: string;
  title?: string;
  dataset: Dataset | null;
  records: Record<string, any>[];
  drillPath?: DrillPathStep[];
  sourceWidgetId?: string;
  sourceWidgetTitle?: string;
  sourceDatasetId?: string;
  clickedValue?: string | number | boolean | null;
  clickedDimension?: string;
}

export interface DashboardCrossFilter {
  widgetId: string;
  column: string;
  operator: 'equals' | 'in' | 'between' | 'date_period';
  values: (string | number | boolean | null)[];
  dateGranularity?: 'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  label?: string;
  datasetId?: string;
}

export interface DashboardViewState {
  schemaVersion: number;
  globalFilters: DashboardFilter[];
  crossFilters: DashboardCrossFilter[];
  drillStates?: Record<string, WidgetDrillState>;
  selectedWidgetIds?: string[];
  widgetVisibility?: Record<string, boolean>; // widgetId -> visible (true/false)
  sortState?: Record<string, unknown>;
  layoutState?: Record<string, WidgetLayout>;
}

export interface DashboardSavedView {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  createdAt: number;
  updatedAt: number;
  state: DashboardViewState;
}

export interface DashboardFilter {
  id: string;
  datasetId: string;
  column: string;
  operator?: FilterOperator;
  value?: string | number | null;
  secondaryValue?: string | number | null;
  values?: (string | number)[];
  min?: number | string;
  max?: number | string;
  dateRangePreset?: 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
}

export interface Dashboard {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  datasetId?: string;
  createdAt: number;
  updatedAt: number;
  widgets: WidgetConfig[];
  filters: DashboardFilter[];
  savedViews?: DashboardSavedView[];
  defaultViewId?: string;
  presentationSequence?: string[];
  presentationAutoPlayInterval?: number;
  presentationShowKpiSummary?: boolean;
  isDemo?: boolean;
}

export type DashboardExportFormat = 'png' | 'pdf' | 'print';

export interface DashboardExportOptions {
  format: DashboardExportFormat;
  orientation?: 'landscape' | 'portrait';
  pageSize?: 'a4' | 'letter' | 'a3';
  scale?: number;
  theme?: 'current' | 'light' | 'dark';
  includeFilterContext?: boolean;
  includeMetadata?: boolean;
  includeKpiSummary?: boolean;
  customTitle?: string;
  customSubtitle?: string;
}

export interface DashboardShareInfo {
  dashboardId: string;
  dashboardTitle: string;
  savedViewId?: string;
  savedViewName?: string;
  shareUrl: string;
  hasUnsavedChanges?: boolean;
}

export interface DashboardPlan {
  title: string;
  datasets: string[];
  kpis: Omit<WidgetConfig, 'id' | 'type'>[];
  charts: Omit<WidgetConfig, 'id'>[];
}

export type FilterOperator = 
  | 'equals' 
  | 'does_not_equal' 
  | 'contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'is_empty' 
  | 'is_not_empty'
  | 'greater_than' 
  | 'less_than' 
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'before' 
  | 'after'
  | 'in'
  | 'not_in';

export interface ColumnFilter {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
  secondaryValue?: string;
}

export interface SortRule {
  column: string;
  direction: 'asc' | 'desc';
}

export interface GroupingConfig {
  groupByColumn: string;
  metricColumn: string;
  aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max';
}

export interface QuickMetricConfig {
  id: string;
  column: string;
  aggregation: 'sum' | 'avg' | 'count' | 'distinct_count' | 'min' | 'max';
}

export interface SavedExplorerView {
  id: string;
  datasetId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  filters: ColumnFilter[];
  sortRules: SortRule[];
  visibleColumns: string[];
  groupingConfig?: GroupingConfig | null;
  quickMetrics?: QuickMetricConfig[];
  searchTerm?: string;
}