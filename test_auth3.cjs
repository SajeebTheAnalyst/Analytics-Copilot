const { GoogleGenAI } = require("@google/genai");

const key = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
      "Authorization": `Bearer ${key}`
    }
  }
});

(async () => {
  try {
    const targetModel = 'gemini-1.5-flash';
    console.log("Testing exact model ID:", targetModel);
    
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: "Reply OK"
    });
    
    console.log("Response text:", response.text);

  } catch (err) {
    console.error("HTTP status:", err.status);
    console.error("Exact upstream error:", err.message);
  }
})();
