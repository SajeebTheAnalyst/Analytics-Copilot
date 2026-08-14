import { Dataset, KpiDefinition, ColumnFilter, KpiAggregation, KpiFormatConfig, FormulaToken, KpiStatus } from '@/types';
import { filterDataset } from './explorerEngine';

export interface KpiCalculationResult {
  rawResult: number | null;
  formattedResult: string;
  status: KpiStatus;
  statusReason?: string;
  rowCountEvaluated: number;
  executionTimeMs: number;
  errors: string[];
  warnings: string[];
  formulaSummary: string;
}

/**
 * Filter dataset rows based on KPI definition filters
 */
export function filterKpiData(data: Record<string, any>[], filters: ColumnFilter[]): Record<string, any>[] {
  if (!data || data.length === 0) return [];
  if (!filters || filters.length === 0) return data;
  return filterDataset(data, filters, '', []);
}

/**
 * Perform simple deterministic aggregation over dataset column
 */
export function evaluateSimpleAggregation(
  data: Record<string, any>[],
  column: string | undefined,
  aggregation: KpiAggregation
): number | null {
  if (!column) {
    if (aggregation === 'count' || aggregation === 'distinct_count') {
      return data ? data.length : 0;
    }
    return null;
  }

  // Helper to resolve row value, matching keys case-insensitively and trimming whitespace
  const getRowValue = (row: Record<string, any>, col: string) => {
    if (row[col] !== undefined) return row[col];
    const trimmedCol = col.trim().toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.trim().toLowerCase() === trimmedCol) {
        return row[key];
      }
    }
    return undefined;
  };

  if (aggregation === 'count') {
    if (!data || data.length === 0) return 0;
    let count = 0;
    for (const row of data) {
      const val = getRowValue(row, column);
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        count++;
      }
    }
    return count;
  }

  if (aggregation === 'distinct_count') {
    if (!data || data.length === 0) return 0;
    const uniqueVals = new Set<any>();
    for (const row of data) {
      const val = getRowValue(row, column);
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        uniqueVals.add(String(val).trim());
      }
    }
    return uniqueVals.size;
  }

  if (!data || data.length === 0) return null;

  // Extract non-null numeric values
  const nums: number[] = [];
  for (const row of data) {
    const rawVal = getRowValue(row, column);
    if (rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== '') {
      // Try to parse number, ignoring typical currency symbols or commas
      const cleanVal = String(rawVal).replace(/[\$,]/g, '').trim();
      const num = Number(cleanVal);
      if (!isNaN(num) && isFinite(num)) {
        nums.push(num);
      }
    }
  }

  if (nums.length === 0) {
    return null;
  }

  switch (aggregation) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0);
    case 'avg':
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min':
      return Math.min(...nums);
    case 'max':
      return Math.max(...nums);
    default:
      return 0;
  }
}

/**
 * Shunting Yard algorithm & stack evaluator for safe formula evaluation
 * No eval() or new Function()!
 */
export function evaluateFormulaTokens(
  tokens: FormulaToken[],
  dataset: Dataset,
  allKpis: KpiDefinition[],
  filters: ColumnFilter[],
  depth: number,
  visitedKpiIds: Set<string>
): { value: number | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!tokens || tokens.length === 0) {
    return { value: 0, errors: ['Formula tokens are empty'], warnings };
  }

  const filteredData = filterKpiData(dataset.fullData && dataset.fullData.length > 0 ? dataset.fullData : dataset.data, filters);

  // 1. Evaluate individual terms and KPI references to numeric values / operators
  type EvaluatedToken = { type: 'number'; value: number } | { type: 'operator'; op: string };
  const valuesAndOps: EvaluatedToken[] = [];

  for (const token of tokens) {
    if (token.type === 'constant') {
      valuesAndOps.push({ type: 'number', value: token.value || 0 });
    } else if (token.type === 'operator') {
      if (token.operator) {
        valuesAndOps.push({ type: 'operator', op: token.operator });
      }
    } else if (token.type === 'term') {
      if (!token.aggregation) {
        errors.push(`Missing aggregation for measure token ${token.column || 'unknown'}`);
        continue;
      }
      const num = evaluateSimpleAggregation(filteredData, token.column, token.aggregation);
      valuesAndOps.push({ type: 'number', value: num ?? 0 });
    } else if (token.type === 'kpi_ref') {
      if (!token.kpiId) {
        errors.push('Missing KPI ID in calculated formula reference');
        continue;
      }
      if (visitedKpiIds.has(token.kpiId) || depth > 10) {
        errors.push('Circular dependency detected in KPI formula reference');
        return { value: null, errors, warnings };
      }

      const targetKpi = allKpis.find((k) => k.id === token.kpiId);
      if (!targetKpi) {
        errors.push(`Referenced KPI '${token.kpiName || token.kpiId}' not found`);
        continue;
      }

      const nextVisited = new Set(visitedKpiIds);
      nextVisited.add(token.kpiId);

      const kpiRes = evaluateKpi(targetKpi, [dataset], allKpis, depth + 1, nextVisited);
      if (kpiRes.errors.length > 0) {
        errors.push(...kpiRes.errors);
      }
      if (kpiRes.warnings.length > 0) {
        warnings.push(...kpiRes.warnings);
      }
      valuesAndOps.push({ type: 'number', value: kpiRes.rawResult ?? 0 });
    }
  }

  if (errors.length > 0) {
    return { value: null, errors, warnings };
  }

  // 2. Convert Infix to Postfix (Shunting Yard)
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
  };

  const outputQueue: EvaluatedToken[] = [];
  const opStack: string[] = [];

  for (const item of valuesAndOps) {
    if (item.type === 'number') {
      outputQueue.push(item);
    } else if (item.type === 'operator') {
      const op = item.op;
      if (op === '(') {
        opStack.push(op);
      } else if (op === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          outputQueue.push({ type: 'operator', op: opStack.pop()! });
        }
        if (opStack.length > 0 && opStack[opStack.length - 1] === '(') {
          opStack.pop(); // Remove '('
        } else {
          errors.push('Mismatched parentheses in formula');
          return { value: null, errors, warnings };
        }
      } else if (['+', '-', '*', '/'].includes(op)) {
        while (
          opStack.length > 0 &&
          opStack[opStack.length - 1] !== '(' &&
          (precedence[opStack[opStack.length - 1]] || 0) >= (precedence[op] || 0)
        ) {
          outputQueue.push({ type: 'operator', op: opStack.pop()! });
        }
        opStack.push(op);
      }
    }
  }

  while (opStack.length > 0) {
    const topOp = opStack.pop()!;
    if (topOp === '(' || topOp === ')') {
      errors.push('Mismatched parentheses in formula');
      return { value: null, errors, warnings };
    }
    outputQueue.push({ type: 'operator', op: topOp });
  }

  // 3. Evaluate Postfix Expression
  const evalStack: number[] = [];

  for (const item of outputQueue) {
    if (item.type === 'number') {
      evalStack.push(item.value);
    } else if (item.type === 'operator') {
      if (evalStack.length < 2) {
        errors.push('Invalid formula expression structure');
        return { value: null, errors, warnings };
      }
      const b = evalStack.pop()!;
      const a = evalStack.pop()!;

      switch (item.op) {
        case '+':
          evalStack.push(a + b);
          break;
        case '-':
          evalStack.push(a - b);
          break;
        case '*':
          evalStack.push(a * b);
          break;
        case '/':
          if (b === 0) {
            warnings.push('Division by zero encountered; returned 0');
            evalStack.push(0);
          } else {
            evalStack.push(a / b);
          }
          break;
        default:
          errors.push(`Unknown operator '${item.op}'`);
          return { value: null, errors, warnings };
      }
    }
  }

  if (evalStack.length !== 1) {
    errors.push('Invalid formula expression result stack');
    return { value: null, errors, warnings };
  }

  const finalValue = evalStack[0];
  if (isNaN(finalValue) || !isFinite(finalValue)) {
    warnings.push('Formula resulted in non-finite value');
    return { value: 0, errors, warnings };
  }

  return { value: finalValue, errors, warnings };
}

/**
 * Format raw metric value according to KpiFormatConfig
 */
export function formatKpiValue(val: number | null, config: KpiFormatConfig): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
    return 'Needs Attention';
  }

  const symbol = config.currencySymbol || '$';
  const decimals = Math.max(0, Math.min(6, config.decimals ?? 2));

  let displayVal = val;
  let suffix = '';

  if (config.type === 'percentage') {
    // If val is decimal ratio like 0.246, check if it needs to be multiplied by 100
    // Standard rule: if formatting percentage, user value 0.246 becomes 24.6%
    displayVal = val <= 1 && val >= -1 && val !== 0 ? val * 100 : val;
    suffix = '%';
  }

  if (config.compactNotation && Math.abs(displayVal) >= 1000) {
    const abs = Math.abs(displayVal);
    if (abs >= 1000000000) {
      displayVal = displayVal / 1000000000;
      suffix = (config.type === 'percentage' ? '%' : '') + 'B';
    } else if (abs >= 1000000) {
      displayVal = displayVal / 1000000;
      suffix = (config.type === 'percentage' ? '%' : '') + 'M';
    } else if (abs >= 1000) {
      displayVal = displayVal / 1000;
      suffix = (config.type === 'percentage' ? '%' : '') + 'K';
    }
  }

  const formattedNum = displayVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: config.useThousandsSeparator !== false,
  });

  if (config.type === 'currency') {
    return `${symbol}${formattedNum}${suffix}`;
  } else if (config.type === 'percentage') {
    return `${formattedNum}${suffix || '%'}`;
  }

  return `${formattedNum}${suffix}`;
}

/**
 * Summarize formula into readable text string
 */
export function generateFormulaSummary(kpi: KpiDefinition): string {
  if (kpi.metricType === 'simple') {
    const agg = (kpi.aggregation || 'sum').toUpperCase();
    return `${agg}(${kpi.column || 'All Rows'})`;
  }

  if (!kpi.formulaTokens || kpi.formulaTokens.length === 0) {
    return 'No formula defined';
  }

  return kpi.formulaTokens
    .map((t) => {
      if (t.type === 'constant') return String(t.value ?? 0);
      if (t.type === 'operator') return t.operator === '*' ? '×' : t.operator === '/' ? '÷' : t.operator;
      if (t.type === 'term') return `${(t.aggregation || 'sum').toUpperCase()}(${t.column || ''})`;
      if (t.type === 'kpi_ref') return `[KPI: ${t.kpiName || t.kpiId}]`;
      return '';
    })
    .join(' ');
}

/**
 * Central KPI Calculation Engine
 */
export function evaluateKpi(
  kpi: KpiDefinition,
  datasets: Dataset[],
  allKpis: KpiDefinition[] = [],
  depth = 0,
  visitedKpiIds = new Set<string>()
): KpiCalculationResult {
  const startTime = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const formulaSummary = generateFormulaSummary(kpi);

  // 1. Locate Target Dataset
  const dataset = datasets.find((d) => d.id === kpi.datasetId || d.name === kpi.datasetId) || datasets[0];

  if (!dataset) {
    return {
      rawResult: null,
      formattedResult: 'Needs Attention',
      status: 'needs_attention',
      statusReason: `Target dataset ID '${kpi.datasetId}' is not loaded`,
      rowCountEvaluated: 0,
      executionTimeMs: performance.now() - startTime,
      errors: [`Dataset '${kpi.datasetId}' not found`],
      warnings,
      formulaSummary,
    };
  }

  // 2. Validate Column references exist
  const sourceRows = dataset.fullData && dataset.fullData.length > 0 ? dataset.fullData : dataset.data;
  const availableHeaders = new Set(dataset.headers || []);

  if (kpi.metricType === 'simple') {
    if (kpi.aggregation !== 'count' && (!kpi.column || !availableHeaders.has(kpi.column))) {
      return {
        rawResult: null,
        formattedResult: 'Needs Attention',
        status: 'needs_attention',
        statusReason: `Column '${kpi.column || '(unspecified)'}' missing in dataset '${dataset.name}'`,
        rowCountEvaluated: 0,
        executionTimeMs: performance.now() - startTime,
        errors: [`Column '${kpi.column || '(unspecified)'}' missing`],
        warnings,
        formulaSummary,
      };
    }
  } else if (kpi.metricType === 'calculated' && kpi.formulaTokens) {
    for (const t of kpi.formulaTokens) {
      if (t.type === 'term' && t.aggregation !== 'count' && (!t.column || !availableHeaders.has(t.column))) {
        return {
          rawResult: null,
          formattedResult: 'Needs Attention',
          status: 'needs_attention',
          statusReason: `Referenced column '${t.column || '(unspecified)'}' missing in dataset`,
          rowCountEvaluated: 0,
          executionTimeMs: performance.now() - startTime,
          errors: [`Referenced column '${t.column || '(unspecified)'}' missing`],
          warnings,
          formulaSummary,
        };
      }
    }
  }

  // 3. Apply KPI Definition Filters
  const filteredData = filterKpiData(sourceRows, kpi.filters || []);

  // 4. Calculate Raw Numeric Result
  let rawResult: number | null = null;

  if (kpi.metricType === 'simple') {
    rawResult = evaluateSimpleAggregation(filteredData, kpi.column, kpi.aggregation || 'sum');
  } else {
    const evalRes = evaluateFormulaTokens(
      kpi.formulaTokens || [],
      dataset,
      allKpis,
      kpi.filters || [],
      depth,
      visitedKpiIds
    );
    rawResult = evalRes.value;
    errors.push(...evalRes.errors);
    warnings.push(...evalRes.warnings);
  }

  const executionTimeMs = performance.now() - startTime;
  const formattedResult = formatKpiValue(rawResult, kpi.format);

  let status: KpiStatus = 'active';
  let statusReason: string | undefined = undefined;

  if (errors.length > 0) {
    status = 'invalid';
    statusReason = errors.join('; ');
  } else if (warnings.length > 0) {
    statusReason = warnings.join('; ');
  }

  return {
    rawResult,
    formattedResult,
    status,
    statusReason,
    rowCountEvaluated: filteredData.length,
    executionTimeMs,
    errors,
    warnings,
    formulaSummary,
  };
}

/**
 * Validate KPI Definition before saving
 */
export function validateKpiDefinition(
  kpi: Partial<KpiDefinition>,
  datasets: Dataset[],
  allKpis: KpiDefinition[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!kpi.name || !kpi.name.trim()) {
    errors.push('KPI name is required.');
  }

  if (!kpi.datasetId) {
    errors.push('Target dataset must be selected.');
  }

  const dataset = datasets.find((d) => d.id === kpi.datasetId);
  if (!dataset) {
    errors.push('Selected target dataset does not exist.');
  }

  if (kpi.metricType === 'simple') {
    if (kpi.aggregation !== 'count' && !kpi.column) {
      errors.push('Target column must be selected for simple aggregation.');
    }
    if (dataset && kpi.column && !dataset.headers.includes(kpi.column) && kpi.aggregation !== 'count') {
      errors.push(`Column '${kpi.column}' does not exist in target dataset.`);
    }
  } else if (kpi.metricType === 'calculated') {
    if (!kpi.formulaTokens || kpi.formulaTokens.length === 0) {
      errors.push('Formula cannot be empty for calculated metric.');
    } else {
      let parenCount = 0;
      for (const t of kpi.formulaTokens) {
        if (t.type === 'operator') {
          if (t.operator === '(') parenCount++;
          if (t.operator === ')') parenCount--;
        }
      }
      if (parenCount !== 0) {
        errors.push('Formula has unbalanced parentheses.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function findBestHeader(headers: string[], candidates: string[]): string | undefined {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const cand of candidates) {
    const idx = lowerHeaders.findIndex(h => h === cand || h.includes(cand));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

/**
 * Generate standard pre-defined KPIs for a dataset
 */
export function seedStandardKpis(datasetId: string, datasetName: string, headers: string[] = []): KpiDefinition[] {
  const revCol = findBestHeader(headers, ['revenue', 'sales', 'amount', 'total_amount', 'grand_total', 'price']);
  const profitCol = findBestHeader(headers, ['profit', 'margin', 'net_profit', 'gain', 'earnings']);
  const custCol = findBestHeader(headers, ['customer', 'customer_name', 'client', 'user']);
  const orderCol = findBestHeader(headers, ['order id', 'order_id', 'transaction_id', 'invoice_id', 'id']);

  const now = Date.now();

  const standardKpis: KpiDefinition[] = [
    {
      id: `kpi-rev-${datasetId}`,
      name: 'Total Revenue',
      description: 'Sum of all revenue generated across orders',
      datasetId,
      datasetName,
      metricType: 'simple',
      column: revCol || '',
      aggregation: 'sum',
      filters: [],
      format: { type: 'currency', currencySymbol: '$', decimals: 2, useThousandsSeparator: true, compactNotation: false },
      status: revCol ? 'active' : 'needs_attention',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `kpi-profit-${datasetId}`,
      name: 'Total Profit',
      description: 'Sum of gross profit earned',
      datasetId,
      datasetName,
      metricType: 'simple',
      column: profitCol || '',
      aggregation: 'sum',
      filters: [],
      format: { type: 'currency', currencySymbol: '$', decimals: 2, useThousandsSeparator: true, compactNotation: false },
      status: profitCol ? 'active' : 'needs_attention',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `kpi-orders-${datasetId}`,
      name: 'Total Orders',
      description: 'Total number of order transactions processed',
      datasetId,
      datasetName,
      metricType: 'simple',
      column: orderCol || headers[0] || '',
      aggregation: 'count',
      filters: [],
      format: { type: 'number', decimals: 0, useThousandsSeparator: true, compactNotation: false },
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `kpi-cust-${datasetId}`,
      name: 'Unique Customers',
      description: 'Count of distinct customer entities',
      datasetId,
      datasetName,
      metricType: 'simple',
      column: custCol || '',
      aggregation: 'distinct_count',
      filters: [],
      format: { type: 'number', decimals: 0, useThousandsSeparator: true, compactNotation: false },
      status: custCol ? 'active' : 'needs_attention',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `kpi-avg-rev-${datasetId}`,
      name: 'Average Revenue',
      description: 'Average revenue value per order transaction',
      datasetId,
      datasetName,
      metricType: 'simple',
      column: revCol || '',
      aggregation: 'avg',
      filters: [],
      format: { type: 'currency', currencySymbol: '$', decimals: 2, useThousandsSeparator: true, compactNotation: false },
      status: revCol ? 'active' : 'needs_attention',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `kpi-margin-${datasetId}`,
      name: 'Profit Margin',
      description: 'Ratio of Total Profit to Total Revenue (SUM(Profit) / SUM(Revenue))',
      datasetId,
      datasetName,
      metricType: 'calculated',
      formulaTokens: [
        { id: 't1', type: 'term', aggregation: 'sum', column: profitCol || '' },
        { id: 't2', type: 'operator', operator: '/' },
        { id: 't3', type: 'term', aggregation: 'sum', column: revCol || '' },
      ],
      filters: [],
      format: { type: 'percentage', decimals: 1, useThousandsSeparator: true, compactNotation: false },
      status: (profitCol && revCol) ? 'active' : 'needs_attention',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `kpi-rev-cust-${datasetId}`,
      name: 'Revenue per Customer',
      description: 'Total Revenue divided by Unique Customers (SUM(Revenue) / DISTINCT_COUNT(Customer))',
      datasetId,
      datasetName,
      metricType: 'calculated',
      formulaTokens: [
        { id: 't1', type: 'term', aggregation: 'sum', column: revCol || '' },
        { id: 't2', type: 'operator', operator: '/' },
        { id: 't3', type: 'term', aggregation: 'distinct_count', column: custCol || '' },
      ],
      filters: [],
      format: { type: 'currency', currencySymbol: '$', decimals: 2, useThousandsSeparator: true, compactNotation: false },
      status: (revCol && custCol) ? 'active' : 'needs_attention',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return standardKpis;
}
