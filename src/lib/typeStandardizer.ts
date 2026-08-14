import { ColumnType } from '@/types';

export type ExtendedType =
  | 'Text'
  | 'Numeric'
  | 'Integer'
  | 'Decimal'
  | 'Date'
  | 'DateTime'
  | 'Time'
  | 'Boolean'
  | 'Categorical';

export type DateFormatOption =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'MMM YYYY'
  | 'YYYY'
  | 'DD MMM YYYY, HH:mm';

export type NumberFormatType = 'number' | 'decimal' | 'currency' | 'percentage';

export interface ColumnFormatConfig {
  dateFormat?: DateFormatOption;
  numberFormat?: NumberFormatType;
  currencySymbol?: string;
  decimals?: number;
  useThousandsSeparator?: boolean;
}

export interface SampleConversion {
  rowId: string;
  raw: any;
  converted: any;
  status: 'valid' | 'invalid' | 'blank';
  formattedDisplay?: string;
}

export interface ColumnTypeProfile {
  header: string;
  currentType: ColumnType | string;
  detectedType: ExtendedType;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  blankCount: number;
  isNumericStoredAsText: boolean;
  sampleBeforeAfter: SampleConversion[];
  dateFormatsDetected?: string[];
}

/**
 * Cleanly tests if a value is blank / null / undefined.
 */
export function isBlankValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  return false;
}

/**
 * Parses numeric value from various text formats ($2,500, 1,500.50, 30%, -100).
 */
export function parseFlexibleNumeric(val: any): { numeric: number | null; isPercentage: boolean } {
  if (isBlankValue(val)) return { numeric: null, isPercentage: false };
  if (typeof val === 'number') {
    return { numeric: isNaN(val) ? null : val, isPercentage: false };
  }

  const str = String(val).trim();
  const isPct = str.endsWith('%');
  
  // Strip currency symbols ($ € £ ¥), commas, spaces, trailing %
  let cleaned = str.replace(/[$€£¥,]/g, '').trim();
  if (isPct) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Handle accounting format e.g. (1,500) -> -1500
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1).trim();
  }

  const num = Number(cleaned);
  if (isNaN(num) || cleaned === '') {
    return { numeric: null, isPercentage: false };
  }

  // If percentage, e.g. 30% -> 0.3
  const finalVal = isPct ? num / 100 : num;
  return { numeric: finalVal, isPercentage: isPct };
}

/**
 * Parses a date or datetime string reliably into JS Date or ISO string without ambiguous Date.parse.
 */
export function parseFlexibleDateTime(val: any): { date: Date | null; isDateTime: boolean; isTimeOnly: boolean } {
  if (isBlankValue(val)) return { date: null, isDateTime: false, isTimeOnly: false };
  if (val instanceof Date) {
    return { date: isNaN(val.getTime()) ? null : val, isDateTime: true, isTimeOnly: false };
  }

  const str = String(val).trim();
  if (!str) return { date: null, isDateTime: false, isTimeOnly: false };

  // Check Time-only pattern e.g. "14:30:00", "2:30 PM", "09:15"
  const timeOnlyMatch = str.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM)?$/i);
  if (timeOnlyMatch) {
    let hours = parseInt(timeOnlyMatch[1], 10);
    const minutes = parseInt(timeOnlyMatch[2], 10);
    const seconds = timeOnlyMatch[3] ? parseInt(timeOnlyMatch[3], 10) : 0;
    const ampm = timeOnlyMatch[4] ? timeOnlyMatch[4].toUpperCase() : null;

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const dummyDate = new Date(1970, 0, 1, hours, minutes, seconds);
    return { date: dummyDate, isDateTime: false, isTimeOnly: true };
  }

  // Check DateTime with ISO format e.g. "2020-12-12T14:30:00Z" or "2020-12-12 14:30:00"
  const isoMatch = str.match(/^(\d{4})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])(?:[\sT]([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?)?/);
  if (isoMatch) {
    const yr = parseInt(isoMatch[1], 10);
    const mo = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hr = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const sec = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;

    const d = new Date(yr, mo, day, hr, min, sec);
    if (!isNaN(d.getTime())) {
      const hasTime = isoMatch[4] !== undefined && (hr !== 0 || min !== 0 || sec !== 0);
      return { date: d, isDateTime: hasTime, isTimeOnly: false };
    }
  }

  // Check US or UK date formats e.g. "12/10/2020", "14-10-2020", "12/12/2020 GMT+6:00"
  // Remove GMT/timezone strings if present
  const cleanStr = str.replace(/GMT[+-]\d{1,2}(?::\d{2})?|\([^\)]+\)/gi, '').trim();

  const parts = cleanStr.split(/[\/\-\.\s]+/);
  if (parts.length >= 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);

    let hr = 0, min = 0, sec = 0;
    if (parts.length >= 4 && parts[3].includes(':')) {
      const tParts = parts[3].split(':');
      hr = parseInt(tParts[0], 10) || 0;
      min = parseInt(tParts[1], 10) || 0;
      sec = parseInt(tParts[2], 10) || 0;
      if (parts[4] && parts[4].toUpperCase() === 'PM' && hr < 12) hr += 12;
      if (parts[4] && parts[4].toUpperCase() === 'AM' && hr === 12) hr = 0;
    }

    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      // YYYY/MM/DD
      if (parts[0].length === 4) {
        const d = new Date(p1, p2 - 1, p3, hr, min, sec);
        if (!isNaN(d.getTime())) {
          return { date: d, isDateTime: hr !== 0 || min !== 0 || sec !== 0, isTimeOnly: false };
        }
      }
      // DD/MM/YYYY vs MM/DD/YYYY
      if (p1 > 12 && p2 <= 12 && p3 >= 1000) {
        // DD/MM/YYYY
        const d = new Date(p3, p2 - 1, p1, hr, min, sec);
        if (!isNaN(d.getTime())) {
          return { date: d, isDateTime: hr !== 0 || min !== 0 || sec !== 0, isTimeOnly: false };
        }
      }
      if (p2 > 12 && p1 <= 12 && p3 >= 1000) {
        // MM/DD/YYYY
        const d = new Date(p3, p1 - 1, p2, hr, min, sec);
        if (!isNaN(d.getTime())) {
          return { date: d, isDateTime: hr !== 0 || min !== 0 || sec !== 0, isTimeOnly: false };
        }
      }
      // Fallback year at end
      if (p3 >= 1000 || p3 < 100) {
        const yr = p3 < 100 ? p3 + 2000 : p3;
        const mo = p1 <= 12 ? p1 - 1 : p2 - 1;
        const dy = p1 <= 12 ? p2 : p1;
        const d = new Date(yr, mo, dy, hr, min, sec);
        if (!isNaN(d.getTime())) {
          return { date: d, isDateTime: hr !== 0 || min !== 0 || sec !== 0, isTimeOnly: false };
        }
      }
    }
  }

  // Named month match e.g. "12 April 2020", "April 12, 2020"
  const directDate = new Date(cleanStr);
  if (!isNaN(directDate.getTime())) {
    const yr = directDate.getFullYear();
    if (yr >= 1900 && yr <= 2100) {
      const hasTime = directDate.getHours() !== 0 || directDate.getMinutes() !== 0 || directDate.getSeconds() !== 0;
      return { date: directDate, isDateTime: hasTime, isTimeOnly: false };
    }
  }

  return { date: null, isDateTime: false, isTimeOnly: false };
}

/**
 * Converts value to target type. Returns converted value or null if invalid.
 */
export function convertValueToType(val: any, targetType: ExtendedType | ColumnType): { value: any; isValid: boolean } {
  if (isBlankValue(val)) {
    return { value: null, isValid: true };
  }

  const typeUpper = String(targetType).toLowerCase();

  if (typeUpper === 'numeric' || typeUpper === 'decimal' || typeUpper === 'integer') {
    const { numeric } = parseFlexibleNumeric(val);
    if (numeric === null) {
      return { value: val, isValid: false };
    }
    if (typeUpper === 'integer') {
      return { value: Math.round(numeric), isValid: true };
    }
    return { value: numeric, isValid: true };
  }

  if (typeUpper === 'date' || typeUpper === 'datetime') {
    const { date, isDateTime } = parseFlexibleDateTime(val);
    if (!date) {
      return { value: val, isValid: false };
    }
    if (typeUpper === 'date') {
      const yr = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const dy = String(date.getDate()).padStart(2, '0');
      return { value: `${yr}-${mo}-${dy}`, isValid: true };
    }
    // DateTime
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const dy = String(date.getDate()).padStart(2, '0');
    const hr = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    return { value: `${yr}-${mo}-${dy} ${hr}:${min}:${sec}`, isValid: true };
  }

  if (typeUpper === 'time') {
    const { date, isTimeOnly } = parseFlexibleDateTime(val);
    if (!date) return { value: val, isValid: false };
    const hr = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    return { value: `${hr}:${min}:${sec}`, isValid: true };
  }

  if (typeUpper === 'boolean') {
    const s = String(val).trim().toLowerCase();
    if (['true', 'yes', '1', 'y', 't'].includes(s)) return { value: true, isValid: true };
    if (['false', 'no', '0', 'n', 'f'].includes(s)) return { value: false, isValid: true };
    return { value: val, isValid: false };
  }

  // Text or Categorical
  return { value: String(val), isValid: true };
}

/**
 * Analyzes a column across dataset rows and profiles type match, errors, and text-stored numbers.
 */
export function profileColumnType(
  data: Record<string, any>[],
  header: string,
  currentType: ColumnType | string
): ColumnTypeProfile {
  let totalRows = data.length;
  let blankCount = 0;

  let numericCount = 0;
  let dateCount = 0;
  let dateTimeCount = 0;
  let timeCount = 0;
  let booleanCount = 0;
  let textCount = 0;
  let numericTextCount = 0; // Strings with $, %, commas that parse to number

  const samples: SampleConversion[] = [];

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    const rawVal = row[header];
    const rowId = row._rowId || `row-${idx}`;

    if (isBlankValue(rawVal)) {
      blankCount++;
      if (samples.length < 20) {
        samples.push({ rowId, raw: rawVal, converted: null, status: 'blank' });
      }
      continue;
    }

    // Check numeric
    const { numeric, isPercentage } = parseFlexibleNumeric(rawVal);
    if (numeric !== null) {
      numericCount++;
      if (typeof rawVal === 'string' && (rawVal.includes('$') || rawVal.includes(',') || isPercentage || rawVal.includes('€') || rawVal.includes('£'))) {
        numericTextCount++;
      }
    }

    // Check Date/Time
    const { date, isDateTime, isTimeOnly } = parseFlexibleDateTime(rawVal);
    if (date !== null) {
      if (isTimeOnly) timeCount++;
      else if (isDateTime) dateTimeCount++;
      else dateCount++;
    }

    // Check Boolean
    const strVal = String(rawVal).trim().toLowerCase();
    if (['true', 'false', 'yes', 'no', '1', '0'].includes(strVal)) {
      booleanCount++;
    }

    textCount++;

    if (samples.length < 20) {
      samples.push({ rowId, raw: rawVal, converted: rawVal, status: 'valid' });
    }
  }

  const nonBlank = totalRows - blankCount;

  let detectedType: ExtendedType = 'Text';
  let isNumericStoredAsText = false;

  if (nonBlank > 0) {
    if (numericCount / nonBlank >= 0.8) {
      detectedType = 'Numeric';
      if (numericTextCount / nonBlank >= 0.3 || (typeof data[0]?.[header] === 'string' && numericCount > 0)) {
        isNumericStoredAsText = true;
      }
    } else if (dateTimeCount / nonBlank >= 0.7) {
      detectedType = 'DateTime';
    } else if (dateCount / nonBlank >= 0.7) {
      detectedType = 'Date';
    } else if (timeCount / nonBlank >= 0.7) {
      detectedType = 'Time';
    } else if (booleanCount / nonBlank >= 0.9) {
      detectedType = 'Boolean';
    } else if (textCount / nonBlank >= 0.8) {
      // Check categorical
      const uniqueVals = new Set(data.map(r => r[header]).filter(v => !isBlankValue(v)));
      if (uniqueVals.size <= Math.min(20, nonBlank * 0.3)) {
        detectedType = 'Categorical';
      } else {
        detectedType = 'Text';
      }
    }
  }

  // Pre-calculate conversion stats for detected type vs current type
  let validCount = 0;
  let invalidCount = 0;

  for (let idx = 0; idx < samples.length; idx++) {
    const s = samples[idx];
    if (s.status === 'blank') continue;

    const { value, isValid } = convertValueToType(s.raw, detectedType);
    s.converted = value;
    s.status = isValid ? 'valid' : 'invalid';

    if (isValid) validCount++;
    else invalidCount++;
  }

  // Re-tally exact valid/invalid for entire dataset
  let fullValid = 0;
  let fullInvalid = 0;
  data.forEach(r => {
    const v = r[header];
    if (isBlankValue(v)) return;
    const { isValid } = convertValueToType(v, detectedType);
    if (isValid) fullValid++;
    else fullInvalid++;
  });

  return {
    header,
    currentType,
    detectedType,
    totalRows,
    validCount: fullValid,
    invalidCount: fullInvalid,
    blankCount,
    isNumericStoredAsText,
    sampleBeforeAfter: samples,
  };
}

/**
 * Format a stored primitive cell value for screen presentation based on ColumnFormatConfig.
 */
export function formatColumnValue(
  val: any,
  colType: ColumnType | string,
  config?: ColumnFormatConfig
): string {
  if (isBlankValue(val)) return '—';
  if (!config) return String(val);

  const colTypeLower = String(colType).toLowerCase();

  // Handle Numeric / Decimal / Currency / Percentage formatting
  if (colTypeLower === 'numeric' || colTypeLower === 'decimal' || colTypeLower === 'integer') {
    const num = Number(val);
    if (isNaN(num)) return String(val);

    const fmt = config.numberFormat || 'number';
    const decimals = config.decimals !== undefined ? config.decimals : (fmt === 'decimal' || fmt === 'currency' ? 2 : 0);
    const useSep = config.useThousandsSeparator !== false;
    const currency = config.currencySymbol || '$';

    if (fmt === 'percentage') {
      const pctNum = num * 100;
      const formattedNum = useSep ? pctNum.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : pctNum.toFixed(decimals);
      return `${formattedNum}%`;
    }

    const formattedNum = useSep
      ? num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : num.toFixed(decimals);

    if (fmt === 'currency') {
      return `${currency}${formattedNum}`;
    }

    return formattedNum;
  }

  // Handle Date / DateTime formatting
  if (colTypeLower === 'date' || colTypeLower === 'datetime') {
    const { date } = parseFlexibleDateTime(val);
    if (!date) return String(val);

    const fmt = config.dateFormat || 'YYYY-MM-DD';
    const yr = date.getFullYear();
    const moNum = date.getMonth() + 1;
    const moStr = String(moNum).padStart(2, '0');
    const moShort = date.toLocaleDateString('en-US', { month: 'short' });
    const dy = String(date.getDate()).padStart(2, '0');

    if (fmt === 'DD/MM/YYYY') return `${dy}/${moStr}/${yr}`;
    if (fmt === 'MM/DD/YYYY') return `${moStr}/${dy}/${yr}`;
    if (fmt === 'YYYY-MM-DD') return `${yr}-${moStr}-${dy}`;
    if (fmt === 'MMM YYYY') return `${moShort} ${yr}`;
    if (fmt === 'YYYY') return `${yr}`;
    if (fmt === 'DD MMM YYYY, HH:mm') {
      const hr = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${dy} ${moShort} ${yr}, ${hr}:${min}`;
    }

    return `${yr}-${moStr}-${dy}`;
  }

  return String(val);
}

/**
 * Extract Date or Time into a new column from a DateTime source column.
 */
export function extractDateTimePart(
  data: Record<string, any>[],
  sourceHeader: string,
  targetPart: 'date' | 'time',
  newHeaderName: string
): Record<string, any>[] {
  return data.map(row => {
    const raw = row[sourceHeader];
    const { date } = parseFlexibleDateTime(raw);
    let extractedVal: string | null = null;

    if (date) {
      if (targetPart === 'date') {
        const yr = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const dy = String(date.getDate()).padStart(2, '0');
        extractedVal = `${yr}-${mo}-${dy}`;
      } else {
        const hr = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const sec = String(date.getSeconds()).padStart(2, '0');
        extractedVal = `${hr}:${min}:${sec}`;
      }
    }

    return {
      ...row,
      [newHeaderName]: extractedVal,
    };
  });
}
