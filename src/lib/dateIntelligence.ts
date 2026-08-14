import { Dataset } from '@/types';

export type DateGranularity = 'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export function parseFlexibleDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  // Try direct Date.parse
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) {
    const yr = direct.getFullYear();
    if (yr >= 1900 && yr <= 2100) return direct;
  }

  // Check common formats with regex separators (/ . -)
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);

    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      // YYYY/MM/DD or YYYY-MM-DD
      if (parts[0].length === 4) {
        const d = new Date(p1, p2 - 1, p3);
        if (!isNaN(d.getTime())) return d;
      }
      // DD/MM/YYYY vs MM/DD/YYYY
      if (p1 > 12 && p2 <= 12 && p3 >= 1000) {
        // DD/MM/YYYY
        const d = new Date(p3, p2 - 1, p1);
        if (!isNaN(d.getTime())) return d;
      }
      if (p2 > 12 && p1 <= 12 && p3 >= 1000) {
        // MM/DD/YYYY
        const d = new Date(p3, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      }
      // Default fallback
      const yr = p3 < 100 ? p3 + 2000 : p3;
      if (p1 <= 12) {
        const d = new Date(yr, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      } else {
        const d = new Date(yr, p2 - 1, p1);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  return null;
}

export function isDateColumn(dataset: Dataset, column: string): boolean {
  if (!dataset || !column) return false;
  if (dataset.columnTypes?.[column] === 'date') return true;
  const sample = (dataset.fullData || dataset.data || []).slice(0, 20);
  if (sample.length === 0) return false;
  let parsedCount = 0;
  for (const row of sample) {
    const val = row[column];
    if (val !== null && val !== undefined && val !== '') {
      if (parseFlexibleDate(val) !== null) {
        parsedCount++;
      }
    }
  }
  return parsedCount >= Math.min(3, sample.length);
}

export function getPeriodStart(d: Date, lvl: Exclude<DateGranularity, 'auto'>): Date {
  const date = new Date(d);
  if (lvl === 'year') {
    return new Date(date.getFullYear(), 0, 1);
  }
  if (lvl === 'quarter') {
    const qStartMonth = Math.floor(date.getMonth() / 3) * 3;
    return new Date(date.getFullYear(), qStartMonth, 1);
  }
  if (lvl === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  if (lvl === 'week') {
    const day = date.getDay();
    const diff = date.getDate() - day; // Sunday start
    return new Date(date.getFullYear(), date.getMonth(), diff);
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatPeriodLabel(date: Date, lvl: Exclude<DateGranularity, 'auto'>, multipleYears: boolean): string {
  if (lvl === 'year') {
    return String(date.getFullYear());
  }
  if (lvl === 'quarter') {
    const q = Math.floor(date.getMonth() / 3) + 1;
    return multipleYears ? `Q${q} ${date.getFullYear()}` : `Q${q}`;
  }
  if (lvl === 'month') {
    return multipleYears
      ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : date.toLocaleDateString('en-US', { month: 'short' });
  }
  if (lvl === 'week') {
    const sundayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(multipleYears ? { year: 'numeric' } : {}) });
    return `Wk ${sundayStr}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(multipleYears ? { year: 'numeric' } : {}) });
}

export function determineAutoGranularity(validDates: Date[]): Exclude<DateGranularity, 'auto'> {
  if (validDates.length === 0) return 'month';
  const minTime = Math.min(...validDates.map(d => d.getTime()));
  const maxTime = Math.max(...validDates.map(d => d.getTime()));
  const diffDays = (maxTime - minTime) / (24 * 60 * 60 * 1000);

  if (diffDays > 3 * 365) return 'year';
  if (diffDays > 90) return 'month';
  if (diffDays > 14) return 'week';
  return 'day';
}
