const fs = require('fs');
let content = fs.readFileSync('src/lib/copilotAnalyticsEngine.ts', 'utf8');

// Change return type to AnalyticalEvidence | null | any
const oldType = "Promise<AnalyticalEvidence | null>";
const newType = "Promise<AnalyticalEvidence | any | null>";

content = content.replace(oldType, newType);
fs.writeFileSync('src/lib/copilotAnalyticsEngine.ts', content);
console.log("Patched return type.");
