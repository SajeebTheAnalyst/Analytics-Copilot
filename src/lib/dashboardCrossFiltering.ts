import { DashboardCrossFilter, Dataset } from '@/types';
import { parseFlexibleDate, getPeriodStart, formatPeriodLabel, DateGranularity } from './dateIntelligence';

/**
 * Deterministically applies active visual cross-filters to an array of rows.
 * Immutably derives a new filtered array using logical AND across all cross-filters.
 */
export function applyCrossFilters(
  data: Record<string, any>[],
  crossFilters: DashboardCrossFilter[],
  dataset: Dataset | null
): Record<string, any>[] {
  if (!crossFilters || crossFilters.length === 0 || !data || data.length === 0) {
    return data;
  }

  return data.filter((row) => {
    // Row must pass ALL active cross-filters (Logical AND)
    return crossFilters.every((filter) => {
      const rowVal = row[filter.column];

      // Missing column safety: if column does not exist, do not break
      if (rowVal === undefined && (!dataset || !dataset.headers.includes(filter.column))) {
        return true;
      }

      if (filter.values === undefined || filter.values.length === 0) {
        return true;
      }

      // 1. Date Intelligence Evaluation
      if (filter.operator === 'date_period' || filter.dateGranularity) {
        const rowDate = parseFlexibleDate(rowVal);
        if (!rowDate) return false;

        const rawGranularity = filter.dateGranularity || 'month';
        const granularity: Exclude<DateGranularity, 'auto'> = rawGranularity === 'auto' ? 'month' : rawGranularity;
        const periodStart = getPeriodStart(rowDate, granularity);
        const periodLabel = formatPeriodLabel(periodStart, granularity, true).trim().toLowerCase();
        const shortPeriodLabel = formatPeriodLabel(periodStart, granularity, false).trim().toLowerCase();

        const filterValsStr = filter.values.map(v => String(v ?? '').trim().toLowerCase());

        // Match against full period label (e.g., "Jan 2025"), short period label ("Jan"), or timestamp/raw string
        if (filterValsStr.includes(periodLabel) || filterValsStr.includes(shortPeriodLabel)) {
          return true;
        }

        const rawRowStr = String(rowVal).trim().toLowerCase();
        if (filterValsStr.includes(rawRowStr)) {
          return true;
        }

        return false;
      }

      // Check if rowVal is a date and filter values might be date period labels
      const parsedRowDate = parseFlexibleDate(rowVal);
      if (parsedRowDate) {
        const granularities: Array<Exclude<DateGranularity, 'auto'>> = ['month', 'quarter', 'year', 'day', 'week'];
        for (const gran of granularities) {
          const pStart = getPeriodStart(parsedRowDate, gran);
          const pLabel = formatPeriodLabel(pStart, gran, true).trim().toLowerCase();
          const pShort = formatPeriodLabel(pStart, gran, false).trim().toLowerCase();

          for (const fVal of filter.values) {
            const fValLower = String(fVal ?? '').trim().toLowerCase();
            if (fValLower === pLabel || fValLower === pShort) {
              return true;
            }
          }
        }
      }

      // 2. Standard Categorical & String Dimension Matching
      const strRowVal = rowVal === null || rowVal === undefined ? '' : String(rowVal).trim().toLowerCase();

      if (filter.operator === 'in') {
        const filterSet = new Set(filter.values.map(v => String(v ?? '').trim().toLowerCase()));
        return filterSet.has(strRowVal);
      }

      // Default 'equals'
      return filter.values.some(v => {
        if (v === null || v === undefined) {
          return rowVal === null || rowVal === undefined;
        }
        if (typeof v === 'number' && typeof rowVal === 'number') {
          return v === rowVal;
        }
        const strV = String(v).trim().toLowerCase();
        return strRowVal === strV || String(rowVal) === String(v);
      });
    });
  });
}
