const fs = require('fs');
let content = fs.readFileSync('src/lib/copilotEngine.ts', 'utf8');

const oldBlock = `        history: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text })),
        metadata,
        evidence`;

const newBlock = `        history: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text })),
        metadata,
        // Only send evidence to the AI if it's an actual computation, not just a "don't compute" note.
        evidence: evidence?.note ? null : evidence`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/lib/copilotEngine.ts', content);
console.log("Patched copilotEngine.ts to not send note evidence to AI.");
