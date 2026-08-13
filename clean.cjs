const fs = require('fs');
let serverCode = fs.readFileSync('server.ts', 'utf-8');

serverCode = serverCode.replace(
  /if \(errorMsg\.includes\("API_KEY_SERVICE_BLOCKED"\)\) \{[\s\S]*?\} else if \(errorMsg\.includes\("ACCESS_TOKEN_TYPE_UNSUPPORTED"\)\) \{[\s\S]*?\}[\s\S]*?res\.status\(statusCode/m,
  `if (error.status === 429) {
      friendlyMessage = "Groq API rate limit exceeded. Please try again in a few seconds.";
    } else {
      console.error("Error in AI chat:", error.message || "Unknown error");
    }

    res.status(statusCode`
);

fs.writeFileSync('server.ts', serverCode);
