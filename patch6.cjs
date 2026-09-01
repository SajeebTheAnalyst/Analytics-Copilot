const fs = require('fs');
let content = fs.readFileSync('src/components/layout/RightPanel.tsx', 'utf8');

// The better way is to hide Smart Visual if evidence is completely missing, 
// OR if evidence is missing and inlineChart was fabricated by the AI without evidence.
const blockToReplace = "{(ev?.recommendedWidget || (inlineChart && ev?.note !== 'No dataset computation is required for this query. Please answer based purely on the conversation context and your core instructions.')) && (";
const newBlock = "{(ev?.recommendedWidget || (inlineChart && ev && !ev.note)) && (";

content = content.replace(blockToReplace, newBlock);
fs.writeFileSync('src/components/layout/RightPanel.tsx', content);
console.log("Patched RightPanel.tsx condition.");
