// server/routes/scan.ts
import { Router } from "express";
import puppeteer from "puppeteer";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { brokers, listings } from "../../shared/schema";
import { createDealForListing } from "../integrations/hubspot";

const router = Router();

/* ---------------- Optional email setup ---------------- */
const SENDGRID_KEY = process.env.SENDGRID_API_KEY || "";
if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

async function sendEmail(opts: { to: string; from: string; subject: string; html: string }) {
  if (SENDGRID_KEY) {
    await sgMail.send(opts);
    return;
  }
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.log(`[email skipped] ${opts.subject}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail(opts);
}

/* ---------------- Helpers ---------------- */
const clean = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
const toAbs = (base: string, href?: string | null) => {
  try { return href ? new URL(href, base).toString() : null; } catch { return null; }
};

type Action =
  | { click: string; waitFor?: string }                                  // click by CSS
  | { clickText: string; within?: string; waitFor?: string }             // click by visible text
  | { select: { selector: string; value?: string; text?: string }; waitFor?: string } // dropdown
  | { scrollUntilText: string; maxScrolls?: number }                     // keep scrolling until text appears
  | { type: "sleep"; ms: number }
  | { waitFor: string };

type ScrapeCfg =
  | {
      list: string;           // selector for each listing card/row
      link?: string;          // selector inside card to get <a>
      title?: string;         // selector for title text
      price?: string;         // selector for price text
      location?: string;      // selector for location text
      actions?: Action[];     // pre-steps to apply filters, open tabs, etc.
      include?: string;       // regex string to keep
      exclude?: string;       // regex string to drop
    }
  | string[]                  // legacy: [listSelector, linkSelector?]
  | undefined;

/* ---- action helpers ---- */
async function clickAndMaybeNavigate(page: puppeteer.Page, fn: () => Promise<void>) {
  const nav = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
  await fn();
  await Promise.race([nav, page.waitForTimeout(400)]);
}

async function runActions(page: puppeteer.Page, cfg?: ScrapeCfg) {
  const obj = (cfg && !Array.isArray(cfg)) ? (cfg as any) : null;
  const actions: Action[] = obj?.actions || [];
  for (const a of actions) {
    // click by CSS
    if ("click" in a) {
      await page.waitForSelector(a.click, { timeout: 15000 });
      await clickAndMaybeNavigate(page, () => page.click(a.click));
      if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 15000 });
      continue;
    }
    // click by visible text
    if ("clickText" in a) {
      const text = a.clickText.trim();
      const xpath = a.within
        ? `//${a.within}[contains(normalize-space(.), ${JSON.stringify(text)})]`
        : `//*[contains(normalize-space(.), ${JSON.stringify(text)})]`;
      const els = await page.$x(xpath);
      if (els.length === 0) throw new Error(`clickText not found: ${text}`);
      await clickAndMaybeNavigate(page, () => (els[0] as any).click());
      if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 15000 });
      continue;
    }
    // select dropdown
    if ("select" in a) {
      const { selector, value, text } = a.select;
      await page.waitForSelector(selector, { timeout: 15000 });
      if (value) {
        await page.select(selector, value);
      } else if (text) {
        await page.$eval(selector, (el, t) => {
          const sel = el as HTMLSelectElement;
          const opt = Array.from(sel.options).find(o => o.text.trim() === String(t).trim());
          if (!opt) throw new Error(`select text not found: ${t}`);
          sel.value = opt.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }, text);
      } else {
        throw new Error("select: provide value or text");
      }
      if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 15000 });
      continue;
    }
    // scroll until specific visible text appears
    if ("scrollUntilText" in a) {
      const target = String(a.scrollUntilText).trim();
      const max = Number(a.maxScrolls ?? 20);
      let found = false;
      for (let i = 0; i < max; i++) {
        const els = await page.$x(`//*[contains(normalize-space(.), ${JSON.stringify(target)})]`);
        if (els.length > 0) { found = true; break; }
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9));
        await page.waitForTimeout(600);
      }
      if (!found) console.warn(`[actions] scrollUntilText: "${target}" not found after ${max} scrolls`);
      continue;
    }
    // wait for selector
    if ("waitFor" in a) {
      await page.waitForSelector(a.waitFor, { timeout: 15000 });
      continue;
    }
    // sleep
    if ((a as any).type === "sleep") {
      await page.waitForTimeout((a as any).ms);
      continue;
    }
  }
}

/* ---- extraction ---- */
async function extract(page: puppeteer.Page, baseUrl: string, cfg?: ScrapeCfg) {
  const out: Array<{ url: string; title: string; price?: string; location?: string }> = [];

  if (Array.isArray(cfg)) {
    const [listSel, linkSel] = cfg;
    if (listSel) {
      const items = await page.$$eval(listSel, (els, linkSelIn) => {
        const res: any[] = [];
        for (const el of els as Element[]) {
          const a = linkSelIn ? el.querySelector(linkSelIn)
            : el.tagName.toLowerCase() === "a" ? el : el.querySelector("a");
          const href = (a as HTMLAnchorElement | null)?.getAttribute("href") || "";
          const title = (a?.textContent || el.textContent || "").replace(/\s+/g, " ").trim();
          if (href) res.push({ href, title });
        }
        return res;
      }, linkSel);
      for (const it of items) {
        const url = toAbs(baseUrl, (it as any).href);
        if (url) out.push({ url, title: clean((it as any).title) || url });
      }
    }
  } else if (cfg && typeof cfg === "object" && (cfg as any).list) {
    const { list, link, title, price, location } = cfg as any;
    const items = await page.$$eval(
      list,
      (els, sels) => {
        const res: any[] = [];
        const { link, title, price, location } = sels as any;
        for (const el of els as Element[]) {
          const a: Element | null =
            (link && el.querySelector(link)) ||
            (el.tagName.toLowerCase() === "a" ? el : el.querySelector("a"));
          const href = (a as HTMLAnchorElement | null)?.getAttribute("href") || "";
          const t = title ? el.querySelector(title)?.textContent : a?.textContent || el.textContent;
          const p = price ? el.querySelector(price)?.textContent : null;
          const loc = location ? el.querySelector(location)?.textContent : null;
          if (href) {
            res.push({
              href,
              title: (t || "").replace(/\s+/g, " ").trim(),
              price: (p || "").replace(/\s+/g, " ").trim(),
              location: (loc || "").replace(/\s+/g, " ").trim(),
            });
          }
        }
        return res;
      },
      { link, title, price, location }
    );
    for (const it of items) {
      const url = toAbs(baseUrl, (it as any).href);
      if (url) out.push({
        url,
        title: clean((it as any).title) || url,
        price: clean((it as any).price),
        location: clean((it as any).location),
      });
    }
  }

  // Dedupe by URL
  const seen = new Set<string>();
  return out.filter(r => (r.url && !seen.has(r.url) && seen.add(r.url)));
}

/* ---- Debug: which Chrome path puppeteer sees ---- */
router.get("/which-chrome", async (_req, res) => {
  try {
    let auto: string | null = null;
    try { auto = await puppeteer.executablePath(); } catch { auto = null; }
    res.json({ ok: true, envPath: process.env.PUPPETEER_EXECUTABLE_PATH || null, autoPath: auto });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/* ---- Simple helpers ---- */
router.get("/", (_req, res) => res.json({ ok: true, hint: "Use POST /api/scan to start the real scan" }));

router.get("/ping", async (_req, res) => {
  try {
    const rows = await db.select().from(brokers);
    const results = await Promise.all(rows.map(async (b) => {
      try { const r = await fetch(b.website, { method: "HEAD" }); return { name: b.name, url: b.website, status: r.status }; }
      catch (e: any) { return { name: b.name, url: b.website, error: String(e?.message || e) }; }
    }));
    res.json({ ok: true, results });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/* ---- Main scan ---- */
router.post("/", async (_req, res) => {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  const toNotify: Array<{ id: string; broker: string; url: string; title: string; price?: string; location?: string }> = [];
  const foundCountByBroker: Record<string, number> = {};

  try {
    const active = await db.select().from(brokers).where(eq(brokers.isActive as any, true));
    if (!active.length) return res.status(400).json({ ok: false, error: "no_brokers" });

    // No executablePath: let Puppeteer use the Chrome installed in your project cache
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
      timeout: 120_000,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);
    page.setDefaultNavigationTimeout(60_000);

    for (const b of active) {
      try {
        await page.goto(b.website, { waitUntil: "domcontentloaded" });

        const cfg: ScrapeCfg = (b as any).scrapingPath ?? (b as any).scraping_path;
        await runActions(page, cfg);
        let items = await extract(page, b.website, cfg);

        // Include/exclude regex filters (optional)
        if (cfg && !Array.isArray(cfg) && typeof cfg === "object") {
          const inc = (cfg as any).include ? new RegExp((cfg as any).include) : null;
          const exc = (cfg as any).exclude ? new RegExp((cfg as any).exclude) : null;
          items = items.filter(({ url, title }) => {
            const hay = `${title} ${url}`;
            if (inc && !inc.test(hay)) return false;
            if (exc && exc.test(hay)) return false;
            return true;
          });
        }

        foundCountByBroker[b.name] = items.length;

        for (const it of items) {
          const existing = await db
            .select({ id: listings.id, notifiedAt: (listings as any).notifiedAt ?? (listings as any).notified_at })
            .from(listings)
            .where(eq((listings as any).website, it.url))
            .limit(1);

          if (existing.length === 0) {
            const inserted = await db
              .insert(listings)
              .values({
                brokerId: (b as any).id,
                title: it.title || it.url,
                website: it.url,
                price: it.price || null,
                location: it.location || null,
              } as any)
              .returning({ id: listings.id });

            toNotify.push({
              id: inserted[0].id,
              broker: b.name,
              url: it.url,
              title: it.title || it.url,
              price: it.price,
              location: it.location,
            });
          } else {
            const notifiedAt = (existing[0] as any).notifiedAt ?? (existing[0] as any).notified_at;
            if (!notifiedAt) {
              toNotify.push({
                id: (existing[0] as any).id,
                broker: b.name,
                url: it.url,
                title: it.title || it.url,
                price: it.price,
                location: it.location,
              });
            }
          }
        }
      } catch (e: any) {
        console.error(`Scan error for ${b.name}:`, e?.message || e);
      }
    }

    // Push new listings to HubSpot
    for (const n of toNotify) {
      await createDealForListing({
        title: n.title,
        website: n.url,
        price: n.price || null,
        location: n.location || null,
        brokerName: n.broker,
        firstSeenISO: new Date().toISOString(),
      });
    }

    // Optional summary email
    if (toNotify.length > 0) {
      const html = toNotify.map(l =>
        `<p><strong>${l.broker}</strong> — ${clean(l.title)}${l.price ? ` · <em>${clean(l.price)}</em>` : ""}${l.location ? ` · ${clean(l.location)}` : ""}<br/><a href="${l.url}">${l.url}</a></p>`
      ).join("");

      await sendEmail({
        to: process.env.ALERT_EMAIL || "you@example.com",
        from: process.env.FROM_EMAIL || "alerts@broker-monitoring-system.com",
        subject: `New MSP/IT-services listings (${toNotify.length})`,
        html,
      });
    }

    // Mark as notified
    for (const n of toNotify) {
      await db.update(listings)
        .set({ [(listings as any).notifiedAt ? "notifiedAt" : "notified_at"]: new Date() } as any)
        .where(eq(listings.id as any, n.id as any));
    }

    res.json({
      ok: true,
      scannedBrokers: active.length,
      foundCounts: foundCountByBroker,
      notifiedCount: toNotify.length,
      preview: toNotify.slice(0, 3),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

export default router;
