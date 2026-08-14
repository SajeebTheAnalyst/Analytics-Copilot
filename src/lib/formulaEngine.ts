// Formula Engine for Data Workspace (Phase 8F)

export interface FormulaValidationResult {
  isValid: boolean;
  error: string | null;
  referencedColumns: string[];
}

export type Token =
  | { type: 'NUMBER'; value: number }
  | { type: 'COLUMN'; name: string }
  | { type: 'FUNC'; name: 'SUM' | 'AVERAGE' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' }
  | { type: 'OP'; value: '+' | '-' | '*' | '/' }
  | { type: 'PAREN'; value: '(' | ')' }
  | { type: 'COMMA'; value: ',' };

/**
 * Safely parse numeric value from cell content
 */
export function toNumericValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  const str = String(val).replace(/[\$,]/g, '').trim();
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Tokenize a formula string
 */
export function tokenizeFormula(
  formulaStr: string,
  availableHeaders: string[]
): { tokens: Token[]; error: string | null; referencedColumns: string[] } {
  let expr = formulaStr.trim();
  if (expr.startsWith('=')) {
    expr = expr.substring(1).trim();
  }

  if (!expr) {
    return { tokens: [], error: 'Formula cannot be empty.', referencedColumns: [] };
  }

  const tokens: Token[] = [];
  const referencedColumnsSet = new Set<string>();
  let i = 0;

  // Sort available headers by length descending to match longest column names first
  const sortedHeaders = [...availableHeaders].sort((a, b) => b.length - a.length);

  const KNOWN_FUNCS = ['SUM', 'AVERAGE', 'AVG', 'COUNT', 'MIN', 'MAX'];

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Quoted or bracketed column reference: 'Col Name', "Col Name", [Col Name]
    if (char === "'" || char === '"' || char === '[') {
      const closingChar = char === '[' ? ']' : char;
      const endIdx = expr.indexOf(closingChar, i + 1);
      if (endIdx === -1) {
        return {
          tokens: [],
          error: `Unclosed column quote/bracket starting at position ${i + 1}.`,
          referencedColumns: [],
        };
      }
      const colName = expr.substring(i + 1, endIdx).trim();
      tokens.push({ type: 'COLUMN', name: colName });
      referencedColumnsSet.add(colName);
      i = endIdx + 1;
      continue;
    }

    // Single character operators or parens
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      tokens.push({ type: 'OP', value: char });
      i++;
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'PAREN', value: char });
      i++;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Number literal: e.g. 100, 3.14
    if (/\d/.test(char) || (char === '.' && /\d/.test(expr[i + 1] || ''))) {
      const numMatch = expr.substring(i).match(/^\d+(\.\d+)?/);
      if (numMatch) {
        const numVal = parseFloat(numMatch[0]);
        tokens.push({ type: 'NUMBER', value: numVal });
        i += numMatch[0].length;
        continue;
      }
    }

    // Check if remaining string starts with a known column name (handles unquoted column names with spaces)
    let matchedHeader: string | null = null;
    for (const header of sortedHeaders) {
      if (expr.substring(i).toLowerCase().startsWith(header.toLowerCase())) {
        // Ensure boundary check if next char is word char
        const matchLen = header.length;
        const nextChar = expr[i + matchLen];
        if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar) || !/[a-zA-Z0-9_]/.test(header[header.length - 1])) {
          matchedHeader = header;
          break;
        }
      }
    }

    if (matchedHeader) {
      // Check if this matched header is actually a function call e.g. SUM(
      const upperHeader = matchedHeader.toUpperCase();
      if (KNOWN_FUNCS.includes(upperHeader)) {
        const rest = expr.substring(i + matchedHeader.length).trim();
        if (rest.startsWith('(')) {
          tokens.push({ type: 'FUNC', name: upperHeader as any });
          i += matchedHeader.length;
          continue;
        }
      }

      tokens.push({ type: 'COLUMN', name: matchedHeader });
      referencedColumnsSet.add(matchedHeader);
      i += matchedHeader.length;
      continue;
    }

    // Identifier e.g. Revenue, Cost, SUM, AVERAGE
    const idMatch = expr.substring(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (idMatch) {
      const id = idMatch[0];
      const upperId = id.toUpperCase();

      if (KNOWN_FUNCS.includes(upperId)) {
        tokens.push({ type: 'FUNC', name: upperId as any });
      } else {
        tokens.push({ type: 'COLUMN', name: id });
        referencedColumnsSet.add(id);
      }
      i += id.length;
      continue;
    }

    return {
      tokens: [],
      error: `Unexpected character "${char}" in formula.`,
      referencedColumns: [],
    };
  }

  return {
    tokens,
    error: null,
    referencedColumns: Array.from(referencedColumnsSet),
  };
}

/**
 * Validate a formula string against available column headers
 */
export function validateFormula(
  formulaStr: string,
  availableHeaders: string[]
): FormulaValidationResult {
  const tokenResult = tokenizeFormula(formulaStr, availableHeaders);
  if (tokenResult.error) {
    return { isValid: false, error: tokenResult.error, referencedColumns: [] };
  }

  const { tokens, referencedColumns } = tokenResult;

  // Validate column references
  for (const refCol of referencedColumns) {
    if (!availableHeaders.includes(refCol)) {
      return {
        isValid: false,
        error: `Invalid column reference "${refCol}". Column does not exist in dataset.`,
        referencedColumns,
      };
    }
  }

  // Validate parenthesis matching & basic syntax
  let parenBalance = 0;
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.type === 'PAREN') {
      if (t.value === '(') parenBalance++;
      if (t.value === ')') parenBalance--;
      if (parenBalance < 0) {
        return { isValid: false, error: 'Unmatched closing parenthesis ")".', referencedColumns };
      }
    }

    // Check adjacent operators
    if (t.type === 'OP') {
      const next = tokens[idx + 1];
      if (idx === tokens.length - 1) {
        return { isValid: false, error: `Formula ends with operator "${t.value}".`, referencedColumns };
      }
      if (next && next.type === 'OP') {
        return { isValid: false, error: `Consecutive operators "${t.value}${next.value}".`, referencedColumns };
      }
    }
  }

  if (parenBalance !== 0) {
    return { isValid: false, error: 'Missing closing parenthesis ")".', referencedColumns };
  }

  return { isValid: true, error: null, referencedColumns };
}

/**
 * Topological Sort & Circular Dependency Detection
 */
export function getFormulaTopologicalOrder(
  allFormulas: Record<string, string>,
  availableHeaders: string[]
): { order: string[]; error: string | null } {
  const formulaCols = Object.keys(allFormulas);
  if (formulaCols.length === 0) {
    return { order: [], error: null };
  }

  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  const allHeadersForValidation = [...availableHeaders];

  for (const col of formulaCols) {
    inDegree[col] = 0;
    adj[col] = [];
  }

  for (const col of formulaCols) {
    const formula = allFormulas[col];
    const validation = validateFormula(formula, allHeadersForValidation);
    if (!validation.isValid) {
      return { order: [], error: `Error in column "${col}": ${validation.error}` };
    }

    const refFormulaCols = validation.referencedColumns.filter((c) => formulaCols.includes(c));

    for (const refCol of refFormulaCols) {
      if (refCol === col) {
        return {
          order: [],
          error: `Circular formula dependency detected: Column "${col}" references itself.`,
        };
      }
      if (!adj[refCol]) adj[refCol] = [];
      adj[refCol].push(col);
      inDegree[col] = (inDegree[col] || 0) + 1;
    }
  }

  const queue: string[] = [];
  for (const col of formulaCols) {
    if (inDegree[col] === 0) {
      queue.push(col);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    if (adj[current]) {
      for (const neighbor of adj[current]) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  if (order.length !== formulaCols.length) {
    return { order: [], error: 'Circular formula dependency detected.' };
  }

  return { order, error: null };
}

/**
 * Precompute Aggregate Values for a formula (e.g. SUM(Revenue), AVERAGE(Price))
 */
function precomputeAggregates(
  tokens: Token[],
  data: Record<string, any>[]
): Record<string, number> {
  const aggMap: Record<string, number> = {};

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.type === 'FUNC') {
      const funcName = t.name;
      // Expect next tokens to be PAREN('('), COLUMN(colName), PAREN(')')
      const nextParen = tokens[idx + 1];
      const nextCol = tokens[idx + 2];
      if (nextParen && nextParen.type === 'PAREN' && nextParen.value === '(' && nextCol && nextCol.type === 'COLUMN') {
        const colName = nextCol.name;
        const key = `${funcName}(${colName})`;

        if (!(key in aggMap)) {
          const numericValues = data
            .map((r) => r[colName])
            .filter((v) => v !== null && v !== undefined && v !== '')
            .map(toNumericValue);

          if (funcName === 'SUM') {
            aggMap[key] = numericValues.reduce((a, b) => a + b, 0);
          } else if (funcName === 'AVERAGE' || funcName === 'AVG') {
            aggMap[key] = numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
          } else if (funcName === 'COUNT') {
            aggMap[key] = numericValues.length;
          } else if (funcName === 'MIN') {
            aggMap[key] = numericValues.length > 0 ? Math.min(...numericValues) : 0;
          } else if (funcName === 'MAX') {
            aggMap[key] = numericValues.length > 0 ? Math.max(...numericValues) : 0;
          }
        }
      }
    }
  }

  return aggMap;
}

/**
 * Evaluate AST for a single row
 */
function evaluateRowTokens(
  tokens: Token[],
  row: Record<string, any>,
  aggMap: Record<string, number>
): number | string | null {
  // Simple Shunting Yard algorithm to evaluate expression
  const outputQueue: (number | string)[] = [];
  const operatorStack: Token[] = [];

  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
  };

  let idx = 0;
  while (idx < tokens.length) {
    const t = tokens[idx];

    if (t.type === 'NUMBER') {
      outputQueue.push(t.value);
    } else if (t.type === 'FUNC') {
      // Consume FUNC, '(', COLUMN, ')'
      const funcName = t.name;
      const nextCol = tokens[idx + 2];
      if (nextCol && nextCol.type === 'COLUMN') {
        const key = `${funcName}(${nextCol.name})`;
        const aggVal = aggMap[key] ?? 0;
        outputQueue.push(aggVal);
        idx += 3; // Advance past FUNC, '(', COLUMN. ')' handled by loop
      } else {
        outputQueue.push(0);
      }
    } else if (t.type === 'COLUMN') {
      const rawVal = row[t.name];
      outputQueue.push(toNumericValue(rawVal));
    } else if (t.type === 'OP') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === 'OP' &&
        precedence[(operatorStack[operatorStack.length - 1] as any).value] >= precedence[t.value]
      ) {
        const topOp = operatorStack.pop()!;
        outputQueue.push((topOp as any).value);
      }
      operatorStack.push(t);
    } else if (t.type === 'PAREN' && t.value === '(') {
      operatorStack.push(t);
    } else if (t.type === 'PAREN' && t.value === ')') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type !== 'PAREN'
      ) {
        const topOp = operatorStack.pop()!;
        outputQueue.push((topOp as any).value);
      }
      if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'PAREN') {
        operatorStack.pop(); // Pop '('
      }
    }

    idx++;
  }

  while (operatorStack.length > 0) {
    const topOp = operatorStack.pop()!;
    if (topOp.type === 'OP') {
      outputQueue.push(topOp.value);
    }
  }

  // RPN Evaluator Stack
  const evalStack: number[] = [];
  for (const item of outputQueue) {
    if (typeof item === 'number') {
      evalStack.push(item);
    } else if (item === '+' || item === '-' || item === '*' || item === '/') {
      const b = evalStack.pop() ?? 0;
      const a = evalStack.pop() ?? 0;

      if (item === '+') evalStack.push(a + b);
      if (item === '-') evalStack.push(a - b);
      if (item === '*') evalStack.push(a * b);
      if (item === '/') {
        if (b === 0) {
          return null; // Division by zero -> returns null gracefully
        }
        evalStack.push(a / b);
      }
    }
  }

  if (evalStack.length === 0) return null;
  const result = evalStack[evalStack.length - 1];
  if (isNaN(result) || !isFinite(result)) return null;

  // Round neatly to max 4 decimal places if floating point
  return Math.round(result * 10000) / 10000;
}

/**
 * Evaluate all calculated columns in a dataset working copy
 */
export function evaluateAllFormulas(
  availableHeaders: string[],
  data: Record<string, any>[],
  formulas: Record<string, string>
): { updatedData: Record<string, any>[]; error: string | null } {
  if (!formulas || Object.keys(formulas).length === 0) {
    return { updatedData: data, error: null };
  }

  // Get topological order
  const { order, error } = getFormulaTopologicalOrder(formulas, availableHeaders);
  if (error) {
    return { updatedData: data, error };
  }

  // Deep clone data rows
  const nextData = data.map((row) => ({ ...row }));

  for (const calcCol of order) {
    const formulaStr = formulas[calcCol];
    if (!formulaStr) continue;

    const tokenRes = tokenizeFormula(formulaStr, availableHeaders);
    if (tokenRes.error) {
      return { updatedData: data, error: `Formula error in "${calcCol}": ${tokenRes.error}` };
    }

    const aggMap = precomputeAggregates(tokenRes.tokens, nextData);

    for (let r = 0; r < nextData.length; r++) {
      const calculatedVal = evaluateRowTokens(tokenRes.tokens, nextData[r], aggMap);
      nextData[r][calcCol] = calculatedVal;
    }
  }

  return { updatedData: nextData, error: null };
}
