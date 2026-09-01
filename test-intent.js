const metricKeywords = ['sum', 'total', 'avg', 'average', 'mean', 'count', 'max', 'min', 'highest', 'lowest', 'revenue', 'profit', 'sales', 'cost', 'amount', 'price', 'quantity', 'value', 'margin', 'share', 'percent'];
const dimensionKeywords = ['by', 'group', 'breakdown', 'region', 'category', 'segment', 'customer', 'product', 'item', 'sku', 'branch', 'store', 'city', 'country', 'status', 'type'];

const classify = (message, headers = []) => {
  const lower = message.toLowerCase().trim();
  
  // 1. Identity / General Conversation
  if (/(what|who)\s+(is|are)\s+(your\s+name|you)\b/i.test(lower) || /what can you do\b/i.test(lower) || /^(hello|hi|hey|greetings)\b/i.test(lower)) {
    return 'IDENTITY';
  }
  
  // 2. Help / System / Website
  if (/(tell me about this (website|platform|app)|how do i use|how to use|help)\b/i.test(lower)) {
    return 'HELP';
  }
  
  // 3. Analytics & Dataset
  const hasAnalyticalKeywords = metricKeywords.some(k => lower.includes(k)) || 
                                dimensionKeywords.some(k => lower.includes(k)) ||
                                /(dataset|data|trend|analyze|clean|kpi|chart|visual)/i.test(lower);
                                
  const matchesColumn = headers.some(h => lower.includes(h.toLowerCase()));
  
  if (hasAnalyticalKeywords || matchesColumn || /(show me|which|what is the)/i.test(lower)) {
    return 'ANALYTICS';
  }
  
  return 'GENERAL';
};

console.log("Q1:", classify("What are the key trends in this dataset?"));
console.log("Q2:", classify("What is your name?"));
console.log("Q3:", classify("Tell me about this website."));
console.log("Q4:", classify("Can you clean this dataset?"));
console.log("Q5:", classify("Which shop type has the highest sales?"));
console.log("Q6:", classify("hello"));
