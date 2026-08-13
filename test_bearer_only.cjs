const key = process.env.GEMINI_API_KEY;

(async () => {
  try {
    let targetModel = 'gemini-1.5-flash';
    console.log("Testing exact model ID:", targetModel);
    
    // No ?key= query parameter, ONLY Bearer token
    const reqRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply OK" }] }] })
    });
    
    console.log("HTTP status:", reqRes.status);
    const reqData = await reqRes.json();
    console.log("Response body:", JSON.stringify(reqData, null, 2));

  } catch (err) {
    console.error("Test script exception:", err);
  }
})();
