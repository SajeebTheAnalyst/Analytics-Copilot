import { GoogleGenAI } from '@google/genai';
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

  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

  const systemInstruction = `You are AI Analyst Copilot, a senior B2B analytics copilot assisting enterprise users.

CRITICAL ANTI-HALLUCINATION & DETERMINISTIC RULES:
1. NEVER invent, fabricate, or recalculate numeric values. You must strictly use the calculated facts provided in DETERMINISTIC_EVIDENCE below.
2. CAUSATION GUARDRAIL: When explaining changes, trends, or performance differences, DO NOT claim direct causation unless explicitly proven. Use non-causal correlation wording such as "coincided with", "associated with", "may indicate", or "possible contributor".
3. STATUS REASONING: If a KPI status is "Needs Attention" or "Invalid", explain the underlying data issue clearly rather than fabricating a result.
4. FORMATTING: Use clean markdown sections:
   - **Answer**: Clear, direct, concise answer containing exact figures from the evidence.
   - **Key Findings**: Structured bullet points with exact metrics and comparisons.
   - **Interpretation**: Contextual business insights.
   - **Recommended Action**: Actionable next step or follow-up recommendation.

5. ACTIONABLE CLEANING: If the DETERMINISTIC_EVIDENCE contains a 'cleaningAction' field, you MUST mention that you have prepared a preview of the requested changes. Explicitly ask the user to "Confirm and Apply" the changes using the provided action card.

DETERMINISTIC_EVIDENCE_CALCULATED_BY_APPLICATION:
${JSON.stringify(evidence || { note: 'No specific analytical query matched. Default workspace metadata applied.' }, null, 2)}

WORKSPACE METADATA:
${JSON.stringify(metadata, null, 2)}`;

  // 1. Client-side Gemini call if client API key is configured
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const contents = [
        ...history.slice(-8).map(h => `${h.role === 'assistant' ? 'Model' : 'User'}: ${h.text}`),
        `User: ${message}`
      ].join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemInstruction + '\n\n' + contents,
      });

      if (response && response.text) {
        return { text: response.text, evidence, source: 'client_gemini' };
      }
    } catch (err) {
      console.warn('Client-side Gemini call failed, attempting server proxy fallback...', err);
    }
  }

  // 2. Server proxy `/api/chat` call
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text })),
        metadata,
        evidence
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.text) {
        return { text: data.text, evidence, source: 'server' };
      }
    }
  } catch (e) {
    console.warn('/api/chat unreachable, using deterministic local engine fallback', e);
  }

  // 3. Intelligent Local Fallback Engine (0 502 errors)
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
