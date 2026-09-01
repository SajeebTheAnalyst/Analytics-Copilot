const fs = require('fs');
let content = fs.readFileSync('src/lib/copilotAnalyticsEngine.ts', 'utf8');

const intentBlockStart = "  // 0.0 QUERY INTENT CLASSIFICATION";
const intentBlockEnd = "  // 0.0 ACTION PLAN ORCHESTRATION";

const startIndex = content.indexOf(intentBlockStart);
const endIndex = content.indexOf(intentBlockEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newLogic = `  // 0.0 QUERY INTENT CLASSIFICATION (EARLY EXIT FOR NON-DATA QUERIES)
  // We must explicitly separate general conversation/help from dataset requests.
  
  // 1. Identity / General Conversation
  const isIdentity = /(what|who)\\s+(is|are)\\s+(your\\s+name|you)\\b/i.test(lower) || /what can you do\\b/i.test(lower) || /^(hello|hi|hey|greetings)\\b/i.test(lower);
  
  // 2. Help / System / Website
  const isHelp = /(tell me about this (website|platform|app)|what can this (website|platform|app) do|how do i use|how to use|help)\\b/i.test(lower);
  
  if (isIdentity || isHelp) {
    // Abort computation evidence to ensure AI answers purely from its system context without attaching unrelated data calculations.
    return { note: "No dataset computation is required for this query. Please answer based purely on the conversation context and your core instructions." };
  }
  
  // 3. Strict Verification for Analytics
  // Avoid forcing random numeric calculations if the user isn't actually asking a data question.
  const hasAnalyticalKeywords = metricKeywords.some(k => lower.includes(k)) || 
                                dimensionKeywords.some(k => lower.includes(k)) ||
                                /(dataset|data|trend|analyze|clean|kpi|chart|visual)/i.test(lower);
                                
  let matchesColumn = false;
  if (dataset && dataset.headers) {
    matchesColumn = dataset.headers.some(h => lower.includes(h.toLowerCase()));
  }
  
  const hasQuestionKeywords = /(show me|which|what is the)/i.test(lower);
  
  if (!hasAnalyticalKeywords && !matchesColumn && !hasQuestionKeywords && lower.length > 2) {
     return { note: "No dataset computation is required for this query. Please answer based purely on the conversation context and your core instructions." };
  }

`;

  content = content.substring(0, startIndex) + newLogic + content.substring(endIndex);
  fs.writeFileSync('src/lib/copilotAnalyticsEngine.ts', content);
  console.log("Patched intent classification to return proper object.");
} else {
  console.log("Could not find the block to replace.");
}
