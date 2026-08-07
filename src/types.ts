export interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "date" | "boolean" | "unknown";
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
}
