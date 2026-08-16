import { 
  DashboardSavedView, 
  DashboardViewState, 
  DashboardFilter, 
  DashboardCrossFilter, 
  WidgetDrillState, 
  WidgetLayout, 
  Dashboard, 
  Dataset 
} from '@/types';

export const CURRENT_DASHBOARD_VIEW_SCHEMA_VERSION = 1;

/**
 * Creates a normalized analytical state snapshot of the current dashboard runtime.
 * Never includes raw data rows, API keys, or large analytical arrays.
 */
export function createDashboardSnapshot(params: {
  globalFilters?: DashboardFilter[];
  crossFilters?: DashboardCrossFilter[];
  drillStates?: Record<string, WidgetDrillState>;
  selectedWidgetIds?: string[];
  widgetVisibility?: Record<string, boolean>;
  sortState?: Record<string, unknown>;
  layoutState?: Record<string, WidgetLayout>;
}): DashboardViewState {
  // 1. Clean and normalize global filters
  const cleanGlobalFilters: DashboardFilter[] = (params.globalFilters || []).map(f => ({
    id: f.id,
    datasetId: f.datasetId,
    column: f.column,
    operator: f.operator,
    value: f.value !== undefined ? f.value : null,
    secondaryValue: f.secondaryValue !== undefined ? f.secondaryValue : null,
    values: Array.isArray(f.values) ? [...f.values] : [],
    min: f.min,
    max: f.max,
    dateRangePreset: f.dateRangePreset
  }));

  // 2. Clean and normalize visual cross-filters
  const cleanCrossFilters: DashboardCrossFilter[] = (params.crossFilters || []).map(cf => ({
    widgetId: cf.widgetId,
    column: cf.column,
    operator: cf.operator,
    values: Array.isArray(cf.values) ? [...cf.values] : [],
    dateGranularity: cf.dateGranularity,
    label: cf.label,
    datasetId: cf.datasetId
  }));

  // 3. Clean and normalize drill-down states per widget
  const cleanDrillStates: Record<string, WidgetDrillState> = {};
  if (params.drillStates) {
    for (const [wId, dState] of Object.entries(params.drillStates)) {
      if (dState && (dState.currentLevelIndex > 0 || (dState.path && dState.path.length > 0))) {
        cleanDrillStates[wId] = {
          currentLevelIndex: dState.currentLevelIndex,
          path: (dState.path || []).map(p => ({
            levelIndex: p.levelIndex,
            column: p.column,
            value: p.value,
            label: p.label,
            isDate: p.isDate,
            dateGranularity: p.dateGranularity
          })),
          isExpandedAll: Boolean(dState.isExpandedAll)
        };
      }
    }
  }

  // 4. Clean widget visibility
  const cleanWidgetVisibility: Record<string, boolean> = {};
  if (params.widgetVisibility) {
    for (const [wId, isVis] of Object.entries(params.widgetVisibility)) {
      if (isVis === false) {
        cleanWidgetVisibility[wId] = false;
      }
    }
  }

  // 5. Clean layout state if provided
  const cleanLayoutState: Record<string, WidgetLayout> = {};
  if (params.layoutState) {
    for (const [wId, l] of Object.entries(params.layoutState)) {
      if (l && typeof l.x === 'number' && typeof l.y === 'number') {
        cleanLayoutState[wId] = {
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h
        };
      }
    }
  }

  return {
    schemaVersion: CURRENT_DASHBOARD_VIEW_SCHEMA_VERSION,
    globalFilters: cleanGlobalFilters,
    crossFilters: cleanCrossFilters,
    ...(Object.keys(cleanDrillStates).length > 0 ? { drillStates: cleanDrillStates } : {}),
    ...(params.selectedWidgetIds && params.selectedWidgetIds.length > 0 ? { selectedWidgetIds: [...params.selectedWidgetIds] } : {}),
    ...(Object.keys(cleanWidgetVisibility).length > 0 ? { widgetVisibility: cleanWidgetVisibility } : {}),
    ...(params.sortState && Object.keys(params.sortState).length > 0 ? { sortState: { ...params.sortState } } : {}),
    ...(Object.keys(cleanLayoutState).length > 0 ? { layoutState: cleanLayoutState } : {})
  };
}

/**
 * Validates a saved view snapshot against the current dashboard and datasets context.
 * Filters out invalid/deleted references without crashing, returning available valid state.
 */
export function validateDashboardSnapshot(
  snapshot: unknown,
  currentDashboard?: Dashboard | null,
  currentDatasets?: Dataset[]
): { isValid: boolean; state: DashboardViewState; warnings: string[] } {
  const warnings: string[] = [];

  if (!snapshot || typeof snapshot !== 'object') {
    return {
      isValid: false,
      state: createDashboardSnapshot({}),
      warnings: ['Invalid snapshot payload format']
    };
  }

  const rawState = snapshot as Partial<DashboardViewState>;
  const schemaVersion = typeof rawState.schemaVersion === 'number' ? rawState.schemaVersion : 1;

  if (schemaVersion > CURRENT_DASHBOARD_VIEW_SCHEMA_VERSION) {
    warnings.push(`Snapshot was created with a newer schema version (${schemaVersion}). Some settings may not apply.`);
  }

  const validWidgetIds = new Set(currentDashboard?.widgets.map(w => w.id) || []);
  const allDatasetHeaders = new Set<string>();
  if (currentDatasets) {
    for (const ds of currentDatasets) {
      for (const h of ds.headers || []) {
        allDatasetHeaders.add(h);
      }
    }
  }

  // Validate global filters
  const validGlobalFilters: DashboardFilter[] = [];
  if (Array.isArray(rawState.globalFilters)) {
    for (const f of rawState.globalFilters) {
      if (!f || !f.column) continue;
      if (allDatasetHeaders.size > 0 && !allDatasetHeaders.has(f.column)) {
        warnings.push(`Filter column "${f.column}" no longer exists in available datasets.`);
        continue;
      }
      validGlobalFilters.push(f);
    }
  }

  // Validate cross-filters
  const validCrossFilters: DashboardCrossFilter[] = [];
  if (Array.isArray(rawState.crossFilters)) {
    for (const cf of rawState.crossFilters) {
      if (!cf || !cf.column) continue;
      if (validWidgetIds.size > 0 && cf.widgetId && !validWidgetIds.has(cf.widgetId)) {
        warnings.push(`Cross-filter origin widget "${cf.widgetId}" no longer exists.`);
      }
      validCrossFilters.push(cf);
    }
  }

  // Validate drill-states
  const validDrillStates: Record<string, WidgetDrillState> = {};
  if (rawState.drillStates && typeof rawState.drillStates === 'object') {
    for (const [wId, dState] of Object.entries(rawState.drillStates)) {
      if (validWidgetIds.size > 0 && !validWidgetIds.has(wId)) {
        continue;
      }
      if (dState && typeof dState.currentLevelIndex === 'number') {
        validDrillStates[wId] = dState;
      }
    }
  }

  // Validate widget visibility
  const validWidgetVisibility: Record<string, boolean> = {};
  if (rawState.widgetVisibility && typeof rawState.widgetVisibility === 'object') {
    for (const [wId, isVis] of Object.entries(rawState.widgetVisibility)) {
      if (validWidgetIds.size > 0 && !validWidgetIds.has(wId)) {
        continue;
      }
      validWidgetVisibility[wId] = Boolean(isVis);
    }
  }

  // Validate layout state
  const validLayoutState: Record<string, WidgetLayout> = {};
  if (rawState.layoutState && typeof rawState.layoutState === 'object') {
    for (const [wId, l] of Object.entries(rawState.layoutState)) {
      if (validWidgetIds.size > 0 && !validWidgetIds.has(wId)) {
        continue;
      }
      if (l && typeof l.x === 'number' && typeof l.y === 'number' && typeof l.w === 'number' && typeof l.h === 'number') {
        validLayoutState[wId] = l;
      }
    }
  }

  const validatedState: DashboardViewState = {
    schemaVersion,
    globalFilters: validGlobalFilters,
    crossFilters: validCrossFilters,
    drillStates: Object.keys(validDrillStates).length > 0 ? validDrillStates : undefined,
    selectedWidgetIds: Array.isArray(rawState.selectedWidgetIds) ? rawState.selectedWidgetIds.filter(id => validWidgetIds.size === 0 || validWidgetIds.has(id)) : undefined,
    widgetVisibility: Object.keys(validWidgetVisibility).length > 0 ? validWidgetVisibility : undefined,
    sortState: rawState.sortState,
    layoutState: Object.keys(validLayoutState).length > 0 ? validLayoutState : undefined
  };

  return {
    isValid: true,
    state: validatedState,
    warnings
  };
}

/**
 * Deterministically compares two dashboard view states to detect unsaved changes.
 * Ignores transient parameters, timestamps, and empty object key ordering.
 */
export function areDashboardStatesEqual(
  stateA?: DashboardViewState | null,
  stateB?: DashboardViewState | null
): boolean {
  if (!stateA && !stateB) return true;
  if (!stateA || !stateB) return false;

  // 1. Compare global filters
  const filtersA = stateA.globalFilters || [];
  const filtersB = stateB.globalFilters || [];
  if (filtersA.length !== filtersB.length) return false;

  for (let i = 0; i < filtersA.length; i++) {
    const a = filtersA[i];
    const b = filtersB.find(f => f.id === a.id || (f.column === a.column && f.datasetId === a.datasetId));
    if (!b) return false;
    if (a.column !== b.column || a.operator !== b.operator) return false;
    if (String(a.value ?? '') !== String(b.value ?? '')) return false;
    if (String(a.secondaryValue ?? '') !== String(b.secondaryValue ?? '')) return false;
    if (a.dateRangePreset !== b.dateRangePreset) return false;
    if (a.min !== b.min || a.max !== b.max) return false;
    const aVals = (a.values || []).map(String).sort().join(',');
    const bVals = (b.values || []).map(String).sort().join(',');
    if (aVals !== bVals) return false;
  }

  // 2. Compare cross-filters
  const crossA = stateA.crossFilters || [];
  const crossB = stateB.crossFilters || [];
  if (crossA.length !== crossB.length) return false;

  for (let i = 0; i < crossA.length; i++) {
    const a = crossA[i];
    const b = crossB.find(cf => cf.widgetId === a.widgetId && cf.column === a.column);
    if (!b) return false;
    if (a.operator !== b.operator || a.dateGranularity !== b.dateGranularity) return false;
    const aVals = (a.values || []).map(String).sort().join(',');
    const bVals = (b.values || []).map(String).sort().join(',');
    if (aVals !== bVals) return false;
  }

  // 3. Compare drill states
  const drillA = stateA.drillStates || {};
  const drillB = stateB.drillStates || {};
  const drillKeysA = Object.keys(drillA);
  const drillKeysB = Object.keys(drillB);

  // Filter out neutral/empty drill states
  const activeDrillA = drillKeysA.filter(k => drillA[k] && (drillA[k].currentLevelIndex > 0 || (drillA[k].path && drillA[k].path.length > 0)));
  const activeDrillB = drillKeysB.filter(k => drillB[k] && (drillB[k].currentLevelIndex > 0 || (drillB[k].path && drillB[k].path.length > 0)));

  if (activeDrillA.length !== activeDrillB.length) return false;

  for (const k of activeDrillA) {
    const dA = drillA[k];
    const dB = drillB[k];
    if (!dB) return false;
    if (dA.currentLevelIndex !== dB.currentLevelIndex) return false;
    if (Boolean(dA.isExpandedAll) !== Boolean(dB.isExpandedAll)) return false;
    if ((dA.path || []).length !== (dB.path || []).length) return false;

    for (let pIdx = 0; pIdx < (dA.path || []).length; pIdx++) {
      const pA = dA.path[pIdx];
      const pB = dB.path[pIdx];
      if (!pB || pA.column !== pB.column || String(pA.value) !== String(pB.value)) return false;
    }
  }

  // 4. Compare widget visibility
  const visA = stateA.widgetVisibility || {};
  const visB = stateB.widgetVisibility || {};
  const hiddenA = Object.entries(visA).filter(([_, v]) => v === false).map(([k]) => k).sort().join(',');
  const hiddenB = Object.entries(visB).filter(([_, v]) => v === false).map(([k]) => k).sort().join(',');
  if (hiddenA !== hiddenB) return false;

  return true;
}

/**
 * Creates a new DashboardSavedView entity.
 */
export function createSavedView(
  name: string,
  description: string | undefined,
  state: DashboardViewState,
  isDefault: boolean = false
): DashboardSavedView {
  const now = Date.now();
  return {
    id: `view-${now}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    description: description ? description.trim() : undefined,
    isDefault,
    createdAt: now,
    updatedAt: now,
    state
  };
}

/**
 * Duplicates a saved view with a new unique ID and copy name.
 */
export function duplicateSavedView(
  view: DashboardSavedView,
  newName?: string
): DashboardSavedView {
  const now = Date.now();
  return {
    ...view,
    id: `view-${now}-${Math.random().toString(36).substring(2, 7)}`,
    name: newName ? newName.trim() : `${view.name} (Copy)`,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    state: typeof structuredClone === 'function' ? structuredClone(view.state) : JSON.parse(JSON.stringify(view.state))
  };
}

/**
 * Serializes a saved view to a clean JSON string.
 */
export function serializeDashboardSnapshot(view: DashboardSavedView): string {
  return JSON.stringify(view, null, 2);
}

/**
 * Deserializes and validates a JSON string into a DashboardSavedView.
 */
export function deserializeDashboardSnapshot(json: string): DashboardSavedView | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.name || !parsed.state) {
      return null;
    }
    const validation = validateDashboardSnapshot(parsed.state);
    return {
      id: parsed.id || `view-${Date.now()}`,
      name: parsed.name,
      description: parsed.description,
      isDefault: Boolean(parsed.isDefault),
      createdAt: parsed.createdAt || Date.now(),
      updatedAt: parsed.updatedAt || Date.now(),
      state: validation.state
    };
  } catch (e) {
    console.error('Failed to parse dashboard snapshot JSON', e);
    return null;
  }
}
