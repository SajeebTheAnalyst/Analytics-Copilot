export type RiskLevel = 'low' | 'medium' | 'high';
export type DatasetCleaningStatus = 'original' | 'issues-found' | 'cleaning-suggested' | 'cleaned' | 'cleaning-in-progress';

export interface CleaningIssue {
  id: string;
  datasetId: string;
  column?: string;
  type: 'duplicate_rows' | 'missing_values' | 'whitespace' | 'inconsistent_case' | 'orphan_records' | 'mixed_types';
  title: string;
  description: string;
  affectedRowCount: number;
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
  rowsAffected: number;
  previousData: Record<string, any>[]; // Snapshot for undo
}

export interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "date" | "boolean" | "unknown";
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

export type ViewState = 'data-manager' | 'relationships' | 'dashboards' | 'copilot' | 'cleaning';

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