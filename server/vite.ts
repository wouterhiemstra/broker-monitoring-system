import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function registerVite(app: Express) {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: path.resolve(path.resolve(__dirname, ".."), "client"),
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "public");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

export const clientDistPath = path.resolve(__dirname, "public");
