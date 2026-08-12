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

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  type: 'csv' | 'xlsx';
  size: number;
  uploadTime: number;
  rowCount: number;
  colCount: number;
  headers: string[];
  data: Record<string, any>[]; // Top 100 rows for preview
  fullData: Record<string, any>[]; // Full dataset for cleaning
  originalData: Record<string, any>[]; // Immutable original dataset
  columnTypes: Record<string, ColumnProfile['type']>;
  columnProfiles: Record<string, ColumnProfile>;
  
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

export type WidgetType = 'kpi' | 'line' | 'bar' | 'area' | 'scatter' | 'donut' | 'pie' | 'table' | 'ranking_table';
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

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  subtitle?: string;
  datasetId: string;
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
}

export interface DashboardFilter {
  id: string;
  datasetId: string;
  column: string;
  operator?: FilterOperator;
  value: string | number | null;
  secondaryValue?: string;
  dateRangePreset?: 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
}

export interface Dashboard {
  id: string;
  title: string;
  description?: string;
  datasetId?: string;
  createdAt: number;
  updatedAt: number;
  widgets: WidgetConfig[];
  filters: DashboardFilter[];
  isDemo?: boolean;
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
  | 'between'
  | 'before' 
  | 'after';

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