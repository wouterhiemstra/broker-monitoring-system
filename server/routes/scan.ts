import { Router } from "express";
import { db } from "../db";
import { brokers } from "../../shared/schema";
import puppeteer from "puppeteer";

const router = Router();

// GET /api/scan/ping — quick network check (no browser)
router.get("/ping", async (_req, res) => {
  try {
    const rows = await db.select().from(brokers);
    const results = await Promise.all(
      rows.map(async (b) => {
        try {
          const r = await fetch(b.website, { method: "HEAD" });
          return { name: b.name, url: b.website, status: r.status };
        } catch (e: any) {
          return { name: b.name, url: b.website, error: String(e?.message || e) };
        }
      })
    );
    res.json({ ok: true, results });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Friendly GET message
router.get("/", (_req, res) => {
  res.json({ ok: true, hint: "Use POST /api/scan to start the real scan" });
});

// POST /api/scan — real scan with Puppeteer
router.post("/", async (_req, res) => {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  const results: Array<{ name: string; ok: boolean; title?: string; error?: string }> = [];

  try {
    const rows = await db.select().from(brokers);
    if (!rows.length) return res.status(400).json({ ok: false, error: "no_brokers" });

    // Get Chrome path from environment or Puppeteer default
    const exePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || (await puppeteer.executablePath());

    browser = await puppeteer.launch({
      headless: true,
      executablePath: exePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ],
      timeout: 120_000
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    for (const b of rows) {
      try {
        await page.goto(b.website, { waitUntil: "domcontentloaded" });
        const title = await page.title();
        results.push({ name: b.name, ok: true, title });
      } catch (e: any) {
        results.push({ name: b.name, ok: false, error: String(e?.message || e) });
      }
    }

    res.json({ ok: true, results });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

export default router;
