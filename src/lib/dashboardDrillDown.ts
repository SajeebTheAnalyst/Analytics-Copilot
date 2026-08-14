import { Dataset, WidgetConfig, DrillHierarchy, DrillLevel, DrillPathStep, WidgetDrillState, DateDrillGranularity } from '@/types';
import { isDateColumn, parseFlexibleDate, getPeriodStart } from '@/lib/dateIntelligence';

/**
 * Derives the active drill-down hierarchy for a given widget and dataset.
 * Supports:
 * 1. Automatic Date Intelligence Hierarchy (Year -> Quarter -> Month -> Day)
 * 2. Explicit or Inferred Categorical Hierarchy (e.g., Region -> Country -> City)
 */
export function getDrillHierarchy(widget: WidgetConfig, dataset: Dataset | null): DrillHierarchy | null {
  if (!dataset || widget.type === 'kpi') return null;

  const xAxis = widget.xAxisColumn;
  if (!xAxis) return null;

  // 1. Check Date Hierarchy
  const isDate = isDateColumn(dataset, xAxis) || Boolean(widget.dateAggregation);
  if (isDate) {
    const dateLevels: DrillLevel[] = [
      { id: 'date-year', name: 'Year', column: xAxis, isDate: true, dateGranularity: 'year' },
      { id: 'date-quarter', name: 'Quarter', column: xAxis, isDate: true, dateGranularity: 'quarter' },
      { id: 'date-month', name: 'Month', column: xAxis, isDate: true, dateGranularity: 'month' },
      { id: 'date-day', name: 'Day', column: xAxis, isDate: true, dateGranularity: 'day' }
    ];

    return {
      id: `date-hierarchy-${widget.id || xAxis}`,
      name: `${xAxis} (Date Hierarchy)`,
      type: 'date',
      levels: dateLevels
    };
  }

  // 2. Check Categorical Hierarchy configured explicitly on widget
  const configuredHierarchy = (widget.hierarchy || []).filter(c => c && dataset.headers.includes(c));
  const candidateCols: string[] = [];

  if (dataset.headers.includes(xAxis)) {
    candidateCols.push(xAxis);
  }

  for (const col of configuredHierarchy) {
    if (!candidateCols.includes(col)) {
      candidateCols.push(col);
    }
  }

  // Include matrix row hierarchy or breakdown column if available and not already included
  if (widget.matrixRowHierarchy && dataset.headers.includes(widget.matrixRowHierarchy) && !candidateCols.includes(widget.matrixRowHierarchy)) {
    candidateCols.push(widget.matrixRowHierarchy);
  }

  if (candidateCols.length > 1) {
    const catLevels: DrillLevel[] = candidateCols.map((col, idx) => ({
      id: `cat-lvl-${idx}-${col}`,
      name: col,
      column: col,
      isDate: false
    }));

    return {
      id: `cat-hierarchy-${widget.id || xAxis}`,
      name: `${candidateCols.join(' > ')}`,
      type: 'categorical',
      levels: catLevels
    };
  }

  // If only 1 column is configured, check if we can suggest natural sub-dimensions
  return null;
}

/**
 * Checks if a widget can drill down further from its current level index.
 */
export function canDrillDown(hierarchy: DrillHierarchy | null, currentLevelIndex: number): boolean {
  if (!hierarchy || !hierarchy.levels) return false;
  return currentLevelIndex < hierarchy.levels.length - 1;
}

/**
 * Checks if a widget can drill up from its current level index.
 */
export function canDrillUp(currentLevelIndex: number): boolean {
  return currentLevelIndex > 0;
}

/**
 * Returns the next drill level in the hierarchy, if available.
 */
export function getNextDrillLevel(hierarchy: DrillHierarchy, currentLevelIndex: number): DrillLevel | null {
  if (!hierarchy || !hierarchy.levels) return null;
  if (currentLevelIndex + 1 < hierarchy.levels.length) {
    return hierarchy.levels[currentLevelIndex + 1];
  }
  return null;
}

/**
 * Returns the previous drill level in the hierarchy, if available.
 */
export function getPreviousDrillLevel(hierarchy: DrillHierarchy, currentLevelIndex: number): DrillLevel | null {
  if (!hierarchy || !hierarchy.levels) return null;
  if (currentLevelIndex - 1 >= 0) {
    return hierarchy.levels[currentLevelIndex - 1];
  }
  return null;
}

/**
 * Determines the active dimension (column + granularity) for rendering the chart at the current drill level.
 */
export function getEffectiveDrillDimension(
  widget: WidgetConfig,
  hierarchy: DrillHierarchy | null,
  drillState?: WidgetDrillState | null
): { column: string; isDate: boolean; dateGranularity?: DateDrillGranularity; levelName: string; levelIndex: number } {
  const defaultCol = widget.xAxisColumn || '';
  if (!hierarchy || !drillState || drillState.currentLevelIndex === 0 || !hierarchy.levels[drillState.currentLevelIndex]) {
    const isDate = hierarchy?.type === 'date';
    return {
      column: hierarchy?.levels[0]?.column || defaultCol,
      isDate,
      dateGranularity: isDate ? (hierarchy?.levels[0]?.dateGranularity || 'year') : undefined,
      levelName: hierarchy?.levels[0]?.name || defaultCol,
      levelIndex: 0
    };
  }

  const currentLevel = hierarchy.levels[drillState.currentLevelIndex];
  return {
    column: currentLevel.column,
    isDate: Boolean(currentLevel.isDate),
    dateGranularity: currentLevel.dateGranularity,
    levelName: currentLevel.name,
    levelIndex: drillState.currentLevelIndex
  };
}

/**
 * Deterministically filters a dataset's rows according to the cumulative drill-down path.
 * Never mutates original data.
 */
export function applyDrillDown(
  rows: Record<string, any>[],
  path: DrillPathStep[],
  dataset: Dataset | null
): Record<string, any>[] {
  if (!rows || rows.length === 0 || !path || path.length === 0) {
    return rows;
  }

  let currentRows = rows;

  for (const step of path) {
    if (step.isDate) {
      currentRows = currentRows.filter(row => {
        const rawVal = row[step.column];
        if (rawVal === null || rawVal === undefined || rawVal === '') return false;
        const date = parseFlexibleDate(rawVal);
        if (!date) return false;

        const targetVal = step.value;

        // If step value is timestamp or number
        if (typeof targetVal === 'number') {
          const targetDate = new Date(targetVal);
          if (isNaN(targetDate.getTime())) return false;

          if (step.dateGranularity === 'year') {
            return date.getFullYear() === targetDate.getFullYear();
          }
          if (step.dateGranularity === 'quarter') {
            return (
              date.getFullYear() === targetDate.getFullYear() &&
              Math.floor(date.getMonth() / 3) === Math.floor(targetDate.getMonth() / 3)
            );
          }
          if (step.dateGranularity === 'month') {
            return (
              date.getFullYear() === targetDate.getFullYear() &&
              date.getMonth() === targetDate.getMonth()
            );
          }
          if (step.dateGranularity === 'day') {
            return (
              date.getFullYear() === targetDate.getFullYear() &&
              date.getMonth() === targetDate.getMonth() &&
              date.getDate() === targetDate.getDate()
            );
          }
        }

        // Match by formatted string representation or parsed components
        const strVal = String(step.value).trim().toLowerCase();
        const strLabel = String(step.label || '').trim().toLowerCase();

        if (step.dateGranularity === 'year') {
          const yr = date.getFullYear();
          return String(yr) === strVal || strLabel.includes(String(yr));
        }

        if (step.dateGranularity === 'quarter') {
          const q = Math.floor(date.getMonth() / 3) + 1;
          const yr = date.getFullYear();
          return (
            strVal.includes(`q${q}`) ||
            strLabel.includes(`q${q}`) ||
            (strVal.includes(String(yr)) && strVal.includes(String(q)))
          );
        }

        if (step.dateGranularity === 'month') {
          const mShort = date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
          const mLong = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
          return strVal.includes(mShort) || strVal.includes(mLong) || strLabel.includes(mShort);
        }

        if (step.dateGranularity === 'day') {
          const parsedStepDate = typeof step.value === 'string' || typeof step.value === 'number' 
            ? new Date(step.value) 
            : null;
          if (parsedStepDate && !isNaN(parsedStepDate.getTime())) {
            return getPeriodStart(date, 'day').getTime() === getPeriodStart(parsedStepDate, 'day').getTime();
          }
          return date.toLocaleDateString('en-US').toLowerCase() === strVal;
        }

        return true;
      });
    } else {
      // Categorical drill down filter
      currentRows = currentRows.filter(row => {
        const rowVal = row[step.column];
        const matchVal = step.value;
        if (rowVal === null || rowVal === undefined) {
          return matchVal === '(Blank)' || matchVal === null || matchVal === undefined;
        }
        return String(rowVal).trim().toLowerCase() === String(matchVal).trim().toLowerCase();
      });
    }
  }

  return currentRows;
}

/**
 * Builds a new drill path by appending a selected step.
 */
export function buildDrillPath(
  currentPath: DrillPathStep[],
  hierarchy: DrillHierarchy,
  currentLevelIndex: number,
  selectedValue: string | number | boolean,
  selectedLabel?: string,
  rawDateOrTimestamp?: number | Date | null
): DrillPathStep[] {
  if (!hierarchy || !hierarchy.levels || currentLevelIndex >= hierarchy.levels.length) {
    return currentPath;
  }

  const level = hierarchy.levels[currentLevelIndex];
  let finalValue: string | number | boolean = selectedValue;
  if (typeof rawDateOrTimestamp === 'number') {
    finalValue = rawDateOrTimestamp;
  } else if (rawDateOrTimestamp instanceof Date) {
    finalValue = rawDateOrTimestamp.getTime();
  }

  const newStep: DrillPathStep = {
    levelIndex: currentLevelIndex,
    column: level.column,
    value: finalValue,
    label: selectedLabel || String(selectedValue),
    isDate: Boolean(level.isDate),
    dateGranularity: level.dateGranularity
  };

  return [...currentPath, newStep];
}

/**
 * Formats navigation breadcrumbs for the drill-down UI.
 */
export function getDrillBreadcrumbs(
  hierarchyOrPath: DrillHierarchy | DrillPathStep[] | null,
  drillStateOrHierarchy?: WidgetDrillState | DrillHierarchy | null,
  rootLabel: string = 'All'
): { levelIndex: number; label: string; isCurrent: boolean }[] {
  let hierarchy: DrillHierarchy | null = null;
  let path: DrillPathStep[] = [];

  if (Array.isArray(hierarchyOrPath)) {
    path = hierarchyOrPath;
    hierarchy = (drillStateOrHierarchy as DrillHierarchy) || null;
  } else {
    hierarchy = hierarchyOrPath;
    if (drillStateOrHierarchy && 'path' in (drillStateOrHierarchy as object)) {
      path = (drillStateOrHierarchy as WidgetDrillState).path || [];
    }
  }

  const crumbs = [
    {
      levelIndex: 0,
      label: hierarchy?.levels[0]?.name ? `${rootLabel} (${hierarchy.levels[0].name})` : rootLabel,
      isCurrent: path.length === 0
    }
  ];

  path.forEach((step, idx) => {
    const nextLevelIndex = idx + 1;
    const nextLevelName = hierarchy?.levels[nextLevelIndex]?.name;
    const label = nextLevelName ? `${step.label} → ${nextLevelName}` : step.label;

    crumbs.push({
      levelIndex: nextLevelIndex,
      label,
      isCurrent: idx === path.length - 1
    });
  });

  return crumbs;
}
