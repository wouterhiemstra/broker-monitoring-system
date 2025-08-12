import { Router } from "express";
import { db } from "../db";
import { brokers } from "../../shared/schema";
import puppeteer from "puppeteer";

const router = Router();

// Quick connectivity test (no browser): GET /api/scan/ping
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

// Real scan with Puppeteer: POST /api/scan
router.post("/", async (_req, res) => {
  const results: Array<{ name: string; ok: boolean; title?: string; error?: string }> = [];
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    const rows = await db.select().from(brokers);
    if (!rows.length) return res.status(400).json({ ok: false, error: "no_brokers" });

    // Render needs these flags
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    for (const b of rows) {
      try {
        await page.goto(b.website, { waitUntil: "domcontentloaded" });
        const title = await page.title();
        results.push({ name: b.name, ok: true, title });
        // TODO: read b.scrapingPath (array of steps) and click/apply filters here
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
