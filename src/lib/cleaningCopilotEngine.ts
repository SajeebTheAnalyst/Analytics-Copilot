import { Dataset } from '@/types';
import { DatasetQualityReport, QualityIssue } from './qualityScanner';
import { CleaningActionType, CleaningHistoryItem } from './manualCleaningEngine';

export interface CleaningRecommendation {
  id: string;
  actionType: CleaningActionType;
  column?: string;
  title: string;
  explanation: string;
  variations?: string[];
  affectedRowsCount?: number;
  affectedCellsCount?: number;
}

export interface CleaningCopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  recommendations?: CleaningRecommendation[];
  isFallback?: boolean;
  errorNote?: string;
}

export interface CleaningCopilotContext {
  datasetName: string;
  totalRows: number;
  totalColumns: number;
  headers: string[];
  qualityScore: number;
  totalIssues: number;
  criticalIssuesCount: number;
  warningIssuesCount: number;
  issuesByCategory: Record<string, number>;
  topIssues: {
    id: string;
    category: string;
    severity: string;
    column?: string;
    title: string;
    whatIsWrong: string;
    affectedRowsCount: number;
    affectedValues: string[];
    suggestedAction: string;
  }[];
  columnProfiles: Record<string, {
    detectedType: string;
    missingPercentage: number;
    uniqueCount: number;
    issueCount: number;
  }>;
  formulaColumns: string[];
  recentCleaningHistory: {
    actionName: string;
    target: string;
    rowsAffected: number;
    cellsAffected: number;
  }[];
}

/**
 * Constructs grounded context object from active dataset state & Phase 8I quality scan
 */
export function buildCleaningCopilotContext(
  dataset: Dataset,
  workingData: Record<string, any>[] | undefined,
  workingHeaders: string[] | undefined,
  qualityReport: DatasetQualityReport,
  workingFormulas?: Record<string, string>,
  cleaningHistory?: CleaningHistoryItem[]
): CleaningCopilotContext {
  const headers = workingHeaders || dataset.headers || [];
  const rows = workingData || [];
  const totalRows = rows.length > 0 ? rows.length : dataset.rowCount;

  const issuesByCategory: Record<string, number> = {};
  Object.entries(qualityReport.issuesByCategory || {}).forEach(([cat, list]) => {
    if (list && list.length > 0) {
      issuesByCategory[cat] = list.length;
    }
  });

  const topIssues = (qualityReport.allIssues || []).slice(0, 15).map(issue => ({
    id: issue.id,
    category: issue.category,
    severity: issue.severity,
    column: issue.column,
    title: issue.title,
    whatIsWrong: issue.whatIsWrong,
    affectedRowsCount: issue.affectedRowsCount,
    affectedValues: issue.affectedValues || [],
    suggestedAction: issue.suggestedAction,
  }));

  const columnProfiles: Record<string, {
    detectedType: string;
    missingPercentage: number;
    uniqueCount: number;
    issueCount: number;
  }> = {};

  Object.entries(qualityReport.columnProfiles || {}).forEach(([col, prof]) => {
    columnProfiles[col] = {
      detectedType: String(prof.detectedType),
      missingPercentage: Math.round(prof.missingPercentage * 10) / 10,
      uniqueCount: prof.uniqueCount,
      issueCount: prof.issueCount,
    };
  });

  const formulaColumns = workingFormulas ? Object.keys(workingFormulas) : [];

  const recentCleaningHistory = (cleaningHistory || []).slice(-5).map(item => ({
    actionName: item.actionName,
    target: item.target,
    rowsAffected: item.rowsAffected,
    cellsAffected: item.cellsAffected,
  }));

  return {
    datasetName: dataset.name || 'Dataset',
    totalRows,
    totalColumns: headers.length,
    headers,
    qualityScore: qualityReport.overallScore,
    totalIssues: qualityReport.totalIssues,
    criticalIssuesCount: qualityReport.criticalIssuesCount,
    warningIssuesCount: qualityReport.warningIssuesCount,
    issuesByCategory,
    topIssues,
    columnProfiles,
    formulaColumns,
    recentCleaningHistory,
  };
}

/**
 * Sends user prompt and grounded context to backend AI Copilot endpoint /api/cleaning-copilot
 * with fallback to local grounded generation if API call fails or key is missing.
 */
export async function queryCleaningCopilot(
  message: string,
  history: CleaningCopilotMessage[],
  context: CleaningCopilotContext
): Promise<CleaningCopilotMessage> {
  const formattedHistory = history.map(m => ({
    role: m.role,
    content: m.text,
  }));

  try {
    const response = await fetch('/api/cleaning-copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: formattedHistory,
        context,
      }),
    });

    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMsg = errorData.message || errorData.error || errorMsg;
      } else {
        const textText = await response.text();
        if (textText) errorMsg = textText.substring(0, 200);
      }

      console.warn('[AI_CLEANING_COPILOT] API returned error, activating grounded local fallback:', errorMsg);
      return generateLocalGroundedResponse(message, context, errorMsg);
    }

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();

      if (data && data.answer) {
        const recommendations: CleaningRecommendation[] = (data.recommendations || []).map((rec: any, idx: number) => ({
          id: rec.id || `rec-${Date.now()}-${idx}`,
          actionType: mapToCleaningActionType(rec.actionType),
          column: rec.column,
          title: rec.title || 'Recommended Cleaning Action',
          explanation: rec.explanation || '',
          variations: Array.isArray(rec.variations) ? rec.variations : undefined,
          affectedRowsCount: rec.affectedRowsCount,
          affectedCellsCount: rec.affectedCellsCount,
        }));

        return {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          text: data.answer,
          timestamp: new Date(),
          recommendations: recommendations.length > 0 ? recommendations : undefined,
        };
      }
    }

    throw new Error('Invalid JSON format from AI server');
  } catch (err: any) {
    console.warn('[AI_CLEANING_COPILOT] Network or execution error, using grounded local response:', err.message);
    return generateLocalGroundedResponse(message, context, err.message);
  }
}
/**
 * Analyzes dataset suitability for various workspaces
 */
function analyzeSuitability(context: CleaningCopilotContext): string {
  const numericCols = Object.entries(context.columnProfiles)
    .filter(([_, prof]) => prof.detectedType === 'numeric')
    .map(([col]) => col);
  const temporalCols = Object.entries(context.columnProfiles)
    .filter(([_, prof]) => prof.detectedType === 'date' || prof.detectedType === 'datetime')
    .map(([col]) => col);
  
  let analysis = '### Workspace Suitability Analysis\n\n';
  
  const suitableForKpi = numericCols.length > 0 && temporalCols.length > 0;
  analysis += `- **KPI Builder**: ${suitableForKpi ? '✅ Suitable' : '⚠️ Requires at least one numeric measure and one temporal dimension'}\n`;
  analysis += `- **Dashboard**: ${context.totalColumns > 3 ? '✅ Suitable' : '⚠️ Consider adding more dimensions'}\n`;
  analysis += `- **Data Explorer**: ✅ Highly Suitable\n`;
  analysis += `- **MIS Report**: ${context.qualityScore >= 80 ? '✅ Suitable' : '⚠️ Requires higher quality score (>80)'}\n`;
  
  return analysis;
}
function mapToCleaningActionType(rawAction: string): CleaningActionType {
  const normalized = (rawAction || '').toLowerCase().trim();

  if (normalized.includes('trim') || normalized.includes('whitespace')) return 'trim_whitespace';
  if (normalized.includes('cap') || normalized.includes('case') || normalized.includes('title')) return 'text_capitalization';
  if (normalized.includes('find') || normalized.includes('replace')) return 'find_replace';
  if (normalized.includes('merge') || normalized.includes('similar') || normalized.includes('categorical') || normalized.includes('variation')) return 'merge_categorical';
  if (normalized.includes('duplicate')) return 'remove_duplicates';
  if (normalized.includes('empty_row') || normalized.includes('blank_row')) return 'remove_empty_rows';
  if (normalized.includes('fill') || normalized.includes('missing') || normalized.includes('null')) return 'fill_missing';
  if (normalized.includes('clear')) return 'clear_cells';
  if (normalized.includes('delete') || normalized.includes('drop')) return 'delete_columns';

  return 'trim_whitespace';
}

/**
 * Deterministic, grounded local response generator based directly on Phase 8I quality scanner context
 */
function generateLocalGroundedResponse(
  userQuery: string,
  context: CleaningCopilotContext,
  errorNote?: string
): CleaningCopilotMessage {
  const queryLower = userQuery.toLowerCase();
  const recommendations: CleaningRecommendation[] = [];

  let responseMarkdown = '';

  // 1. Check for specific column mention
  const mentionedColumn = context.headers.find(h => queryLower.includes(h.toLowerCase()));

  // 2. Query Intent Classification
  if (queryLower.includes('mis') || queryLower.includes('ready') || queryLower.includes('report') || queryLower.includes('analysis')) {
    // MIS Readiness & Suitability query
    const isReady = context.qualityScore >= 90 && context.criticalIssuesCount === 0;
    
    responseMarkdown = `### MIS Report Readiness Assessment for **${context.datasetName}**\n\n`;
    responseMarkdown += `**Current Quality Score**: **${context.qualityScore}/100** ${isReady ? '✅ Ready' : '⚠️ Action Required'}\n\n`;
    
    // Readiness Breakdown
    responseMarkdown += `#### **Readiness Breakdown**:\n`;
    responseMarkdown += `- **Critical Quality Blockers**: **${context.criticalIssuesCount}** critical issue(s)\n`;
    responseMarkdown += `- **Moderate Warnings**: **${context.warningIssuesCount}** warning(s)\n`;
    
    const missingCats = Object.entries(context.issuesByCategory);
    if (missingCats.length > 0) {
      responseMarkdown += `\n**Top Issues by Category**:\n`;
      missingCats.forEach(([cat, count]) => {
        responseMarkdown += `  - **${cat}**: ${count} issue(s)\n`;
      });
    }
    
    responseMarkdown += `\n${analyzeSuitability(context)}\n`;

    if (isReady) {
      responseMarkdown += `\n**Verdict**: This dataset demonstrates high overall cleanliness and consistency suitable for executive MIS reporting.`;
    } else {
      responseMarkdown += `\n**Verdict**: **Not fully clean yet.** Please resolve the recommended cleaning operations below to standardize records before export.`;
    }

  } else if (mentionedColumn) {
    // Column-specific query
    const profile = context.columnProfiles[mentionedColumn];
    const columnIssues = context.topIssues.filter(i => i.column === mentionedColumn);

    responseMarkdown = `### Quality Profile for Column **[${mentionedColumn}]**\n\n`;
    responseMarkdown += `**Technical Summary**:\n`;
    responseMarkdown += `- **Inferred Data Type**: \`${profile?.detectedType || 'Text'}\`\n`;
    responseMarkdown += `- **Data Completeness**: **${100 - (profile?.missingPercentage || 0)}%** (${profile?.missingPercentage}% missing)\n`;
    responseMarkdown += `- **Unique Values**: ${profile?.uniqueCount || 0} distinct entries\n`;
    responseMarkdown += `- **Total Column Issues**: **${columnIssues.length}** detected issue(s)\n\n`;

    if (columnIssues.length > 0) {
      responseMarkdown += `#### **Evidence & Specific Issues**:\n`;
      columnIssues.forEach(iss => {
        responseMarkdown += `- **${iss.title}**: ${iss.whatIsWrong}\n`;
        if (iss.affectedValues && iss.affectedValues.length > 0) {
          responseMarkdown += `  - *Sample Affected Values*: \`${iss.affectedValues.join('`, `')}\` (${iss.affectedRowsCount} rows affected)\n`;
        }
      });
    } else {
      responseMarkdown += `No critical quality defects detected in this column.`;
    }

  } else if (queryLower.includes('wrong') || queryLower.includes('issue') || queryLower.includes('problem')) {
    // What is wrong query
    responseMarkdown = `### Data Quality Assessment for **${context.datasetName}**\n\n`;
    responseMarkdown += `**Quality Score**: **${context.qualityScore}/100** (${context.totalIssues} total issues across ${context.totalRows.toLocaleString()} rows)\n\n`;
    responseMarkdown += `#### **Key Evidence & Defects Detected**:\n`;

    if (context.topIssues.length === 0) {
      responseMarkdown += `No quality issues were detected in this dataset. It appears clean and well-structured!\n`;
    } else {
      context.topIssues.slice(0, 5).forEach((iss, idx) => {
        responseMarkdown += `${idx + 1}. **${iss.title}** ${iss.column ? `(Column: \`${iss.column}\`)` : ''}\n`;
        responseMarkdown += `   - *Evidence*: ${iss.whatIsWrong}\n`;
        if (iss.affectedValues && iss.affectedValues.length > 0) {
          responseMarkdown += `   - *Affected Sample*: \`${iss.affectedValues.join('`, `')}\` (${iss.affectedRowsCount} rows)\n`;
        }
      });
    }

  } else {
    // General overview / how should I clean
    responseMarkdown = `### AI Data Cleaning Strategy for **${context.datasetName}**\n\n`;
    responseMarkdown += `I have analyzed your dataset (**${context.totalRows.toLocaleString()}** rows, **${context.totalColumns}** columns).\n\n`;
    responseMarkdown += `**Current Quality Health Score**: **${context.qualityScore}/100**\n\n`;
    
    if (context.topIssues.length === 0) {
      responseMarkdown += `✅ The dataset appears clean. No major issues detected.`;
    } else {
      responseMarkdown += `#### **Recommended Cleaning Plan**:\n\n`;
      context.topIssues.slice(0, 5).forEach((iss, idx) => {
        responseMarkdown += `${idx + 1}. **${iss.column || 'Dataset'}**: ${iss.title}\n`;
        responseMarkdown += `   - *Why it matters*: ${iss.whatIsWrong}\n`;
      });
      responseMarkdown += `\nI recommend resolving these issues using the deterministic actions below.`;
    }
  }

  // Generate Recommendations corresponding to top issues
  const relevantIssues = mentionedColumn 
    ? context.topIssues.filter(i => i.column === mentionedColumn)
    : context.topIssues;

  relevantIssues.forEach((issue, idx) => {
    let actType: CleaningActionType | null = null;
    let recTitle = issue.title;

    if (issue.title.toLowerCase().includes('whitespace')) {
      actType = 'trim_whitespace';
      recTitle = `Trim Whitespace in ${issue.column || 'Dataset'}`;
    } else if (issue.category === 'Duplicates' || issue.title.toLowerCase().includes('duplicate')) {
      actType = 'remove_duplicates';
      recTitle = 'Remove Duplicate Rows';
    } else if (issue.category === 'Missing Data') {
      actType = 'fill_missing';
      recTitle = `Fill Missing Values in ${issue.column || 'Columns'}`;
    } else if (issue.title.toLowerCase().includes('similar') || issue.title.toLowerCase().includes('casing') || issue.category === 'Inconsistent Values') {
      actType = 'merge_categorical';
      recTitle = `Merge Inconsistent Variations in ${issue.column || 'Categorical Field'}`;
    } else if (issue.title.toLowerCase().includes('empty rows')) {
      actType = 'remove_empty_rows';
      recTitle = 'Remove Completely Blank Rows';
    } else if (issue.category === 'Formatting') {
      actType = 'text_capitalization';
      recTitle = `Standardize Casing in ${issue.column || 'Text Fields'}`;
    } else if (issue.title.toLowerCase().includes('constant')) {
      actType = 'delete_columns';
      recTitle = `Delete Uninformative Column ${issue.column}`;
    }

    if (actType) {
      recommendations.push({
        id: `rec-local-${Date.now()}-${idx}`,
        actionType: actType,
        column: issue.column,
        title: recTitle,
        explanation: `${issue.whatIsWrong} (${issue.affectedRowsCount} rows affected). Suggested action: ${issue.suggestedAction}`,
        variations: issue.affectedValues,
        affectedRowsCount: issue.affectedRowsCount,
        affectedCellsCount: issue.affectedRowsCount,
      });
    }
  });

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    text: responseMarkdown,
    timestamp: new Date(),
    recommendations: recommendations.length > 0 ? recommendations : undefined,
    isFallback: true,
    errorNote: errorNote ? `Note: Server AI key error (${errorNote}). Utilizing grounded Phase 8I deterministic scanner context.` : undefined,
  };
}
