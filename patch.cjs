const fs = require('fs');
let content = fs.readFileSync('src/lib/copilotAnalyticsEngine.ts', 'utf8');

const earlyExitLogic = `
  // 0.0 QUERY INTENT CLASSIFICATION (EARLY EXIT FOR NON-DATA QUERIES)
  // We must explicitly separate general conversation/help from dataset requests.
  const isIdentity = /^(what is your name|who are you|what are you|what can you do|hello|hi|hey)\\b/i.test(lower);
  const isHelp = /^(tell me about this website|what can this platform do|how do i use|help)\\b/i.test(lower);
  const isGeneralConversation = isIdentity || isHelp || lower.length < 3;
  
  // If no explicit dataset/analysis words are used AND it matches general conversation, abort.
  const hasAnalyticalKeywords = metricKeywords.some(k => lower.includes(k)) || 
                                dimensionKeywords.some(k => lower.includes(k)) ||
                                lower.includes('dataset') || lower.includes('data') || lower.includes('trend') || lower.includes('analyze') || lower.includes('clean');
                                
  // Wait, if it's explicitly identity/help, we always abort computation evidence.
  if (isIdentity || isHelp) {
    return null;
  }
  
  // If it doesn't have analytical keywords and doesn't match any columns, we probably shouldn't force an aggregation.
  let matchesColumn = false;
  if (dataset) {
    matchesColumn = dataset.headers.some(h => lower.includes(h.toLowerCase()));
  }
  if (!hasAnalyticalKeywords && !matchesColumn && !lower.includes('show me') && !lower.includes('chart') && !lower.includes('kpi')) {
     return null; // likely just conversation
  }
`;

content = content.replace("  // 0.0 ACTION PLAN ORCHESTRATION", earlyExitLogic + "\n  // 0.0 ACTION PLAN ORCHESTRATION");

fs.writeFileSync('src/lib/copilotAnalyticsEngine.ts', content);
console.log("Patched early exit");
