const url = "https://analyticscopilot.vercel.app/api/chat";
const healthUrl = "https://analyticscopilot.vercel.app/api/health";

async function testHealth() {
  const start = Date.now();
  try {
    const res = await fetch(healthUrl, {
      method: "GET"
    });
    const timing = Date.now() - start;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}
    return {
      endpoint: "health",
      status: res.status,
      timing,
      raw: text.substring(0, 500),
      json
    };
  } catch (err) {
    return {
      endpoint: "health",
      status: "FETCH_ERROR",
      timing: Date.now() - start,
      error: err.message
    };
  }
}

async function testStage(stageValue) {
  const start = Date.now();
  try {
    let endpoint = url;
    if (stageValue !== "real") {
      endpoint += `?stage=${stageValue}`;
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "hey"
      })
    });
    const timing = Date.now() - start;
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}

    return {
      stage: stageValue,
      status: res.status,
      timing,
      raw: text.substring(0, 500),
      json
    };
  } catch (err) {
    return {
      stage: stageValue,
      status: "FETCH_ERROR",
      timing: Date.now() - start,
      error: err.message
    };
  }
}

async function run() {
  console.log("Testing Health...");
  const healthRes = await testHealth();
  console.log("Health Result:", JSON.stringify(healthRes, null, 2));

  const stages = ["1", "2", "3", "4", "5", "6", "real"];
  const results = [];
  for (const s of stages) {
    console.log(`Running Stage ${s}...`);
    const res = await testStage(s);
    results.push(res);
  }
  console.log(JSON.stringify(results, null, 2));
}

run();
