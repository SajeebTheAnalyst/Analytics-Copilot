const { GoogleGenAI } = require("@google/genai");

async function run() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const isOauth = !geminiKey.startsWith("AIza");
  
  const ai = new GoogleGenAI({ 
    apiKey: isOauth ? undefined : geminiKey,
    httpOptions: isOauth ? { headers: { Authorization: `Bearer ${geminiKey}` } } : {}
  });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello",
    });
    console.log(response.text);
  } catch(e) {
    console.error(e);
  }
}
run();
