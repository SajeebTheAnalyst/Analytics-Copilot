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
  columnTypes: Record<string, ColumnProfile['type']>;
  columnProfiles: Record<string, ColumnProfile>;
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

export type ViewState = 'data-manager' | 'relationships' | 'dashboards' | 'copilot';