import { get, set } from 'idb-keyval';
import { KpiDefinition, Dataset } from '@/types';
import { seedStandardKpis } from './kpiEngine';

const KPI_STORAGE_KEY = 'ac_saved_kpis';

/**
 * Get all saved KPIs from IndexedDB
 */
export async function getSavedKpis(): Promise<KpiDefinition[]> {
  try {
    const stored = await get<KpiDefinition[]>(KPI_STORAGE_KEY);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load saved KPIs from IndexedDB', e);
  }
  return [];
}

/**
 * Persist array of KPIs to IndexedDB
 */
export async function saveKpis(kpis: KpiDefinition[]): Promise<void> {
  try {
    await set(KPI_STORAGE_KEY, kpis);
  } catch (e) {
    console.error('Failed to save KPIs to IndexedDB', e);
  }
}

/**
 * Add or update a single KPI definition
 */
export async function addOrUpdateKpi(kpi: KpiDefinition): Promise<KpiDefinition[]> {
  const current = await getSavedKpis();
  const existingIdx = current.findIndex((k) => k.id === kpi.id);
  
  let updated: KpiDefinition[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...kpi, updatedAt: Date.now() };
  } else {
    updated = [kpi, ...current];
  }

  await saveKpis(updated);
  return updated;
}

/**
 * Delete a KPI by ID
 */
export async function deleteKpi(id: string): Promise<KpiDefinition[]> {
  const current = await getSavedKpis();
  const updated = current.filter((k) => k.id !== id);
  await saveKpis(updated);
  return updated;
}

/**
 * Seed initial standard KPIs for dataset if no KPIs exist for it
 */
export async function seedInitialKpisForDataset(dataset: Dataset): Promise<KpiDefinition[]> {
  const current = await getSavedKpis();
  const datasetKpis = current.filter((k) => k.datasetId === dataset.id);

  if (datasetKpis.length === 0) {
    const seeded = seedStandardKpis(dataset.id, dataset.name, dataset.headers);
    const updated = [...seeded, ...current];
    await saveKpis(updated);
    return updated;
  }

  return current;
}
