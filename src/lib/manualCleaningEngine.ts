import { isBlankValue } from './typeStandardizer';

export type CleaningActionType =
  | 'trim_whitespace'
  | 'text_capitalization'
  | 'find_replace'
  | 'merge_categorical'
  | 'remove_duplicates'
  | 'remove_empty_rows'
  | 'fill_missing'
  | 'clear_cells'
  | 'delete_columns';

export interface CleaningDiffCell {
  rowIdx: number;
  rowId: string;
  header: string;
  originalValue: any;
  newValue: any;
}

export interface CleaningPreviewResult {
  actionType: CleaningActionType;
  actionTitle: string;
  targetDescription: string;
  rowsAffectedCount: number;
  cellsAffectedCount: number;
  diffCells: CleaningDiffCell[];
  summaryText: string;
  warningFormulaColumns: string[];
  updatedData: Record<string, any>[];
  updatedHeaders: string[];
}

export interface CleaningHistoryItem {
  id: string;
  actionName: string;
  target: string;
  rowsAffected: number;
  cellsAffected: number;
  timestamp: Date;
  previousDataSnapshot: Record<string, any>[];
  previousHeadersSnapshot: string[];
}

/** Helper: Title Case */
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

/** Helper: Sentence Case */
function toSentenceCase(str: string): string {
  if (!str) return str;
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * 1. TRIM LEADING / TRAILING WHITESPACE
 */
export function previewTrimWhitespace(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol?: string
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  const colsToProcess = targetCol && targetCol !== 'All' 
    ? [targetCol] 
    : headers;

  const warningFormulaColumns: string[] = [];
  const validCols: string[] = [];

  colsToProcess.forEach(col => {
    if (formulaCols.includes(col)) {
      warningFormulaColumns.push(col);
    } else {
      validCols.push(col);
    }
  });

  const diffCells: CleaningDiffCell[] = [];
  const affectedRowIndices = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;

    validCols.forEach(col => {
      const val = newRow[col];
      if (typeof val === 'string' && val.trim() !== val) {
        const trimmed = val.trim();
        diffCells.push({
          rowIdx,
          rowId,
          header: col,
          originalValue: val,
          newValue: trimmed,
        });
        affectedRowIndices.add(rowIdx);
        newRow[col] = trimmed;
      }
    });

    return newRow;
  });

  const targetDesc = targetCol && targetCol !== 'All' ? `Column "${targetCol}"` : 'All text columns';

  return {
    actionType: 'trim_whitespace',
    actionTitle: 'Trim Whitespace',
    targetDescription: targetDesc,
    rowsAffectedCount: affectedRowIndices.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: diffCells.length > 0
      ? `Trimmed leading/trailing spaces in ${diffCells.length} cells across ${affectedRowIndices.size} rows.`
      : 'No values required whitespace trimming.',
    warningFormulaColumns,
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 2. STANDARDIZE TEXT CAPITALIZATION
 */
export function previewCapitalization(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  casing: 'upper' | 'lower' | 'title' | 'sentence'
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  const warningFormulaColumns: string[] = [];

  if (formulaCols.includes(targetCol)) {
    warningFormulaColumns.push(targetCol);
  }

  const diffCells: CleaningDiffCell[] = [];
  const affectedRowIndices = new Set<number>();

  if (warningFormulaColumns.length > 0) {
    return {
      actionType: 'text_capitalization',
      actionTitle: `Capitalization (${casing.toUpperCase()})`,
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a calculated formula column and cannot be transformed.`,
      warningFormulaColumns,
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;
    const val = newRow[targetCol];

    if (val !== null && val !== undefined && val !== '') {
      const strVal = String(val);
      let transformed = strVal;

      if (casing === 'upper') transformed = strVal.toUpperCase();
      else if (casing === 'lower') transformed = strVal.toLowerCase();
      else if (casing === 'title') transformed = toTitleCase(strVal);
      else if (casing === 'sentence') transformed = toSentenceCase(strVal);

      if (transformed !== strVal) {
        diffCells.push({
          rowIdx,
          rowId,
          header: targetCol,
          originalValue: strVal,
          newValue: transformed,
        });
        affectedRowIndices.add(rowIdx);
        newRow[targetCol] = transformed;
      }
    }

    return newRow;
  });

  return {
    actionType: 'text_capitalization',
    actionTitle: `Capitalize text (${casing})`,
    targetDescription: `Column "${targetCol}"`,
    rowsAffectedCount: affectedRowIndices.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: diffCells.length > 0
      ? `Standardized text case in ${diffCells.length} cells in "${targetCol}".`
      : `All cells in "${targetCol}" are already formatted in ${casing} case.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 3. FIND AND REPLACE
 */
export function previewFindReplace(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string | 'All',
  searchVal: string,
  replaceVal: string,
  matchExact: boolean = true,
  caseSensitive: boolean = false
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  const colsToProcess = targetCol && targetCol !== 'All' ? [targetCol] : headers;

  const warningFormulaColumns: string[] = [];
  const validCols: string[] = [];

  colsToProcess.forEach(col => {
    if (formulaCols.includes(col)) warningFormulaColumns.push(col);
    else validCols.push(col);
  });

  const diffCells: CleaningDiffCell[] = [];
  const affectedRowIndices = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;

    validCols.forEach(col => {
      const val = newRow[col];
      if (val === null || val === undefined) return;

      const strVal = String(val);
      let isMatch = false;
      let newVal = strVal;

      if (matchExact) {
        if (caseSensitive) {
          isMatch = strVal === searchVal;
        } else {
          isMatch = strVal.toLowerCase() === searchVal.toLowerCase();
        }
        if (isMatch) newVal = replaceVal;
      } else {
        const flag = caseSensitive ? 'g' : 'gi';
        const escaped = searchVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, flag);
        if (regex.test(strVal)) {
          isMatch = true;
          newVal = strVal.replace(regex, replaceVal);
        }
      }

      if (isMatch && newVal !== strVal) {
        diffCells.push({
          rowIdx,
          rowId,
          header: col,
          originalValue: strVal,
          newValue: newVal,
        });
        affectedRowIndices.add(rowIdx);
        newRow[col] = newVal;
      }
    });

    return newRow;
  });

  return {
    actionType: 'find_replace',
    actionTitle: 'Find & Replace',
    targetDescription: targetCol && targetCol !== 'All' ? `Column "${targetCol}"` : 'All columns',
    rowsAffectedCount: affectedRowIndices.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: diffCells.length > 0
      ? `Replaced "${searchVal}" → "${replaceVal}" in ${diffCells.length} cells.`
      : `Zero matches found for "${searchVal}".`,
    warningFormulaColumns,
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 4. MERGE / REPLACE SIMILAR CATEGORICAL VALUES
 */
export function previewMergeCategorical(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  selectedVariations: string[],
  replacementVal: string
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  const warningFormulaColumns: string[] = [];

  if (formulaCols.includes(targetCol)) {
    warningFormulaColumns.push(targetCol);
    return {
      actionType: 'merge_categorical',
      actionTitle: 'Merge Categorical Variations',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column and cannot be edited.`,
      warningFormulaColumns,
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const varSet = new Set(selectedVariations.map(v => v.trim()));
  const diffCells: CleaningDiffCell[] = [];
  const affectedRowIndices = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;
    const val = newRow[targetCol];

    if (val !== null && val !== undefined) {
      const strVal = String(val).trim();
      if (varSet.has(strVal) && strVal !== replacementVal) {
        diffCells.push({
          rowIdx,
          rowId,
          header: targetCol,
          originalValue: String(val),
          newValue: replacementVal,
        });
        affectedRowIndices.add(rowIdx);
        newRow[targetCol] = replacementVal;
      }
    }

    return newRow;
  });

  return {
    actionType: 'merge_categorical',
    actionTitle: 'Merge Categorical Variations',
    targetDescription: `Column "${targetCol}"`,
    rowsAffectedCount: affectedRowIndices.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: diffCells.length > 0
      ? `Merged ${selectedVariations.length} variations → "${replacementVal}" in ${diffCells.length} cells across ${affectedRowIndices.size} rows.`
      : `No cells matched selected variations to replace.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 5. REMOVE DUPLICATE ROWS
 */
export function previewRemoveDuplicates(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  keyColumns?: string[]
): CleaningPreviewResult {
  const colsToCheck = keyColumns && keyColumns.length > 0 ? keyColumns : headers;
  const seenHashes = new Set<string>();
  const duplicateIndices: number[] = [];
  const diffCells: CleaningDiffCell[] = [];

  const updatedData: Record<string, any>[] = [];

  data.forEach((row, rowIdx) => {
    const hash = colsToCheck.map(h => String(row[h] ?? '')).join('||');
    if (seenHashes.has(hash)) {
      duplicateIndices.push(rowIdx);
      // Diff sample
      if (diffCells.length < 20) {
        diffCells.push({
          rowIdx,
          rowId: row._rowId || `r-${rowIdx}`,
          header: colsToCheck[0] || headers[0],
          originalValue: `Row #${rowIdx + 1} (Duplicate)`,
          newValue: '[REMOVED ROW]',
        });
      }
    } else {
      seenHashes.add(hash);
      updatedData.push(row);
    }
  });

  return {
    actionType: 'remove_duplicates',
    actionTitle: 'Remove Duplicate Rows',
    targetDescription: keyColumns && keyColumns.length > 0 ? `Columns: ${keyColumns.join(', ')}` : 'Entire dataset',
    rowsAffectedCount: duplicateIndices.length,
    cellsAffectedCount: duplicateIndices.length * headers.length,
    diffCells,
    summaryText: duplicateIndices.length > 0
      ? `Found ${duplicateIndices.length} redundant duplicate rows. Dataset will decrease from ${data.length} to ${updatedData.length} rows.`
      : 'No duplicate rows found in dataset.',
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 6. REMOVE COMPLETELY EMPTY ROWS
 */
export function previewRemoveEmptyRows(
  data: Record<string, any>[],
  headers: string[]
): CleaningPreviewResult {
  const emptyIndices: number[] = [];
  const diffCells: CleaningDiffCell[] = [];
  const updatedData: Record<string, any>[] = [];

  data.forEach((row, rowIdx) => {
    const isEmpty = headers.every(h => isBlankValue(row[h]));
    if (isEmpty) {
      emptyIndices.push(rowIdx);
      if (diffCells.length < 20) {
        diffCells.push({
          rowIdx,
          rowId: row._rowId || `r-${rowIdx}`,
          header: headers[0] || 'Row',
          originalValue: `Row #${rowIdx + 1} (100% Blank)`,
          newValue: '[REMOVED ROW]',
        });
      }
    } else {
      updatedData.push(row);
    }
  });

  return {
    actionType: 'remove_empty_rows',
    actionTitle: 'Remove Empty Rows',
    targetDescription: 'All empty rows',
    rowsAffectedCount: emptyIndices.length,
    cellsAffectedCount: emptyIndices.length * headers.length,
    diffCells,
    summaryText: emptyIndices.length > 0
      ? `Found ${emptyIndices.length} completely blank rows. Dataset will decrease from ${data.length} to ${updatedData.length} rows.`
      : 'No completely empty rows found.',
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 7. FILL MISSING VALUES
 */
export function previewFillMissing(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  strategy: 'custom' | 'ffill' | 'bfill' | 'mean' | 'median' | 'mode',
  customVal: string = 'N/A'
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'fill_missing',
      actionTitle: 'Fill Missing Values',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column and cannot be modified.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  // Pre-calculate aggregate if needed (mean, median, mode)
  let computedFill: any = customVal;

  if (strategy === 'mean' || strategy === 'median') {
    const nums: number[] = [];
    data.forEach(r => {
      const v = r[targetCol];
      if (!isBlankValue(v) && !isNaN(Number(v))) {
        nums.push(Number(v));
      }
    });

    if (nums.length > 0) {
      if (strategy === 'mean') {
        const sum = nums.reduce((a, b) => a + b, 0);
        computedFill = parseFloat((sum / nums.length).toFixed(2));
      } else {
        nums.sort((a, b) => a - b);
        const mid = Math.floor(nums.length / 2);
        computedFill = nums.length % 2 !== 0 ? nums[mid] : parseFloat(((nums[mid - 1] + nums[mid]) / 2).toFixed(2));
      }
    }
  } else if (strategy === 'mode') {
    const freq = new Map<string, number>();
    data.forEach(r => {
      const v = r[targetCol];
      if (!isBlankValue(v)) {
        const s = String(v);
        freq.set(s, (freq.get(s) || 0) + 1);
      }
    });
    let maxCnt = 0;
    freq.forEach((cnt, val) => {
      if (cnt > maxCnt) {
        maxCnt = cnt;
        computedFill = val;
      }
    });
  }

  const diffCells: CleaningDiffCell[] = [];
  const affectedRowIndices = new Set<number>();
  let lastValidValue: any = null;

  // For bfill, find next valid
  const updatedData = data.map(r => ({ ...r }));

  for (let i = 0; i < updatedData.length; i++) {
    const row = updatedData[i];
    const rowId = row._rowId || `r-${i}`;
    const val = row[targetCol];

    if (isBlankValue(val)) {
      let fillVal = computedFill;

      if (strategy === 'ffill') {
        fillVal = lastValidValue !== null ? lastValidValue : customVal;
      } else if (strategy === 'bfill') {
        let nextValid = null;
        for (let j = i + 1; j < updatedData.length; j++) {
          if (!isBlankValue(updatedData[j][targetCol])) {
            nextValid = updatedData[j][targetCol];
            break;
          }
        }
        fillVal = nextValid !== null ? nextValid : customVal;
      }

      diffCells.push({
        rowIdx: i,
        rowId,
        header: targetCol,
        originalValue: val === null ? 'null' : val === undefined ? 'undefined' : '""',
        newValue: fillVal,
      });
      affectedRowIndices.add(i);
      row[targetCol] = fillVal;
    } else {
      lastValidValue = val;
    }
  }

  return {
    actionType: 'fill_missing',
    actionTitle: 'Fill Missing Values',
    targetDescription: `Column "${targetCol}" (${strategy})`,
    rowsAffectedCount: affectedRowIndices.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: diffCells.length > 0
      ? `Filled ${diffCells.length} blank cells in "${targetCol}" with "${computedFill}".`
      : `No missing values found in "${targetCol}".`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 8. CLEAR SELECTED CELL VALUES
 */
export function previewClearCells(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  selectedRowIndices?: number[]
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'clear_cells',
      actionTitle: 'Clear Cells',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column and cannot be cleared.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const targetRows = selectedRowIndices && selectedRowIndices.length > 0 
    ? new Set(selectedRowIndices) 
    : new Set(data.map((_, i) => i));

  const diffCells: CleaningDiffCell[] = [];
  const affectedRowIndices = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    if (targetRows.has(rowIdx)) {
      const val = newRow[targetCol];
      if (!isBlankValue(val)) {
        diffCells.push({
          rowIdx,
          rowId: row._rowId || `r-${rowIdx}`,
          header: targetCol,
          originalValue: val,
          newValue: '',
        });
        affectedRowIndices.add(rowIdx);
        newRow[targetCol] = '';
      }
    }
    return newRow;
  });

  return {
    actionType: 'clear_cells',
    actionTitle: 'Clear Cell Values',
    targetDescription: `Column "${targetCol}"`,
    rowsAffectedCount: affectedRowIndices.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: diffCells.length > 0
      ? `Cleared values in ${diffCells.length} cells in "${targetCol}".`
      : `Selected cells in "${targetCol}" are already empty.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 9. DELETE SELECTED COLUMNS
 */
export function previewDeleteColumns(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  columnsToDelete: string[]
): CleaningPreviewResult {
  const warningFormulaColumns: string[] = [];
  const formulaCols = Object.keys(formulas);

  // Check if any deleted column is referenced in remaining formula definitions
  const remainingFormulas = { ...formulas };
  columnsToDelete.forEach(col => {
    if (formulaCols.includes(col)) {
      delete remainingFormulas[col];
    }
  });

  // Check for broken formula references
  Object.entries(remainingFormulas).forEach(([fCol, expr]) => {
    columnsToDelete.forEach(delCol => {
      const regex = new RegExp(`\\[${delCol}\\]`, 'i');
      if (regex.test(expr)) {
        warningFormulaColumns.push(fCol);
      }
    });
  });

  const newHeaders = headers.filter(h => !columnsToDelete.includes(h));

  const updatedData = data.map((row) => {
    const newRow = { ...row };
    columnsToDelete.forEach(col => {
      delete newRow[col];
    });
    return newRow;
  });

  const affectedCells = columnsToDelete.length * data.length;

  return {
    actionType: 'delete_columns',
    actionTitle: 'Delete Column(s)',
    targetDescription: columnsToDelete.join(', '),
    rowsAffectedCount: data.length,
    cellsAffectedCount: affectedCells,
    diffCells: [
      {
        rowIdx: 0,
        rowId: 'header-deletion',
        header: columnsToDelete.join(', '),
        originalValue: `Headers: ${columnsToDelete.join(', ')}`,
        newValue: '[REMOVED COLUMN(S)]',
      }
    ],
    summaryText: warningFormulaColumns.length > 0
      ? `Deleting ${columnsToDelete.length} column(s) (${columnsToDelete.join(', ')}). WARNING: Formula column(s) [${warningFormulaColumns.join(', ')}] reference deleted columns!`
      : `Deleting ${columnsToDelete.length} column(s) (${columnsToDelete.join(', ')}) from dataset.`,
    warningFormulaColumns,
    updatedData,
    updatedHeaders: newHeaders,
  };
}
