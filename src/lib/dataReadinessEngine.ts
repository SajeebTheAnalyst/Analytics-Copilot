import { Dataset } from '@/types';
import { scanDatasetQuality, DatasetQualityReport, QualityIssue } from './qualityScanner';
import { CleaningActionType } from './manualCleaningEngine';
import { tokenizeFormula } from './formulaEngine';

export type ReadinessStatus = 'READY' | 'NEEDS_CLEANING' | 'BLOCKED';

export interface ReadinessBlockingReason {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  column?: string;
  affectedRowsCount: number;
  affectedCellsCount?: number;
  sampleValues?: string[];
  suggestedAction: string;
  actionType?: CleaningActionType;
}

export interface ValidatedDatasetSnapshot {
  datasetId: string;
  datasetName: string;
  headers: string[];
  data: Record<string, any>[];
  columnTypes: Record<string, string>;
  formulaDefinitions?: Record<string, string>;
  validationTimestamp: Date;
  qualityScore: number;
  readinessStatus: ReadinessStatus;
}

export interface ReadinessEvaluation {
  status: ReadinessStatus;
  qualityScore: number;
  totalRows: number;
  totalColumns: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  infoIssuesCount: number;
  affectedRowsCount: number;
  affectedColumnsCount: number;
  blockingReasons: ReadinessBlockingReason[];
  summaryMessage: string;
  snapshot: ValidatedDatasetSnapshot | null;
}

/**
 * Deterministically evaluates data readiness for MIS reporting / dashboard generation.
 * NEVER uses AI to decide dataset readiness.
 */
export function evaluateDataReadiness(
  dataset: Dataset,
  workingData?: Record<string, any>[],
  workingHeaders?: string[],
  workingFormulas?: Record<string, string>
): ReadinessEvaluation {
  const data = workingData || dataset.data || dataset.fullData || [];
  const headers = workingHeaders || dataset.headers || [];
  const formulas = workingFormulas || dataset.formulas || {};

  const totalRows = data.length;
  const totalColumns = headers.length;

  // 1. Run Phase 8I Quality Scanner
  const qualityReport: DatasetQualityReport = scanDatasetQuality(dataset, data);

  const blockingReasons: ReadinessBlockingReason[] = [];
  const affectedRowIndices = new Set<number>();
  const affectedHeaderSet = new Set<string>();

  // Helper to map QualityIssue category to Phase 8J CleaningActionType
  function mapIssueToActionType(issue: QualityIssue): CleaningActionType | undefined {
    const titleLower = issue.title.toLowerCase();
    if (titleLower.includes('whitespace')) return 'trim_whitespace';
    if (titleLower.includes('duplicate') || issue.category === 'Duplicates') return 'remove_duplicates';
    if (titleLower.includes('missing') || issue.category === 'Missing Data') return 'fill_missing';
    if (titleLower.includes('casing') || titleLower.includes('similar') || issue.category === 'Inconsistent Values') return 'merge_categorical';
    if (titleLower.includes('empty rows')) return 'remove_empty_rows';
    if (titleLower.includes('constant') || titleLower.includes('empty column')) return 'delete_columns';
    if (issue.category === 'Formatting') return 'text_capitalization';
    return undefined;
  }

  // 2. Process Phase 8I quality scanner issues
  qualityReport.allIssues.forEach((issue) => {
    if (issue.column) affectedHeaderSet.add(issue.column);

    const actionType = mapIssueToActionType(issue);

    blockingReasons.push({
      id: issue.id,
      category: issue.category,
      severity: issue.severity,
      title: issue.title,
      description: issue.whatIsWrong,
      column: issue.column,
      affectedRowsCount: issue.affectedRowsCount,
      sampleValues: issue.affectedValues,
      suggestedAction: issue.suggestedAction,
      actionType,
    });
  });

  // 3. Formula Error Validation
  const formulaCols = Object.keys(formulas);
  if (formulaCols.length > 0) {
    formulaCols.forEach((fCol) => {
      const formulaStr = formulas[fCol];
      if (!formulaStr) return;

      // Tokenize formula check
      const tokRes = tokenizeFormula(formulaStr, headers);
      if (tokRes.error) {
        affectedHeaderSet.add(fCol);
        blockingReasons.push({
          id: `formula-syntax-err-${fCol}`,
          category: 'Type Problems',
          severity: 'critical',
          title: `Syntax Error in Formula Column "${fCol}"`,
          description: `Formula expression \`${formulaStr}\` contains a syntax error: ${tokRes.error}`,
          column: fCol,
          affectedRowsCount: totalRows,
          suggestedAction: 'Fix formula syntax or recalculate calculated column',
        });
      }

      // Check cell evaluation outputs
      let errorCellCount = 0;
      const sampleErrVals: string[] = [];

      data.forEach((row, rowIdx) => {
        const val = row[fCol];
        if (
          val === undefined ||
          val === null ||
          val === 'NaN' ||
          val === 'Infinity' ||
          val === '-Infinity' ||
          (typeof val === 'number' && (isNaN(val) || !isFinite(val))) ||
          (typeof val === 'string' && (val.startsWith('#') || val.includes('ERR')))
        ) {
          errorCellCount++;
          affectedRowIndices.add(rowIdx);
          if (sampleErrVals.length < 5) {
            sampleErrVals.push(String(val));
          }
        }
      });

      if (errorCellCount > 0) {
        affectedHeaderSet.add(fCol);
        blockingReasons.push({
          id: `formula-calc-err-${fCol}`,
          category: 'Type Problems',
          severity: 'critical',
          title: `Calculation Errors in Column "${fCol}"`,
          description: `${errorCellCount} rows in calculated column "${fCol}" evaluated to formula errors (#ERROR!, NaN, or Infinity).`,
          column: fCol,
          affectedRowsCount: errorCellCount,
          affectedCellsCount: errorCellCount,
          sampleValues: sampleErrVals,
          suggestedAction: 'Review formula references or fill default values for missing variables',
        });
      }
    });
  }

  // 4. Summarize severity counts
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  blockingReasons.forEach((br) => {
    if (br.severity === 'critical') criticalCount++;
    else if (br.severity === 'warning') warningCount++;
    else infoCount++;
  });

  // Calculate overall score (formula issues add severe penalty)
  let formulaPenalty = formulaCols.length > 0 ? (blockingReasons.filter(r => r.id.startsWith('formula-')).length * 20) : 0;
  const finalQualityScore = Math.max(0, Math.min(100, Math.round(qualityReport.overallScore - formulaPenalty)));

  // 5. Determine Readiness Status
  let status: ReadinessStatus = 'READY';

  if (criticalCount > 0 || finalQualityScore < 70 || totalRows === 0 || totalColumns === 0) {
    status = 'BLOCKED';
  } else if (warningCount > 0 || finalQualityScore < 85) {
    status = 'NEEDS_CLEANING';
  } else {
    status = 'READY';
  }

  // 6. Generate summary message
  let summaryMessage = '';
  if (status === 'READY') {
    summaryMessage = `Dataset "${dataset.name || 'Dataset'}" passed deterministic quality gate (${finalQualityScore}/100 score). All records are clean and structured for executive reporting.`;
  } else if (status === 'NEEDS_CLEANING') {
    summaryMessage = `${warningCount} warning issue(s) detected. Dataset quality score is ${finalQualityScore}/100. Minor cleaning recommended before reporting.`;
  } else {
    summaryMessage = `BLOCKED: ${criticalCount} critical issue(s) remain unaddressed. Resolving critical defects is required before proceeding to reporting.`;
  }

  // 7. Create Clean Data Snapshot if READY or requested
  const snapshot: ValidatedDatasetSnapshot | null = status === 'READY' ? {
    datasetId: dataset.id,
    datasetName: dataset.name || 'Validated Dataset',
    headers: [...headers],
    data: [...data],
    columnTypes: dataset.columnTypes ? { ...dataset.columnTypes } : {},
    formulaDefinitions: { ...formulas },
    validationTimestamp: new Date(),
    qualityScore: finalQualityScore,
    readinessStatus: status,
  } : null;

  return {
    status,
    qualityScore: finalQualityScore,
    totalRows,
    totalColumns,
    criticalIssuesCount: criticalCount,
    warningIssuesCount: warningCount,
    infoIssuesCount: infoCount,
    affectedRowsCount: affectedRowIndices.size,
    affectedColumnsCount: affectedHeaderSet.size,
    blockingReasons,
    summaryMessage,
    snapshot,
  };
}
