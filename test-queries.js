const metricKeywords = ['sum', 'total', 'avg', 'average', 'mean', 'count', 'max', 'min', 'highest', 'lowest', 'revenue', 'profit', 'sales', 'cost', 'amount', 'price', 'quantity', 'value', 'margin', 'share', 'percent'];
const dimensionKeywords = ['by', 'group', 'breakdown', 'region', 'category', 'segment', 'customer', 'product', 'item', 'sku', 'branch', 'store', 'city', 'country', 'status', 'type'];

function checkIntent(lower) {
  const isIdentity = /(what|who)\s+(is|are)\s+(your\s+name|you)\b/i.test(lower) || /what can you do\b/i.test(lower) || /^(hello|hi|hey|greetings)\b/i.test(lower);
  const isHelp = /(tell me about this (website|platform|app)|what can this (website|platform|app) do|how do i use|how to use|help)\b/i.test(lower);

  if (isIdentity || isHelp) {
    return 'NULL (Identity/Help)';
  }

  const hasAnalyticalKeywords = metricKeywords.some(k => lower.includes(k)) || 
                                dimensionKeywords.some(k => lower.includes(k)) ||
                                /(dataset|data|trend|analyze|clean|kpi|chart|visual)/i.test(lower);
                                
  const hasQuestionKeywords = /(show me|which|what is the)/i.test(lower);

  if (!hasAnalyticalKeywords && !hasQuestionKeywords && lower.length > 2) {
     return 'NULL (No Data Keywords)'; 
  }

  return 'PROCESS AS DATA';
}

console.log("Q1:", checkIntent("What are the key trends in this dataset?"));
console.log("Q2:", checkIntent("What is your name?"));
console.log("Q3:", checkIntent("Tell me about this website."));
console.log("Q4:", checkIntent("Can you clean this dataset?"));
console.log("Q5:", checkIntent("Which shop type has the highest sales?"));

