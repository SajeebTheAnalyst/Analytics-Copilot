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

interface CellSemanticAnalysis {
  type: 'date' | 'dateTime' | 'time' | 'month_year' | 'year' | 'quarter' | 'month' | 'day' | 'text';
  granularity: 'Year' | 'Quarter' | 'Month' | 'Day' | 'Full Date' | 'DateTime' | 'Time' | null;
}

export function detectValueSemantic(val: any): CellSemanticAnalysis {
  if (val === null || val === undefined) {
    return { type: 'text', granularity: null };
  }
  if (val instanceof Date) {
    return { type: 'date', granularity: 'Full Date' };
  }
  const str = String(val).trim();
  if (!str) {
    return { type: 'text', granularity: null };
  }

  // 1. Time formats:
  // e.g., 14:35, 14:35:20, 02:35 PM, 02:35:20 PM
  const simpleTimeRegex = /^([0-2]?\d):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)?$/i;
  if (simpleTimeRegex.test(str)) {
    const match = str.match(simpleTimeRegex);
    if (match) {
      const hh = parseInt(match[1], 10);
      const mm = parseInt(match[2], 10);
      const ampm = match[4];
      if (hh >= 0 && (ampm ? hh <= 12 : hh <= 23) && mm >= 0 && mm <= 59) {
        return { type: 'time', granularity: 'Time' };
      }
    }
  }

  // 2. Year formats:
  // e.g. 2020, 2021, 2022
  const yearRegex = /^(\d{4})$/;
  if (yearRegex.test(str)) {
    const yr = parseInt(str, 10);
    if (yr >= 1900 && yr <= 2100) {
      return { type: 'year', granularity: 'Year' };
    }
  }

  // 3. Month-Year formats:
  // e.g., 2020-03, 2020/03, March 2020, Mar 2020
  const monthYearNumRegex = /^(\d{4})[\/\-](\d{2})$/;
  if (monthYearNumRegex.test(str)) {
    const match = str.match(monthYearNumRegex);
    if (match) {
      const yr = parseInt(match[1], 10);
      const mo = parseInt(match[2], 10);
      if (yr >= 1900 && yr <= 2100 && mo >= 1 && mo <= 12) {
        return { type: 'month_year', granularity: 'Month' };
      }
    }
  }

  const monthWords = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const monthYearWordRegex = new RegExp(`^(${monthWords})\\s+(\\d{4})$`, 'i');
  if (monthYearWordRegex.test(str)) {
    return { type: 'month_year', granularity: 'Month' };
  }

  // 4. Quarter formats:
  // e.g., Q1, Q1 2020, 2020 Q1
  const quarterRegex = /^(Q[1-4]|q[1-4])(?:\s+(\d{4}))?$/i;
  const quarterRegex2 = /^(\d{4})\s*(Q[1-4]|q[1-4])$/i;
  if (quarterRegex.test(str) || quarterRegex2.test(str)) {
    return { type: 'quarter', granularity: 'Quarter' };
  }

  // 5. Month only formats:
  // e.g. March, Apr
  const monthOnlyRegex = new RegExp(`^(${monthWords})$`, 'i');
  if (monthOnlyRegex.test(str)) {
    return { type: 'month', granularity: 'Month' };
  }

  // 6. DateTime formats:
  // e.g., 2026-08-16 14:35:20, Apr 12 2020 02:35 PM
  const hasTimeIndicator = /\b(?:[0-2]?\d):(?:[0-5]\d)(?::(?:[0-5]\d))?\s*(?:AM|PM|am|pm)?\b/i.test(str);
  
  // Clean off the time part to see if what remains is a full date
  const cleanDateStr = str.replace(/\b(?:[0-2]?\d):(?:[0-5]\d)(?::(?:[0-5]\d))?\s*(?:AM|PM|am|pm)?\b/i, '').trim().replace(/,\s*$/, '').trim();

  const numericDateRegex = /^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})$/;
  const wordDateRegex1 = new RegExp(`^(${monthWords})\\s+(\\d{1,2})\\s*,?\\s*(\\d{4})$`, 'i');
  const wordDateRegex2 = new RegExp(`^(\\d{1,2})\\s+(${monthWords})\\s+(\\d{4})$`, 'i');

  const isFullDateString = (s: string): boolean => {
    if (numericDateRegex.test(s)) {
      const match = s.match(numericDateRegex);
      if (match) {
        const p1 = parseInt(match[1], 10);
        const p2 = parseInt(match[2], 10);
        const p3 = parseInt(match[3], 10);
        const hasYear = (p1 >= 1900 && p1 <= 2100) || (p3 >= 1900 && p3 <= 2100);
        const validMonth = (p1 <= 12 && p1 >= 1) || (p2 <= 12 && p2 >= 1);
        return hasYear && validMonth;
      }
    }
    return wordDateRegex1.test(s) || wordDateRegex2.test(s);
  };

  if (isFullDateString(str)) {
    return { type: 'date', granularity: 'Full Date' };
  }

  if (hasTimeIndicator && isFullDateString(cleanDateStr)) {
    return { type: 'dateTime', granularity: 'DateTime' };
  }

  // 7. Day of month format (strictly numeric 1 to 31):
  const dayRegex = /^([1-9]|0[1-9]|[12]\d|3[01])$/;
  if (dayRegex.test(str)) {
    return { type: 'day', granularity: 'Day' };
  }

  return { type: 'text', granularity: null };
}

export interface ColumnTemporalSemantic {
  type: 'date' | 'dateTime' | 'time' | 'month_year' | 'year' | 'quarter' | 'month' | 'day' | 'text' | 'numeric' | 'categorical' | 'boolean' | 'unknown';
  granularity: 'Year' | 'Quarter' | 'Month' | 'Day' | 'Full Date' | 'DateTime' | 'Time' | null;
}

export function detectColumnSemantic(
  data: Record<string, any>[],
  column: string,
  existingType: string
): ColumnTemporalSemantic {
  if (!data || data.length === 0) {
    return { type: 'unknown', granularity: null };
  }

  let validCount = 0;
  const typeCounts: Record<string, number> = {
    date: 0,
    dateTime: 0,
    time: 0,
    month_year: 0,
    year: 0,
    quarter: 0,
    month: 0,
    day: 0,
    text: 0
  };

  const sampleSize = Math.min(data.length, 100);
  for (let i = 0; i < sampleSize; i++) {
    const val = data[i][column];
    if (val === null || val === undefined || val === '') continue;

    validCount++;
    const res = detectValueSemantic(val);
    typeCounts[res.type] = (typeCounts[res.type] || 0) + 1;
  }

  if (validCount === 0) {
    return { type: 'unknown', granularity: null };
  }

  let majorityType: string = 'text';
  let maxCount = 0;
  for (const t of Object.keys(typeCounts)) {
    if (typeCounts[t] > maxCount) {
      maxCount = typeCounts[t];
      majorityType = t;
    }
  }

  const ratio = maxCount / validCount;

  // Year detection with context:
  if (majorityType === 'year') {
    const colLower = column.toLowerCase();
    const hasYearKeyword = colLower.includes('year') || colLower.includes('yr') || colLower.includes('date') || colLower.includes('time') || colLower.includes('period') || colLower.includes('cal');
    if (ratio > 0.8 && hasYearKeyword) {
      return { type: 'year', granularity: 'Year' };
    } else {
      return { type: 'numeric', granularity: null };
    }
  }

  // Day detection with context:
  if (majorityType === 'day') {
    const colLower = column.toLowerCase();
    const hasDayKeyword = colLower.includes('day') || colLower.includes('date') || colLower.includes('time') || colLower.includes('dom');
    if (ratio > 0.8 && hasDayKeyword) {
      return { type: 'day', granularity: 'Day' };
    } else {
      return { type: 'numeric', granularity: null };
    }
  }

  if (majorityType === 'quarter' && ratio > 0.5) {
    return { type: 'quarter', granularity: 'Quarter' };
  }

  if (majorityType === 'month' && ratio > 0.5) {
    return { type: 'month', granularity: 'Month' };
  }

  if (majorityType === 'month_year' && ratio > 0.5) {
    return { type: 'month_year', granularity: 'Month' };
  }

  if (majorityType === 'dateTime' && ratio > 0.5) {
    return { type: 'dateTime', granularity: 'DateTime' };
  }

  if (majorityType === 'time' && ratio > 0.5) {
    return { type: 'time', granularity: 'Time' };
  }

  if (majorityType === 'date' && ratio > 0.5) {
    return { type: 'date', granularity: 'Full Date' };
  }

  if (existingType === 'numeric') {
    return { type: 'numeric', granularity: null };
  }
  if (existingType === 'boolean') {
    return { type: 'boolean', granularity: null };
  }
  if (existingType === 'categorical') {
    return { type: 'categorical', granularity: null };
  }

  return { type: 'text', granularity: null };
}
