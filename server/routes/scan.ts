import { Router } from "express";
import { db } from "../db";
import { brokers } from "../../shared/schema";
import puppeteer, { executablePath } from "puppeteer";

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

// (Optional) GET /api/scan — friendly hint for browser GETs
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

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: executablePath(), // <-- use Chrome we install at build
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    for (const b of rows) {
      try {
        await page.goto(b.website, { waitUntil: "domcontentloaded" });
        const title = await page.title();
        results.push({ name: b.name, ok: true, title });
        // TODO: parse b.scrapingPath (array of steps) and click filters
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
