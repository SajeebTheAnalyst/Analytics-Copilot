const { GoogleGenAI } = require("@google/genai");
const key = process.env.GEMINI_API_KEY;
const isAuthKey = key.startsWith("AQ.");

const ai = new GoogleGenAI({
  apiKey: key,
  httpOptions: {
    headers: Object.assign(
      { "User-Agent": "aistudio-build" },
      isAuthKey ? { "Authorization": `Bearer ${key}` } : {}
    ),
  },
});

(async () => {
  try {
    console.log("=== SDK TEST REQUEST ===");
    
    // Test with gemini-2.5-flash
    let targetModel = 'gemini-1.5-flash';
    console.log("Testing exact model ID:", targetModel);
    
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: "Reply OK"
    });
    
    console.log("Response text:", response.text);

  } catch (err) {
    console.error("HTTP status:", err.status);
    console.error("Exact upstream error:", err.message);
    console.error("Quota metric:", JSON.stringify(err.details));
  }
})();
