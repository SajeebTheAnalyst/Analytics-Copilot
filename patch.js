const fs = require('fs');

let content = fs.readFileSync('server/app.ts', 'utf8');

const errorParsingCode = `
    let friendlyMessage = error.message || "An unexpected error occurred.";
    try {
      const parsed = JSON.parse(friendlyMessage);
      if (parsed.error && parsed.error.message) {
        friendlyMessage = parsed.error.message;
      }
    } catch(e) {}
    if (error.status === 429 || statusCode === 429) {
      friendlyMessage = "Gemini API rate limit exceeded. Please try again in a few seconds.";
    } else if (error.status === 503 || statusCode === 503) {
      friendlyMessage = "Gemini API is currently experiencing high demand. Please try again in a few moments.";
    }
`;

content = content.replace(/let friendlyMessage = error\.message;\s*if \(error\.status === 429\) \{\s*friendlyMessage = "Gemini API rate limit exceeded\. Please try again in a few seconds\.";\s*\} else \{/g, errorParsingCode + '    } else if (false) {');
content = content.replace(/let friendlyMessage = error\.message \|\| "An error occurred in AI Copilot service\.";\s*if \(error\.status === 429\) \{\s*friendlyMessage = "Gemini API rate limit exceeded\. Please wait a few seconds and try again\.";\s*\}/g, errorParsingCode);

fs.writeFileSync('server/app.ts', content);
