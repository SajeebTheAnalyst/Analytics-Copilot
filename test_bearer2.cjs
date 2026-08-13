const key = process.env.GEMINI_API_KEY;

(async () => {
  try {
    const reqRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'x-goog-user-project': process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'ais-asia-east1-1ab113c3806b4af'
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply OK" }] }] })
    });
    
    console.log("HTTP status:", reqRes.status);
    console.log("Response body:", await reqRes.text());
  } catch (err) {
    console.error("Test script exception:", err);
  }
})();
