import express from "express";
import path from "path";
import dotenv from "dotenv";
import app from "./server/app.ts";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const PORT = parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const isVercel = !!process.env.VERCEL;

  if (isVercel) {
    console.log("[SERVER_START] Running in Vercel environment - skipping app.listen()");
    return;
  }

  if (isProduction) {
    console.log("[SERVER_START] Running in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Avoid sending files for API routes that fell through
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER_START] Production server listening on port ${PORT}`);
    });
    return;
  }

  // Development mode
  console.log("[SERVER_START] Running in development mode...");
  try {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER_START] Development server listening on port ${PORT}`);
    });
  } catch (err: any) {
    console.error("[SERVER_START] Failed to start development server:", err.message);
    process.exit(1);
  }
}

console.log("[SERVER_LOAD] server.ts module loaded");
startServer().catch(err => {
  console.error("[SERVER_FATAL] Top-level server error:", err);
});

export default app;
