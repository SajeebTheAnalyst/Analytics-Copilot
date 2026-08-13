const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

// 1. Replace GoogleGenAI import with Groq
serverCode = serverCode.replace(
  'import { GoogleGenAI } from "@google/genai";',
  'import Groq from "groq-sdk";'
);

// 2. Remove Vertex AI environment variable clearing
serverCode = serverCode.replace(
  /\/\/ Force Gemini API mode[\s\S]*?delete process\.env\.GCP_PROJECT;\n\n/m,
  ''
);

// 3. Update /api/health endpoint
serverCode = serverCode.replace(
  /const keyExists = !!process\.env\.GEMINI_API_KEY;/g,
  'const keyExists = !!process.env.GROQ_API_KEY;'
);

serverCode = serverCode.replace(
  /const modelName = "gemini-1\.5-flash";/g,
  'const modelName = "llama-3.3-70b-versatile";'
);

// We need to rewrite the ping test in /api/health
serverCode = serverCode.replace(
  /const response = await ai\.models\.generateContent\(\{[\s\S]*?\}\);/m,
  `const response = await groq.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: "ping" }],
      });`
);
serverCode = serverCode.replace(
  /responseReceived: !!response\.text,/g,
  'responseReceived: !!response.choices[0]?.message?.content,'
);

serverCode = serverCode.replace(
  /GEMINI_API_KEY_PRESENT: keyExists,/g,
  'GROQ_API_KEY_PRESENT: keyExists,'
);
serverCode = serverCode.replace(
  /GEMINI_API_KEY_PREFIX: keyExists \? process\.env\.GEMINI_API_KEY\?\.substring\(0, 4\) : null,/g,
  'GROQ_API_KEY_PREFIX: keyExists ? process.env.GROQ_API_KEY?.substring(0, 4) : null,'
);

// 4. Update Initialization
serverCode = serverCode.replace(
  /\/\/ Initialize GoogleGenAI[\s\S]*?\}\);/m,
  `// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});`
);

// 5. Update /api/analyze endpoint
serverCode = serverCode.replace(
  /message: "Gemini API key is not configured/g,
  'message: "Groq API key is not configured'
);

serverCode = serverCode.replace(
  /const selectedModel = "gemini-3\.6-flash";/g,
  'const selectedModel = "llama-3.3-70b-versatile";'
);

// Re-write the generateContent part in /api/analyze
serverCode = serverCode.replace(
  /response = await ai\.models\.generateContent\(\{[\s\S]*?\}\);/m,
  `response = await groq.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
      });`
);
serverCode = serverCode.replace(
  /const text = response\.text;/g,
  'const text = response.choices[0]?.message?.content;'
);
serverCode = serverCode.replace(
  /throw new Error\("No response text from Gemini"\);/g,
  'throw new Error("No response text from Groq");'
);
serverCode = serverCode.replace(
  /console\.error\("Failed to parse Gemini response as JSON", text\);/g,
  'console.error("Failed to parse Groq response as JSON", text);'
);

// 6. Update /api/chat endpoint
serverCode = serverCode.replace(
  /message: "AI Copilot is not configured yet\. Please provide a GEMINI_API_KEY in the Secrets panel\."/g,
  'message: "AI Copilot is not configured yet. Please provide a GROQ_API_KEY in the Secrets panel."'
);

// In /api/chat contents mapping, we need to map to groq format (content instead of parts[0].text)
serverCode = serverCode.replace(
  /const contents = \[[\s\S]*?\];/m,
  `const messages = [
      { role: "system", content: systemInstruction },
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: 'user',
        content: message
      }
    ];`
);

serverCode = serverCode.replace(
  /const inputChars = systemInstruction\.length \+ contents\.reduce\(\(acc: number, msg: any\) => acc \+ \(msg\.parts\[0\]\.text \? msg\.parts\[0\]\.text\.length : 0\), 0\);/g,
  'const inputChars = messages.reduce((acc: number, msg: any) => acc + (msg.content ? msg.content.length : 0), 0);'
);

// Re-write the generateContent part in /api/chat
serverCode = serverCode.replace(
  /response = await ai\.models\.generateContent\(\{[\s\S]*?\}\);/m,
  `response = await groq.chat.completions.create({
        model: selectedModel,
        messages,
        temperature: 0.2,
      });`
);

serverCode = serverCode.replace(
  /const errorMsg = error\.message \|\| "";[\s\S]*?console\.error\("Error analyzing data:", error\.message \|\| "Unknown error"\);\n    }/m,
  `const errorMsg = error.message || "";
    
    if (error.status === 429) {
      friendlyMessage = "Groq API rate limit exceeded. Please try again in a few seconds.";
    } else {
      console.error("Error analyzing data:", error.message || "Unknown error");
    }`
);

fs.writeFileSync('server.ts', serverCode);
