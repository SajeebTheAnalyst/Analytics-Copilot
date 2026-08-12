import { get, set } from 'idb-keyval';
import { Dataset } from '@/types';

export interface ColumnMetadata {
  datasetId: string;
  datasetName: string;
  columnName: string;
  description: string;
  semanticTypeOverride?: string; // Identifier, Date, Currency, Percentage, Measure, Dimension, Category, Free Text
  businessNotes?: string;
  tags: string[];
  updatedAt: number;
  isStale?: boolean; // Set to true if dataset or column no longer exists
}

const STORAGE_KEY = 'ac_data_dictionary';

/**
 * Unique key helper for dataset column metadata
 */
export function getColumnMetaKey(datasetId: string, columnName: string): string {
  return `${datasetId}::${columnName}`;
}

/**
 * Fetch saved Column Metadata from IndexedDB
 */
export async function getSavedColumnMetadata(): Promise<Record<string, ColumnMetadata>> {
  try {
    const stored = await get<Record<string, ColumnMetadata>>(STORAGE_KEY);
    if (stored && typeof stored === 'object') {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load Data Dictionary metadata from IndexedDB', e);
  }
  return {};
}

/**
 * Save or update metadata for a single column
 */
export async function saveColumnMetadata(meta: ColumnMetadata): Promise<Record<string, ColumnMetadata>> {
  const current = await getSavedColumnMetadata();
  const key = getColumnMetaKey(meta.datasetId, meta.columnName);

  const updated: Record<string, ColumnMetadata> = {
    ...current,
    [key]: {
      ...meta,
      updatedAt: Date.now(),
      isStale: false
    }
  };

  try {
    await set(STORAGE_KEY, updated);
  } catch (e) {
    console.error('Failed to persist Data Dictionary metadata', e);
  }

  return updated;
}

/**
 * Check active datasets and mark missing columns/datasets as stale
 */
export async function syncAndMarkStaleMetadata(
  activeDatasets: Dataset[]
): Promise<Record<string, ColumnMetadata>> {
  const current = await getSavedColumnMetadata();
  let hasChanges = false;
  const updated: Record<string, ColumnMetadata> = { ...current };

  const activeDatasetMap = new Map<string, Set<string>>();
  for (const ds of activeDatasets) {
    activeDatasetMap.set(ds.id, new Set(ds.headers || []));
  }

  for (const [key, meta] of Object.entries(current)) {
    const activeCols = activeDatasetMap.get(meta.datasetId);
    const isNowStale = !activeCols || !activeCols.has(meta.columnName);

    if (meta.isStale !== isNowStale) {
      updated[key] = { ...meta, isStale: isNowStale };
      hasChanges = true;
    }
  }

  if (hasChanges) {
    try {
      await set(STORAGE_KEY, updated);
    } catch (e) {
      console.error('Failed to persist synced metadata', e);
    }
  }

  return updated;
}
