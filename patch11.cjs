const fs = require('fs');
let content = fs.readFileSync('src/components/layout/RightPanel.tsx', 'utf8');

const oldBlock = "                            {ev && (";
const newBlock = "                            {ev && !ev.note && (";

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/layout/RightPanel.tsx', content);
console.log("Patched RightPanel.tsx to hide evidence block completely if it's just a note.");
