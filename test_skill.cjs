const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

(async () => {
  try {
    const targetModel = 'gemini-3.6-flash';
    console.log("Testing exact model ID:", targetModel);
    
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: "Reply OK"
    });
    
    console.log("HTTP status: 200");
    console.log("Response text:", response.text);

  } catch (err) {
    console.error("HTTP status:", err.status);
    console.error("Exact upstream error:", err.message);
    if (err.details) console.error("Details:", JSON.stringify(err.details));
  }
})();
