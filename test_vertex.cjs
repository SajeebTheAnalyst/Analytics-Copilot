const key = process.env.GEMINI_API_KEY;
const project = 'ais-asia-east1-1ab113c3806b4af'; // Guessing from SA email
const location = 'asia-east1';

(async () => {
  try {
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/gemini-1.5-flash:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: "Reply OK" }] }] })
    });
    
    console.log("Vertex HTTP status:", res.status);
    console.log("Response:", JSON.stringify(await res.json(), null, 2));
  } catch (e) {
    console.error(e);
  }
})();
