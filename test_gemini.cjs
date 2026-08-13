const key = process.env.GEMINI_API_KEY;

if (!key) {
  console.error("No GEMINI_API_KEY found in process.env");
  process.exit(1);
}

(async () => {
  try {
    // 1. Verify model list
    let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    let data = await res.json();
    if (data.error) {
       console.error("Error fetching models:", JSON.stringify(data.error));
       return;
    }
    
    // Look for current flash models
    const modelNames = data.models.map(m => m.name);
    console.log("Available models (Flash):", modelNames.filter(n => n.includes('flash')).join(', '));
    
    // Select the most standard/stable flash model
    let targetModel = 'gemini-1.5-flash';
    if (modelNames.includes('models/gemini-2.5-flash')) targetModel = 'gemini-2.5-flash';
    else if (modelNames.includes('models/gemini-2.0-flash')) targetModel = 'gemini-2.0-flash';
    else if (modelNames.includes('models/gemini-3.0-flash')) targetModel = 'gemini-3.0-flash';
    
    console.log("\n=== TEST REQUEST ===");
    console.log("Exact model ID:", targetModel);
    
    // 2. Make minimal request
    const reqRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply OK" }] }] })
    });
    
    console.log("HTTP status:", reqRes.status);
    const reqData = await reqRes.json();
    console.log("Response body:", JSON.stringify(reqData, null, 2));

  } catch (err) {
    console.error("Test script exception:", err);
  }
})();
