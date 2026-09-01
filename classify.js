const fs = require('fs');
const content = fs.readFileSync('src/lib/copilotAnalyticsEngine.ts', 'utf8');
console.log(content.includes('export async function generateAnalyticsEvidence'));
