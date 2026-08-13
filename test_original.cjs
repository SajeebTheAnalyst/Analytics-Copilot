const { GoogleGenAI } = require("@google/genai");

delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.GCP_PROJECT;
delete process.env.GCLOUD_PROJECT;

const key = (process.env.GEMINI_API_KEY || "").trim();
const isAuthKey = key.startsWith("AQ.");

const ai = new GoogleGenAI({
  apiKey: key,
  vertexai: false,
  httpOptions: {
    headers: Object.assign(
      { "User-Agent": "aistudio-build" },
      isAuthKey ? { "Authorization": `Bearer ${key}` } : {}
    ),
  },
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
    if (err.details) console.error("Details:", JSON.stringify(err.details));
  }
})();
