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
    const targetModel = 'gemini-2.0-flash';
    console.log("Testing exact model ID:", targetModel);
    
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: "Reply OK"
    });
    
    console.log("Response text:", response.text);

  } catch (err) {
    console.error("HTTP status:", err.status);
    console.error("Exact upstream error:", err.message);
    if (err.details) console.error("Details:", JSON.stringify(err.details));
  }
})();
