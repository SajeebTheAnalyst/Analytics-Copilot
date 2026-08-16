import { isBlankValue, parseFlexibleNumeric, parseFlexibleDateTime, extractDateValue, extractTimeValue } from './typeStandardizer';

export type CleaningActionType =
  | 'trim_whitespace'
  | 'clean_characters'
  | 'text_capitalization'
  | 'find_replace'
  | 'merge_categorical'
  | 'remove_duplicates'
  | 'remove_empty_rows'
  | 'remove_empty_columns'
  | 'fill_missing'
  | 'clear_cells'
  | 'delete_columns'
  | 'split_column'
  | 'extract_before_delimiter'
  | 'extract_after_delimiter'
  | 'extract_between_delimiters'
  | 'extract_date'
  | 'extract_time'
  | 'change_data_type'
  | 'flash_fill'
  | 'fill_series'
  | 'fill_up'
  | 'fill_down'
  | 'standardize_values'
  | 'calculate_column'
  | 'conditional_transform'
  | 'formula_column';

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
  previousCellFormattingSnapshot?: any;
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

export function previewSplitColumn(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  delimiter: string
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'split_column',
      actionTitle: 'Split Column',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column and cannot be split.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const newCol1 = `${targetCol}_1`;
  const newCol2 = `${targetCol}_2`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(newCol1)) updatedHeaders.push(newCol1);
  if (!updatedHeaders.includes(newCol2)) updatedHeaders.push(newCol2);

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = String(newRow[targetCol] ?? '');
    const parts = val.split(delimiter);
    const p1 = parts[0]?.trim() ?? '';
    const p2 = parts.slice(1).join(delimiter).trim() ?? '';

    newRow[newCol1] = p1;
    newRow[newCol2] = p2;

    if (val) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val,
        newValue: `${newCol1}: ${p1}, ${newCol2}: ${p2}`,
      });
    }
    return newRow;
  });

  return {
    actionType: 'split_column',
    actionTitle: 'Split Column',
    targetDescription: `Column "${targetCol}" by "${delimiter}"`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Split "${targetCol}" into new columns "${newCol1}" and "${newCol2}" for ${affectedRows.size} rows. Original column retained.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

export function previewExtractDate(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string
): CleaningPreviewResult {
  const newCol = `${targetCol}_Date`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(newCol)) updatedHeaders.push(newCol);

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = row[targetCol];
    const { extracted } = extractDateValue(val);

    newRow[newCol] = extracted;
    if (extracted !== null && extracted !== undefined) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val === null || val === undefined ? '' : String(val),
        newValue: `${newCol}: ${extracted}`,
      });
    }
    return newRow;
  });

  return {
    actionType: 'extract_date',
    actionTitle: 'Extract Date',
    targetDescription: `Column "${targetCol}"`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Extracted date into new column "${newCol}" for ${affectedRows.size} rows. Original column retained.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

export function previewExtractTime(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string
): CleaningPreviewResult {
  const newCol = `${targetCol}_Time`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(newCol)) updatedHeaders.push(newCol);

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = row[targetCol];
    const { extracted } = extractTimeValue(val);

    newRow[newCol] = extracted;
    if (extracted !== null && extracted !== undefined) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val === null || val === undefined ? '' : String(val),
        newValue: `${newCol}: ${extracted}`,
      });
    }
    return newRow;
  });

  return {
    actionType: 'extract_time',
    actionTitle: 'Extract Time',
    targetDescription: `Column "${targetCol}"`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Extracted time into new column "${newCol}" for ${affectedRows.size} rows. Original column retained.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

export function previewChangeDataType(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  targetType: string
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'change_data_type',
      actionTitle: 'Change Data Type',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column and its type cannot be directly changed.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = newRow[targetCol];
    let converted: any = val;

    if (targetType === 'Numeric' || targetType === 'Integer' || targetType === 'Decimal') {
      const num = Number(String(val).replace(/[$€£¥,%]/g, '').trim());
      if (!isNaN(num) && val !== '') {
        converted = targetType === 'Integer' ? Math.round(num) : num;
      }
    } else if (targetType === 'Boolean') {
      const s = String(val).toLowerCase().trim();
      converted = s === 'true' || s === '1' || s === 'yes';
    } else if (targetType === 'Text') {
      converted = String(val ?? '');
    }

    if (converted !== val) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val,
        newValue: converted,
      });
      newRow[targetCol] = converted;
    }
    return newRow;
  });

  return {
    actionType: 'change_data_type',
    actionTitle: 'Change Data Type',
    targetDescription: `Column "${targetCol}" → ${targetType}`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Converted ${diffCells.length} values in "${targetCol}" to type ${targetType}.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 10. CLEAN CHARACTERS (Remove non-printable ASCII, invisible zero-width chars, control codes)
 */
export function previewCleanCharacters(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol?: string,
  mode: 'all_non_printable' | 'control_chars' | 'strip_symbols' = 'all_non_printable'
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  const colsToProcess = targetCol && targetCol !== 'All' ? [targetCol] : headers;

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
      if (val === null || val === undefined) return;
      const strVal = String(val);

      let cleaned = strVal;
      if (mode === 'all_non_printable') {
        // Strip non-printable ASCII 0-31, 127-159, zero-width chars \u200B-\u200D\uFEFF, replace non-breaking spaces \u00A0
        cleaned = strVal
          .replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/g, '')
          .replace(/\u00A0/g, ' ');
      } else if (mode === 'control_chars') {
        cleaned = strVal.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      } else if (mode === 'strip_symbols') {
        // Keep only alphanumeric and standard spaces/punctuation
        cleaned = strVal.replace(/[^\w\s.,!?:;'"\-()[\]{}]/gi, '');
      }

      if (cleaned !== strVal) {
        diffCells.push({
          rowIdx,
          rowId,
          header: col,
          originalValue: strVal,
          newValue: cleaned,
        });
        affectedRowIndices.add(rowIdx);
        newRow[col] = cleaned;
      }
    });

    return newRow;
  });

  const targetDesc = targetCol && targetCol !== 'All' ? `Column "${targetCol}"` : 'All columns';

  return {
    actionType: 'clean_characters',
    actionTitle: 'Clean Characters',
    targetDescription: `${targetDesc} (${mode.replace(/_/g, ' ')})`,
    rowsAffectedCount: affectedRowIndices.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: diffCells.length > 0
      ? `Cleaned non-printable characters in ${diffCells.length} cells across ${affectedRowIndices.size} rows.`
      : 'No non-printable or corrupt characters detected in target columns.',
    warningFormulaColumns,
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 11. EXTRACT BEFORE DELIMITER
 */
export function previewExtractBeforeDelimiter(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  delimiter: string = '@'
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'extract_before_delimiter',
      actionTitle: 'Extract Before Delimiter',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column and cannot be extracted from directly.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const safeDelimName = delimiter === ' ' ? 'Space' : delimiter.replace(/[^a-zA-Z0-9]/g, '');
  const newCol = `${targetCol}_Before_${safeDelimName || 'delim'}`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(newCol)) updatedHeaders.push(newCol);

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = String(newRow[targetCol] ?? '');
    let extracted = '';
    const idx = val.indexOf(delimiter);
    if (idx !== -1) {
      extracted = val.substring(0, idx).trim();
    } else {
      extracted = val.trim();
    }

    newRow[newCol] = extracted;
    if (val) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val,
        newValue: `${newCol}: "${extracted}"`,
      });
    }
    return newRow;
  });

  return {
    actionType: 'extract_before_delimiter',
    actionTitle: 'Extract Before Delimiter',
    targetDescription: `Column "${targetCol}" before "${delimiter}"`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Extracted text before "${delimiter}" into new column "${newCol}" for ${affectedRows.size} rows. Original column retained.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

/**
 * 12. EXTRACT AFTER DELIMITER
 */
export function previewExtractAfterDelimiter(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  delimiter: string = '@'
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'extract_after_delimiter',
      actionTitle: 'Extract After Delimiter',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column and cannot be extracted from directly.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const safeDelimName = delimiter === ' ' ? 'Space' : delimiter.replace(/[^a-zA-Z0-9]/g, '');
  const newCol = `${targetCol}_After_${safeDelimName || 'delim'}`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(newCol)) updatedHeaders.push(newCol);

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = String(newRow[targetCol] ?? '');
    let extracted = '';
    const idx = val.indexOf(delimiter);
    if (idx !== -1) {
      extracted = val.substring(idx + delimiter.length).trim();
    } else {
      extracted = '';
    }

    newRow[newCol] = extracted;
    if (val) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val,
        newValue: `${newCol}: "${extracted}"`,
      });
    }
    return newRow;
  });

  return {
    actionType: 'extract_after_delimiter',
    actionTitle: 'Extract After Delimiter',
    targetDescription: `Column "${targetCol}" after "${delimiter}"`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Extracted text after "${delimiter}" into new column "${newCol}" for ${affectedRows.size} rows. Original column retained.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

/**
 * 13. EXTRACT BETWEEN DELIMITERS
 */
export function previewExtractBetweenDelimiters(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  startDelim: string = '(',
  endDelim: string = ')'
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'extract_between_delimiters',
      actionTitle: 'Extract Between Delimiters',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const newCol = `${targetCol}_Extracted`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(newCol)) updatedHeaders.push(newCol);

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = String(newRow[targetCol] ?? '');
    let extracted = '';
    const startIdx = val.indexOf(startDelim);
    if (startIdx !== -1) {
      const endIdx = val.indexOf(endDelim, startIdx + startDelim.length);
      if (endIdx !== -1) {
        extracted = val.substring(startIdx + startDelim.length, endIdx).trim();
      } else {
        extracted = val.substring(startIdx + startDelim.length).trim();
      }
    }

    newRow[newCol] = extracted;
    if (val) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val,
        newValue: `${newCol}: "${extracted}"`,
      });
    }
    return newRow;
  });

  return {
    actionType: 'extract_between_delimiters',
    actionTitle: 'Extract Between Delimiters',
    targetDescription: `Column "${targetCol}" between "${startDelim}" and "${endDelim}"`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Extracted text between "${startDelim}" and "${endDelim}" into "${newCol}" for ${affectedRows.size} rows. Original column retained.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

/**
 * 14. REMOVE EMPTY COLUMNS
 */
export function previewRemoveEmptyColumns(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {}
): CleaningPreviewResult {
  const blankCols: string[] = [];

  headers.forEach(header => {
    if (formulas[header]) return;
    const isAllBlank = data.every(row => {
      const val = row[header];
      return val === null || val === undefined || String(val).trim() === '';
    });
    if (isAllBlank) {
      blankCols.push(header);
    }
  });

  if (blankCols.length === 0) {
    return {
      actionType: 'remove_empty_columns',
      actionTitle: 'Remove Empty Columns',
      targetDescription: 'All columns',
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: 'No completely blank columns found in dataset.',
      warningFormulaColumns: [],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const newHeaders = headers.filter(h => !blankCols.includes(h));
  const updatedData = data.map(r => {
    const copy = { ...r };
    blankCols.forEach(h => delete copy[h]);
    return copy;
  });

  return {
    actionType: 'remove_empty_columns',
    actionTitle: 'Remove Empty Columns',
    targetDescription: blankCols.join(', '),
    rowsAffectedCount: data.length,
    cellsAffectedCount: blankCols.length * data.length,
    diffCells: [
      {
        rowIdx: 0,
        rowId: 'header-removal',
        header: blankCols.join(', '),
        originalValue: `Empty Column(s): ${blankCols.join(', ')}`,
        newValue: '[REMOVED COLUMN(S)]',
      }
    ],
    summaryText: `Found and removed ${blankCols.length} completely empty column(s): ${blankCols.join(', ')}.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: newHeaders,
  };
}

/**
 * 15. FLASH FILL (Smart Pattern Extraction / Completion)
 */
export function previewFlashFill(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  patternMode: 'extract_first_word' | 'extract_last_word' | 'extract_initials' | 'extract_numbers' | 'uppercase_first' = 'extract_first_word'
): CleaningPreviewResult {
  const newCol = `${targetCol}_Filled`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(newCol)) updatedHeaders.push(newCol);

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const val = String(newRow[targetCol] ?? '').trim();
    let filledVal = '';

    if (patternMode === 'extract_first_word') {
      filledVal = val.split(/\s+/)[0] || '';
    } else if (patternMode === 'extract_last_word') {
      const parts = val.split(/\s+/);
      filledVal = parts[parts.length - 1] || '';
    } else if (patternMode === 'extract_initials') {
      filledVal = val.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('.');
    } else if (patternMode === 'extract_numbers') {
      const match = val.match(/\d+/g);
      filledVal = match ? match.join('') : '';
    } else if (patternMode === 'uppercase_first') {
      filledVal = val.charAt(0).toUpperCase() + val.slice(1);
    }

    newRow[newCol] = filledVal;
    if (val) {
      affectedRows.add(rowIdx);
      diffCells.push({
        rowIdx,
        rowId: row._rowId || `r-${rowIdx}`,
        header: targetCol,
        originalValue: val,
        newValue: `${newCol}: "${filledVal}"`,
      });
    }
    return newRow;
  });

  return {
    actionType: 'flash_fill',
    actionTitle: 'Flash Fill',
    targetDescription: `Column "${targetCol}" (${patternMode.replace(/_/g, ' ')})`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Generated Flash Fill pattern in new column "${newCol}" for ${affectedRows.size} rows. Original column retained.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

/**
 * 16. FILL SERIES (Sequential Numbers or Dates)
 */
export function previewFillSeries(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  startVal: number = 1,
  stepVal: number = 1
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'fill_series',
      actionTitle: 'Fill Series',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;
    const originalVal = newRow[targetCol];
    const seriesVal = startVal + rowIdx * stepVal;

    diffCells.push({
      rowIdx,
      rowId,
      header: targetCol,
      originalValue: originalVal,
      newValue: seriesVal,
    });
    affectedRows.add(rowIdx);
    newRow[targetCol] = seriesVal;
    return newRow;
  });

  return {
    actionType: 'fill_series',
    actionTitle: 'Fill Series',
    targetDescription: `Column "${targetCol}" (Start: ${startVal}, Step: ${stepVal})`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Generated series ${startVal}, ${startVal + stepVal}, ${startVal + 2 * stepVal}... in column "${targetCol}" across ${data.length} rows.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 17. FILL UP (Replicate bottom value upwards)
 */
export function previewFillUp(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  startRow: number = 0,
  endRow: number = data.length - 1
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'fill_up',
      actionTitle: 'Fill Up',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const sourceVal = data[endRow]?.[targetCol];
  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    if (rowIdx >= startRow && rowIdx < endRow) {
      const originalVal = newRow[targetCol];
      if (originalVal !== sourceVal) {
        diffCells.push({
          rowIdx,
          rowId: row._rowId || `r-${rowIdx}`,
          header: targetCol,
          originalValue: originalVal,
          newValue: sourceVal,
        });
        affectedRows.add(rowIdx);
        newRow[targetCol] = sourceVal;
      }
    }
    return newRow;
  });

  return {
    actionType: 'fill_up',
    actionTitle: 'Fill Up',
    targetDescription: `Column "${targetCol}" (Rows ${startRow + 1} to ${endRow + 1})`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Filled upward value "${sourceVal}" into ${diffCells.length} cells in "${targetCol}".`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 18. FILL DOWN (Replicate top value downwards)
 */
export function previewFillDown(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  startRow: number = 0,
  endRow: number = data.length - 1
): CleaningPreviewResult {
  const formulaCols = Object.keys(formulas);
  if (formulaCols.includes(targetCol)) {
    return {
      actionType: 'fill_down',
      actionTitle: 'Fill Down',
      targetDescription: `Column "${targetCol}"`,
      rowsAffectedCount: 0,
      cellsAffectedCount: 0,
      diffCells: [],
      summaryText: `Column "${targetCol}" is a formula column.`,
      warningFormulaColumns: [targetCol],
      updatedData: [...data],
      updatedHeaders: [...headers],
    };
  }

  const sourceVal = data[startRow]?.[targetCol];
  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    if (rowIdx > startRow && rowIdx <= endRow) {
      const originalVal = newRow[targetCol];
      if (originalVal !== sourceVal) {
        diffCells.push({
          rowIdx,
          rowId: row._rowId || `r-${rowIdx}`,
          header: targetCol,
          originalValue: originalVal,
          newValue: sourceVal,
        });
        affectedRows.add(rowIdx);
        newRow[targetCol] = sourceVal;
      }
    }
    return newRow;
  });

  return {
    actionType: 'fill_down',
    actionTitle: 'Fill Down',
    targetDescription: `Column "${targetCol}" (Rows ${startRow + 1} to ${endRow + 1})`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Filled downward value "${sourceVal}" into ${diffCells.length} cells in "${targetCol}".`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 19. STANDARDIZE VALUES (Text, Dates, Numbers, Booleans)
 */
export function previewStandardizeValues(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol?: string,
  mode: 'all' | 'text' | 'dates' | 'numbers' | 'booleans' = 'all'
): CleaningPreviewResult {
  const targetCols = targetCol ? [targetCol] : headers;
  const formulaCols = Object.keys(formulas);
  const warnedFormulaCols = targetCols.filter(col => formulaCols.includes(col));
  const validTargetCols = targetCols.filter(col => !formulaCols.includes(col));

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;

    validTargetCols.forEach(col => {
      const originalVal = newRow[col];
      if (originalVal === null || originalVal === undefined || originalVal === '') return;

      let standardizedVal = originalVal;
      const str = String(originalVal).trim();

      // Text standardization (collapse multiple whitespaces, trim)
      if (mode === 'all' || mode === 'text') {
        if (typeof originalVal === 'string') {
          standardizedVal = str.replace(/\s+/g, ' ');
        }
      }

      // Boolean standardization
      if (mode === 'all' || mode === 'booleans') {
        const lower = str.toLowerCase();
        if (['true', 'yes', 'y', '1', 't'].includes(lower)) {
          standardizedVal = true;
        } else if (['false', 'no', 'n', '0', 'f'].includes(lower)) {
          standardizedVal = false;
        }
      }

      // Date standardization (ISO format YYYY-MM-DD)
      if (mode === 'all' || mode === 'dates') {
        const parsedDate = parseFlexibleDateTime(originalVal);
        if (parsedDate.date && !isNaN(parsedDate.date.getTime())) {
          standardizedVal = parsedDate.date.toISOString().split('T')[0];
        }
      }

      // Number standardization
      if (mode === 'all' || mode === 'numbers') {
        const parsedNum = parseFlexibleNumeric(originalVal);
        if (parsedNum.numeric !== null && !isNaN(parsedNum.numeric) && typeof originalVal === 'string' && (originalVal.includes('$') || originalVal.includes(',') || originalVal.includes('%'))) {
          standardizedVal = parsedNum.numeric;
        }
      }

      if (standardizedVal !== originalVal) {
        diffCells.push({
          rowIdx,
          rowId,
          header: col,
          originalValue: originalVal,
          newValue: standardizedVal,
        });
        affectedRows.add(rowIdx);
        newRow[col] = standardizedVal;
      }
    });

    return newRow;
  });

  return {
    actionType: 'standardize_values',
    actionTitle: 'Standardize Values',
    targetDescription: targetCol ? `Column "${targetCol}" (${mode})` : `All Columns (${mode})`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Standardized ${diffCells.length} values across ${affectedRows.size} rows (${mode} mode).`,
    warningFormulaColumns: warnedFormulaCols,
    updatedData,
    updatedHeaders: [...headers],
  };
}

/**
 * 20. CALCULATE COLUMN (Quick Math / Statistical Transformations)
 */
export function previewCalculateColumn(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  calcType: 'percent_of_total' | 'running_total' | 'multiply_factor' | 'add_constant' | 'diff_prev_row' | 'z_score' = 'percent_of_total',
  factor: number = 1.1,
  createNewColumn: boolean = true
): CleaningPreviewResult {
  const colName = createNewColumn ? `${targetCol}_${calcType.replace(/_/g, '_')}` : targetCol;
  const updatedHeaders = [...headers];
  if (createNewColumn && !updatedHeaders.includes(colName)) {
    updatedHeaders.push(colName);
  }

  // Precompute column sum, mean, stddev if needed
  let totalSum = 0;
  let numericCount = 0;
  const numValues: number[] = [];

  data.forEach(r => {
    const parsed = parseFlexibleNumeric(r[targetCol]);
    if (parsed.numeric !== null && !isNaN(parsed.numeric)) {
      totalSum += parsed.numeric;
      numericCount++;
      numValues.push(parsed.numeric);
    }
  });

  const mean = numericCount > 0 ? totalSum / numericCount : 0;
  const variance = numericCount > 0
    ? numValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / numericCount
    : 0;
  const stdDev = Math.sqrt(variance);

  let runningSum = 0;
  let prevVal: number | null = null;

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;
    const parsed = parseFlexibleNumeric(newRow[targetCol]);
    const originalNum = parsed.numeric;
    let computedVal: any = null;

    if (originalNum !== null && !isNaN(originalNum)) {
      switch (calcType) {
        case 'percent_of_total':
          computedVal = totalSum !== 0 ? Number(((originalNum / totalSum) * 100).toFixed(2)) : 0;
          break;
        case 'running_total':
          runningSum += originalNum;
          computedVal = Number(runningSum.toFixed(2));
          break;
        case 'multiply_factor':
          computedVal = Number((originalNum * factor).toFixed(4));
          break;
        case 'add_constant':
          computedVal = Number((originalNum + factor).toFixed(4));
          break;
        case 'diff_prev_row':
          if (prevVal === null) {
            computedVal = 0;
          } else {
            computedVal = Number((originalNum - prevVal).toFixed(2));
          }
          prevVal = originalNum;
          break;
        case 'z_score':
          computedVal = stdDev > 0 ? Number(((originalNum - mean) / stdDev).toFixed(3)) : 0;
          break;
        default:
          computedVal = originalNum;
      }
    }

    diffCells.push({
      rowIdx,
      rowId,
      header: colName,
      originalValue: newRow[targetCol],
      newValue: computedVal,
    });
    affectedRows.add(rowIdx);
    newRow[colName] = computedVal;
    return newRow;
  });

  return {
    actionType: 'calculate_column',
    actionTitle: 'Calculate Column',
    targetDescription: `Column "${targetCol}" → "${colName}" (${calcType})`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Calculated "${calcType.replace(/_/g, ' ')}" into "${colName}" across ${affectedRows.size} rows.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}

/**
 * 21. CONDITIONAL TRANSFORM (IF - THEN - ELSE Transformation Rules)
 */
export function previewConditionalTransform(
  data: Record<string, any>[],
  headers: string[],
  formulas: Record<string, string> = {},
  targetCol: string,
  condition: 'greater_than' | 'less_than' | 'equals' | 'contains' | 'is_blank' | 'is_not_blank' = 'greater_than',
  conditionValue: string = '100',
  thenValue: string = 'High',
  elseValue: string = 'Normal',
  newColName?: string
): CleaningPreviewResult {
  const resultCol = newColName && newColName.trim() ? newColName.trim() : `${targetCol}_flag`;
  const updatedHeaders = [...headers];
  if (!updatedHeaders.includes(resultCol)) {
    updatedHeaders.push(resultCol);
  }

  const diffCells: CleaningDiffCell[] = [];
  const affectedRows = new Set<number>();
  const numCondition = Number(conditionValue);
  const isNumericCondition = !isNaN(numCondition) && conditionValue.trim() !== '';

  const updatedData = data.map((row, rowIdx) => {
    const newRow = { ...row };
    const rowId = row._rowId || `r-${rowIdx}`;
    const rawVal = newRow[targetCol];
    const strVal = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
    const numVal = typeof rawVal === 'number' ? rawVal : Number(strVal);
    const isNum = !isNaN(numVal) && strVal !== '';

    let match = false;

    switch (condition) {
      case 'greater_than':
        if (isNum && isNumericCondition) match = numVal > numCondition;
        break;
      case 'less_than':
        if (isNum && isNumericCondition) match = numVal < numCondition;
        break;
      case 'equals':
        match = isNum && isNumericCondition ? numVal === numCondition : strVal.toLowerCase() === conditionValue.trim().toLowerCase();
        break;
      case 'contains':
        match = strVal.toLowerCase().includes(conditionValue.trim().toLowerCase());
        break;
      case 'is_blank':
        match = isBlankValue(rawVal);
        break;
      case 'is_not_blank':
        match = !isBlankValue(rawVal);
        break;
    }

    const assignedVal = match ? thenValue : elseValue;

    diffCells.push({
      rowIdx,
      rowId,
      header: resultCol,
      originalValue: rawVal,
      newValue: assignedVal,
    });
    affectedRows.add(rowIdx);
    newRow[resultCol] = assignedVal;
    return newRow;
  });

  return {
    actionType: 'conditional_transform',
    actionTitle: 'Conditional Transform',
    targetDescription: `IF [${targetCol}] ${condition.replace(/_/g, ' ')} "${conditionValue}" THEN "${thenValue}" ELSE "${elseValue}"`,
    rowsAffectedCount: affectedRows.size,
    cellsAffectedCount: diffCells.length,
    diffCells,
    summaryText: `Applied conditional rule to create "${resultCol}" for ${data.length} rows.`,
    warningFormulaColumns: [],
    updatedData,
    updatedHeaders,
  };
}


