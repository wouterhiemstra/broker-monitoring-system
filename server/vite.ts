import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(path.resolve(__dirname, ".."), "client");
const distPublic = path.resolve(__dirname, "public");

// Simple logger to match import { log } usage
export function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[vite]", ...args);
}

/**
 * Dev mode: attach Vite middlewares so the client is served by Vite.
 * Matches import { setupVite } from "./vite";
 */
export async function setupVite(app: Express) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root: clientRoot,
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);
  log("Vite dev server attached");
}

/**
 * Prod mode: serve prebuilt static files from /dist/public.
 * Matches import { serveStatic } from "./vite";
 */
export function serveStatic(app: Express) {
  app.use(express.static(distPublic));
  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPublic, "index.html"));
  });
  log("Serving static files from", distPublic);
}

// Optional export if other modules need it
export const clientDistPath = distPublic;
