import { createContext, useContext } from 'react';
import { Dataset, ColumnProfile } from '@/types';

export interface DatasetStoreState {
  datasetId: string | null;
  name: string;
  filename: string;
  sheetName?: string;
  type: string;
  size: number;
  uploadTime: number;
  updatedAt?: number;
  rowCount: number;
  colCount: number;
  rows: Record<string, any>[]; // current working rows (from fullData or data)
  columns: string[]; // current headers
  dataTypes: Record<string, ColumnProfile['type']>; // current columnTypes
  schema: Record<string, ColumnProfile>; // current columnProfiles
  originalData: Record<string, any>[]; // immutable original data for recovery
  metadata: {
    sheetName?: string;
    cleaningStatus?: string;
    [key: string]: any;
  };
}

export interface DatasetStoreContextType {
  currentDataset: Dataset | null;
  workingDataset: DatasetStoreState | null;
  allDatasets: Dataset[];
  selectedDatasetId: string | null;
  setSelectedDatasetId: (id: string | null) => void;
  updateCurrentDataset: (updated: Dataset) => void;
  recoverCurrentDataset: () => void;
}

export const DatasetStoreContext = createContext<DatasetStoreContextType | null>(null);

export function useDatasetStore() {
  const context = useContext(DatasetStoreContext);
  if (!context) {
    throw new Error('useDatasetStore must be used within a DatasetStoreProvider');
  }
  return context;
}
