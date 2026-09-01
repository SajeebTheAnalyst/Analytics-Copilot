import { Dataset, Dashboard, RelationshipSuggestion, DashboardPlan } from '@/types';
import { generateAnalyticsEvidence, AnalyticalEvidence } from './copilotAnalyticsEngine';

export interface CopilotResponse {
  text: string;
  evidence?: AnalyticalEvidence | null;
  source: 'server' | 'client_gemini' | 'local_engine';
}

export async function queryCopilot(
  message: string,
  history: { role: string; text: string }[],
  metadata: any,
  datasets: Dataset[],
  dashboards: Dashboard[] = [],
  activeDashboardId?: string | null
): Promise<CopilotResponse> {
  const primaryDataset = datasets[0] || null;

  // 0. GENERATE DETERMINISTIC EVIDENCE FIRST
  const evidence = await generateAnalyticsEvidence(
    message,
    history,
    primaryDataset,
    dashboards,
    activeDashboardId
  );

  // Always use the server proxy `/api/chat` call
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text })),
        metadata,
        // Only send evidence to the AI if it's an actual computation, not just a "don't compute" note.
        evidence: evidence?.note ? null : evidence
      })
    });

    const contentType = res.headers.get('content-type');
    if (!res.ok) {
      let errorMessage = `Server error (${res.status})`;
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        const error = new Error(errorMessage);
        (error as any).code = errorData.code;
        (error as any).details = errorData.details;
        throw error;
      } else {
        const text = await res.text();
        if (text.length > 0 && text.length < 500) {
          errorMessage = `AI Service Error: ${text}`;
        } else if (text.includes('Runtime.ImportModuleError')) {
          errorMessage = "AI Service failed to load a required module (ImportModuleError). This is usually a deployment configuration issue.";
        }
        throw new Error(errorMessage);
      }
    }

    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.text) {
        return { text: data.text, evidence, source: 'server' };
      }
      throw new Error('Incomplete response from AI service');
    } else {
      throw new Error('AI service returned an unexpected response format (not JSON)');
    }
  } catch (e: any) {
    console.warn('/api/chat error', e);
    // Propagate all errors to UI so user can see the real reason
    throw e;
  }

  // 3. Intelligent Local Fallback Engine (for safety)
  return {
    text: generateFallbackText(message, evidence, primaryDataset),
    evidence,
    source: 'local_engine'
  };
}

function generateFallbackText(message: string, evidence: AnalyticalEvidence | null, dataset: Dataset | null): string {
  if (!dataset) {
    return "Please import a dataset first so I can analyze your data.";
  }

  if (evidence) {
    if (evidence.intent === 'NAVIGATION' && evidence.navigationTarget) {
      return `I can help you navigate to the **${evidence.navigationTarget.replace(/-/g, ' ')}** section. Click the action card below to switch views.`;
    }

    if (evidence.intent === 'ACTION_KPI_CREATE' && evidence.kpiCreation) {
      const k = evidence.kpiCreation;
      return `I have prepared a new KPI for **${k.name}**.
      
- **Metric**: ${k.column}
- **Aggregation**: ${k.aggregation.toUpperCase()}
- **Description**: ${k.description}

**Recommended Action**: Review the card below and click **"Create KPI"** to add it to your library.`;
    }

    if (evidence.intent === 'ACTION_PLAN' && evidence.actionPlan) {
      const p = evidence.actionPlan;
      return `### Proposed Action Plan: **${p.title}**

I have analyzed your request and orchestrated a deterministic workflow to fulfill it.

**Workflow Steps**:
${p.steps.map((s, i) => `${i + 1}. **${s.label}**`).join('\n')}

**Safety Check**: These actions will be executed sequentially using our existing cleaning and analytics engines. Click **"Execute Action Plan"** to begin.`;
    }

    if (evidence.intent === 'ACTIONABLE_CLEANING' && evidence.cleaningAction) {
      const a = evidence.cleaningAction;
      return `### Actionable Cleaning: **${a.description}**
      
I have identified the requested operation for the **${a.column}** column.

- **Operation**: ${a.actionType.toUpperCase()}
- **Target Column**: ${a.column}
- **Affected Rows**: ${a.affectedRowCount.toLocaleString()}

**Recommended Action**: Review the preview card below and click **"Confirm and Apply"** to execute the change and update the audit trail.`;
    }

    if (evidence.intent === 'DATA_QUALITY' && evidence.qualityDetails) {
      const q = evidence.qualityDetails;
      return `### Data Health Assessment for **${evidence.datasetName}**

- **Health Score**: **${q.healthScore}%**
- **Total Rows**: ${q.totalRows.toLocaleString()}
- **Missing Data Cells**: ${q.missingCount.toLocaleString()} (${q.missingPercent}%)
- **Duplicate Records**: ${q.duplicateCount}
- **Pending Cleaning Issues**: ${q.pendingIssuesCount}

**Recommended Action**: Review pending quality issues in the **Data Cleaning** tab before running downstream reporting.`;
    }

    if (evidence.intent === 'KPI' && evidence.kpiDetails) {
      return `### Saved KPI Evaluation for **${evidence.datasetName}**

${evidence.kpiDetails.map(k => `- **${k.name}**: **${k.formattedValue}** (Formula: \`${k.formula}\` | Status: *${k.status}*${k.statusReason ? ` - ${k.statusReason}` : ''})`).join('\n')}

**Recommended Action**: Keep monitoring KPIs with status *Needs Attention* or *Invalid* for formula correction or null values.`;
    }

    if (evidence.intent === 'COLUMN' && evidence.columnDetails) {
      const c = evidence.columnDetails;
      return `### Field Metadata for **[${c.columnName}]**

- **Technical Type**: \`${c.technicalType}\`
- **Semantic Type**: \`${c.semanticType}\`
- **Description**: ${c.description}
- **Data Completeness**: **${c.completenessPercent.toFixed(1)}%** (${c.nullCount} missing values)
- **Unique Cardinality**: ${c.uniqueCount} distinct values
- **Sample Values**: \`${c.sampleValues.join('`, `')}\`

**Recommended Action**: You can edit or enrich semantic tags and descriptions in the **Data Dictionary** tab.`;
    }

    if (evidence.rows && evidence.rows.length > 0) {
      const topRow = evidence.rows[0];
      const keys = Object.keys(topRow);
      return `### Calculated Analysis for **${evidence.datasetName}**

**${evidence.title}**

${evidence.summaryText ? `- **Summary**: ${evidence.summaryText}\n` : ''}
#### Breakdown (Top Records):
| ${keys.join(' | ')} |
| ${keys.map(() => '---').join(' | ')} |
${evidence.rows.slice(0, 5).map(r => `| ${keys.map(k => r[k] ?? 'N/A').join(' | ')} |`).join('\n')}

**Key Finding**: The data shows a clear distribution across top categories with **${topRow[keys[0]]}** recording the highest metric.

**Recommended Action**: Would you like me to add this breakdown directly as a chart widget to your active dashboard?`;
    }
  }

  return `I have indexed **${dataset.name}** (${dataset.rowCount.toLocaleString()} rows, ${dataset.headers.length} columns). Ask me about totals, top performers, data quality, KPIs, or dashboards!`;
}
