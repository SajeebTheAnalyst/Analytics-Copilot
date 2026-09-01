const fs = require('fs');
let content = fs.readFileSync('src/components/layout/RightPanel.tsx', 'utf8');

// Don't show Smart Visual when evidence is explicitly telling the AI not to compute
const blockToReplace = "{(ev?.recommendedWidget || inlineChart) && (";
const replacement = "{(ev?.recommendedWidget || (inlineChart && ev?.note !== 'No dataset computation is required for this query. Please answer based purely on the conversation context and your core instructions.')) && (";

content = content.replace(blockToReplace, replacement);
fs.writeFileSync('src/components/layout/RightPanel.tsx', content);
console.log("Patched RightPanel.tsx to hide Smart Visual when not applicable.");
