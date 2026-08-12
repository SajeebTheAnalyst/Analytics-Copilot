import { get, set } from 'idb-keyval';
import { ColumnFilter } from '@/types';

export interface MisReportConfig {
  id: string;
  title: string;
  subtitle: string;
  preparedBy?: string;
  organization?: string;
  datasetId: string;
  dashboardId?: string;
  filters: ColumnFilter[];
  topN: number;
  dateColumn?: string;
  startDate?: string;
  endDate?: string;
  createdAt: number;
  updatedAt: number;
}

const MIS_STORAGE_KEY = 'ac_mis_reports';

/**
 * Fetch saved MIS Report configurations from IndexedDB
 */
export async function getSavedMisReports(): Promise<MisReportConfig[]> {
  try {
    const stored = await get<MisReportConfig[]>(MIS_STORAGE_KEY);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load MIS reports from IndexedDB', e);
  }
  return [];
}

/**
 * Save or update an MIS Report configuration
 */
export async function saveMisReport(config: MisReportConfig): Promise<MisReportConfig[]> {
  const current = await getSavedMisReports();
  const existingIdx = current.findIndex(r => r.id === config.id);

  let updated: MisReportConfig[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...config, updatedAt: Date.now() };
  } else {
    updated = [config, ...current];
  }

  try {
    await set(MIS_STORAGE_KEY, updated);
  } catch (e) {
    console.error('Failed to persist MIS report configuration', e);
  }

  return updated;
}

/**
 * Delete a saved MIS Report configuration
 */
export async function deleteMisReport(id: string): Promise<MisReportConfig[]> {
  const current = await getSavedMisReports();
  const updated = current.filter(r => r.id !== id);

  try {
    await set(MIS_STORAGE_KEY, updated);
  } catch (e) {
    console.error('Failed to delete MIS report configuration', e);
  }

  return updated;
}
