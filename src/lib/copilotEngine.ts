import { GoogleGenAI } from '@google/genai';
import { Dataset, Dashboard, RelationshipSuggestion, DashboardPlan } from '@/types';
import { executeAnalysis } from './analyticsEngine';

export interface CopilotResponse {
  text: string;
  source: 'server' | 'client_gemini' | 'local_engine';
}

export async function queryCopilot(
  message: string,
  history: { role: string; text: string }[],
  metadata: any,
  datasets: Dataset[]
): Promise<CopilotResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');

  // 1. First, if client API key is available, attempt direct client-side Gemini call
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are Analytics Copilot, an expert AI data analyst and business intelligence assistant.
You have access to the user's workspace metadata below.

AVAILABLE WORKSPACE METADATA:
${JSON.stringify(metadata, null, 2)}

INSTRUCTIONS:
1. Provide concise, clear, and professional data analytics guidance.
2. If the user asks for a dashboard, chart, or analysis, you CAN output structured JSON blocks alongside markdown:
   - Dashboard Plan block format:
   \`\`\`json
   {
     "_dashboardPlan": {
       "title": "Executive Sales Dashboard",
       "kpis": [{ "title": "Total Revenue", "datasetId": "ds-1", "yAxisColumn": "sales", "aggregation": "sum" }],
       "charts": [{ "title": "Sales by Category", "type": "bar", "datasetId": "ds-1", "xAxisColumn": "category", "yAxisColumn": "sales", "aggregation": "sum" }]
     }
   }
   \`\`\`
   - Inline Chart block format:
   \`\`\`json
   {
     "_inlineChart": {
       "title": "Monthly Performance",
       "type": "line",
       "datasetId": "ds-1",
       "xAxisColumn": "date",
       "yAxisColumn": "revenue",
       "aggregation": "sum"
     }
   }
   \`\`\`
   - Insight Card block format:
   \`\`\`json
   {
     "_insightCard": {
       "title": "Avg Order Value",
       "value": "$124.50",
       "trend": "up"
     }
   }
   \`\`\`
   - Local Analysis Execution block format:
   \`\`\`json
   {
     "_analyzePlan": {
       "type": "aggregation",
       "datasetId": "ds-1",
       "metrics": [{ "column": "sales", "aggregation": "sum" }],
       "dimensions": ["category"]
     }
   }
   \`\`\`
3. Always tailor your response directly to the user's datasets and question.`;

      const contents = [
        ...history.slice(-8).map(h => `${h.role === 'assistant' ? 'Model' : 'User'}: ${h.text}`),
        `User: ${message}`
      ].join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemInstruction + '\n\n' + contents,
      });

      if (response && response.text) {
        return { text: response.text, source: 'client_gemini' };
      }
    } catch (err) {
      console.warn('Client-side Gemini call failed, attempting fallback...', err);
    }
  }

  // 2. Second, attempt calling /api/chat server proxy if deployed
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text })),
        metadata
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.text) {
        return { text: data.text, source: 'server' };
      }
    }
  } catch (e) {
    console.warn('/api/chat unreachable, falling back to local copilot analytics engine', e);
  }

  // 3. Fallback: Intelligent Local Analytical Engine (Guaranteeing 0 502 errors)
  return {
    text: generateLocalCopilotResponse(message, datasets, metadata),
    source: 'local_engine'
  };
}

function generateLocalCopilotResponse(message: string, datasets: Dataset[], metadata: any): string {
  const lower = message.toLowerCase();
  const primaryDs = datasets[0];

  if (!primaryDs) {
    return "Please upload or select a dataset first so I can analyze your data.";
  }

  // Find numeric and categorical columns
  const numericCols = primaryDs.headers.filter(h => {
    const profile = primaryDs.columnProfiles[h];
    return profile?.type === 'numeric' || primaryDs.fullData.some(r => typeof r[h] === 'number');
  });

  const catCols = primaryDs.headers.filter(h => {
    const profile = primaryDs.columnProfiles[h];
    return profile?.type === 'text' || profile?.type === 'categorical' || !numericCols.includes(h);
  });

  const targetNum = numericCols[0] || primaryDs.headers[1] || primaryDs.headers[0];
  const targetCat = catCols[0] || primaryDs.headers[0];

  if (lower.includes('dashboard') || lower.includes('build') || lower.includes('report') || lower.includes('mis')) {
    const plan: DashboardPlan = {
      title: `${primaryDs.name} Executive Dashboard`,
      kpis: numericCols.slice(0, 3).map((numCol, idx) => {
        const total = primaryDs.fullData.reduce((sum, r) => sum + (Number(r[numCol]) || 0), 0);
        return {
          title: `Total ${numCol.replace(/_/g, ' ')}`,
          datasetId: primaryDs.id,
          yAxisColumn: numCol,
          aggregation: 'sum' as const,
          formattedValue: total > 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)
        };
      }),
      charts: [
        {
          title: `${targetNum} by ${targetCat}`,
          type: 'bar' as const,
          datasetId: primaryDs.id,
          xAxisColumn: targetCat,
          yAxisColumn: targetNum,
          aggregation: 'sum' as const
        },
        numericCols[1] ? {
          title: `Distribution of ${numericCols[1]}`,
          type: 'pie' as const,
          datasetId: primaryDs.id,
          xAxisColumn: targetCat,
          yAxisColumn: numericCols[1],
          aggregation: 'avg' as const
        } : {
          title: `Trend Analysis`,
          type: 'line' as const,
          datasetId: primaryDs.id,
          xAxisColumn: targetCat,
          yAxisColumn: targetNum,
          aggregation: 'count' as const
        }
      ]
    };

    return `I've analyzed your **${primaryDs.name}** dataset (${primaryDs.rowCount.toLocaleString()} rows, ${primaryDs.headers.length} columns) and generated an executive dashboard plan for you:

- **Key Metrics**: Analyzed ${numericCols.join(', ')}
- **Visual Breakdown**: Categorized by ${targetCat}

\`\`\`json
${JSON.stringify({ _dashboardPlan: plan }, null, 2)}
\`\`\`

Click **Build Dashboard** below to deploy these charts directly into your workspace.`;
  }

  if (lower.includes('clean') || lower.includes('null') || lower.includes('issue') || lower.includes('outlier')) {
    const pendingIssues = (primaryDs.issues || []).filter(i => i.status === 'pending');
    return `### Data Quality Assessment for **${primaryDs.name}**

I reviewed your dataset for quality issues:
- **Total Rows**: ${primaryDs.rowCount.toLocaleString()}
- **Pending Issues**: ${pendingIssues.length} issue(s) detected

${pendingIssues.length > 0 ? pendingIssues.map(i => `- **${i.title}**: ${i.description} (${i.affectedRowCount} rows affected)`).join('\n') : '- Your dataset is clean and ready for analysis!'}

You can switch to the **Data Cleaning** tab to review, apply or undo these changes.`;
  }

  // General Summary & Executive Query Response
  const sampleAnalysis = executeAnalysis(datasets, {
    type: 'aggregation',
    datasetId: primaryDs.id,
    metrics: [{ column: targetNum, aggregation: 'sum' }],
    dimensions: [targetCat]
  });

  const totalSum = primaryDs.fullData.reduce((acc, r) => acc + (Number(r[targetNum]) || 0), 0);

  const insightCard = {
    title: `Total ${targetNum}`,
    value: totalSum > 1000000 ? `$${(totalSum / 1000000).toFixed(2)}M` : totalSum > 1000 ? `$${(totalSum / 1000).toFixed(1)}K` : totalSum.toFixed(2),
    trend: 'up'
  };

  const inlineChart = {
    title: `Top ${targetCat} by ${targetNum}`,
    type: 'bar',
    datasetId: primaryDs.id,
    xAxisColumn: targetCat,
    yAxisColumn: targetNum,
    aggregation: 'sum'
  };

  return `Here is the analysis for **${primaryDs.name}**:

- **Overall ${targetNum}**: ${insightCard.value} across ${primaryDs.rowCount.toLocaleString()} records.
- **Top Category**: ${Array.isArray(sampleAnalysis) && sampleAnalysis[0] ? `${sampleAnalysis[0][targetCat]} (${sampleAnalysis[0][`sum_${targetNum}`] || '0'})` : 'N/A'}

\`\`\`json
${JSON.stringify({ _insightCard: insightCard }, null, 2)}
\`\`\`

\`\`\`json
${JSON.stringify({ _inlineChart: inlineChart }, null, 2)}
\`\`\`

Would you like me to build a complete dashboard or run deeper statistical breakdowns on this dataset?`;
}
