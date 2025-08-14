import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import brokersRouter from "./routes/brokers";
import scanRouter from "./routes/scan";
import { db } from "./db";
import { brokers as brokersTable } from "../shared/schema";

const app = express();

// --- TEMP DEBUG: quick endpoints & simple logger ---
app.get("/ping", (_req, res) => {
  console.log("PING route hit");
  res.send("pong");
});

app.get("/health", (_req, res) => res.status(200).send("ok"));

app.use((req, _res, next) => {
  // log every request so we can SEE /api/scan being hit
  console.log("Request:", req.method, req.url);
  next();
});
// --- /TEMP DEBUG ---

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------- SCAN ROUTES ----------
/** sanity endpoint to confirm the scan router path is reachable */
app.get("/api/scan/ping", (_req, res) => res.json({ ok: true, msg: "scan route alive" }));

/** helper: start a scan from the browser by forwarding to POST /api/scan */
app.get("/api/scan/now", (req, res, next) => {
  (req as any).method = "POST";   // force POST
  (req as any).url = "/";         // hit scanRouter's root
  (scanRouter as any).handle(req, res, next);
});

app.use("/api/scan", scanRouter);
// ---------- /SCAN ROUTES ----------

// Debug helpers
app.get("/api/debug/brokers-count", async (_req, res) => {
  try {
    const rows = await db.select().from(brokersTable);
    res.json({ count: rows.length });
  } catch (e: any) {
    res.status(500).json({ error: "db_error", detail: String(e?.message || e) });
  }
});

app.get("/api/debug/env", (_req, res) => {
  res.json({ hasDatabaseUrl: Boolean(process.env.DATABASE_URL) });
});

// Mount brokers API
app.use("/api/brokers", brokersRouter);

// Response logger for /api/* (keeps your pretty logs)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  (res as any).json = (bodyJson: any, ...args: any[]) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
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

  // Vite in dev, static in prod
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve on PORT (Render sets this)
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => { log(`serving on port ${port}`); }
  );
})();
