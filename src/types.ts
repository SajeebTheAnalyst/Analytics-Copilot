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

export type WidgetType = 'kpi' | 'line' | 'bar' | 'area' | 'scatter' | 'donut' | 'pie' | 'table';
export type AggregationFunction = 'sum' | 'count' | 'avg' | 'min' | 'max';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  datasetId: string;
  xAxisColumn?: string;
  yAxisColumn?: string;
  aggregation?: AggregationFunction;
  filter?: { column: string; value: string | number; operator: 'equals' | 'greater' | 'less' | 'contains' };
}

export interface DashboardFilter {
  id: string;
  datasetId: string;
  column: string;
  value: string | number | null;
}

export interface Dashboard {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  widgets: WidgetConfig[];
  filters: DashboardFilter[];
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