import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import brokersRouter from "./routes/brokers"; // ⬅️ NEW

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple health check (helps uptime + quick sanity)
app.get("/health", (_req, res) => res.status(200).send("ok")); // ⬅️ NEW

import { db } from "./db";
import { brokers as brokersTable } from "../shared/schema";

app.get("/api/debug/brokers-count", async (_req, res) => {
  try {
    const rows = await db.select().from(brokersTable);
    res.json({ count: rows.length });
  } catch (e:any) {
    res.status(500).json({ error: "db_error", detail: String(e?.message || e) });
  }
});

app.get("/api/debug/env", (_req, res) => {
  res.json({ hasDatabaseUrl: Boolean(process.env.DATABASE_URL) });
});


// Mount brokers API so /api/brokers works
app.use("/api/brokers", brokersRouter); // ⬅️ NEW

// Request/response logger (kept as-is)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register any other routes your app has
  const server = await registerRoutes(app);

  // Central error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Only attach Vite in development; serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve on PORT (Render sets this)
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
