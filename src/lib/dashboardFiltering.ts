import { DashboardFilter, Dataset } from '@/types';
import { parseFlexibleDate } from './dateIntelligence';

export function applyDashboardFilters(
  data: Record<string, any>[],
  filters: DashboardFilter[],
  dataset: Dataset | null
): Record<string, any>[] {
  if (!filters || filters.length === 0 || !data || data.length === 0) return data;

  return data.filter((row) => {
    // A row must pass ALL active filters (logical AND)
    return filters.every((filter) => {
      const rowVal = row[filter.column];
      
      // If column doesn't exist, we might want to gracefully ignore or evaluate to true
      // so it doesn't break everything, or evaluate to true since the filter can't apply
      if (rowVal === undefined && (!dataset || !dataset.headers.includes(filter.column))) {
        return true; 
      }

      const op = filter.operator || 'equals';
      
      // Handle Date Filters
      if (['before', 'after', 'between'].includes(op) || filter.dateRangePreset) {
        const rowDate = parseFlexibleDate(rowVal);
        if (!rowDate) return false;

        // Custom between logic
        if (op === 'between' && filter.min !== undefined && filter.max !== undefined) {
          const minDate = parseFlexibleDate(filter.min);
          const maxDate = parseFlexibleDate(filter.max);
          if (minDate && rowDate < minDate) return false;
          if (maxDate && rowDate > maxDate) return false;
          return true;
        }

        if (op === 'before' && filter.value !== undefined) {
          const valDate = parseFlexibleDate(filter.value);
          return valDate ? rowDate < valDate : false;
        }

        if (op === 'after' && filter.value !== undefined) {
          const valDate = parseFlexibleDate(filter.value);
          return valDate ? rowDate > valDate : false;
        }

        // Add additional preset date logic here if needed (this_month, this_year, etc.)
        // (Assuming standard operator usage for now)
      }

      // String/Categorical
      const strRowVal = String(rowVal || '').toLowerCase();
      const strFilterVal = String(filter.value || '').toLowerCase();

      // Numeric
      const numRowVal = typeof rowVal === 'number' ? rowVal : parseFloat(rowVal);
      const numFilterVal = typeof filter.value === 'number' ? filter.value : parseFloat(String(filter.value));

      switch (op) {
        case 'equals':
          if (filter.values && filter.values.length > 0) {
            return filter.values.includes(rowVal); // Multi-select case logic via 'equals' with values array
          }
          return rowVal == filter.value;
        case 'does_not_equal':
          return rowVal != filter.value;
        case 'contains':
          return strRowVal.includes(strFilterVal);
        case 'starts_with':
          return strRowVal.startsWith(strFilterVal);
        case 'ends_with':
          return strRowVal.endsWith(strFilterVal);
        case 'is_empty':
          return rowVal === null || rowVal === undefined || strRowVal === '';
        case 'is_not_empty':
          return rowVal !== null && rowVal !== undefined && strRowVal !== '';
        case 'greater_than':
          return !isNaN(numRowVal) && !isNaN(numFilterVal) && numRowVal > numFilterVal;
        case 'less_than':
          return !isNaN(numRowVal) && !isNaN(numFilterVal) && numRowVal < numFilterVal;
        case 'greater_than_or_equal':
          return !isNaN(numRowVal) && !isNaN(numFilterVal) && numRowVal >= numFilterVal;
        case 'less_than_or_equal':
          return !isNaN(numRowVal) && !isNaN(numFilterVal) && numRowVal <= numFilterVal;
        case 'between':
          if (!isNaN(numRowVal) && filter.min !== undefined && filter.max !== undefined) {
             const min = parseFloat(String(filter.min));
             const max = parseFloat(String(filter.max));
             return numRowVal >= min && numRowVal <= max;
          }
          return false;
        case 'in':
          return filter.values ? filter.values.includes(rowVal) : false;
        case 'not_in':
          return filter.values ? !filter.values.includes(rowVal) : true;
        default:
          return true; // Fallback
      }
    });
  });
}
