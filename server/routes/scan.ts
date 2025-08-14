import { Router } from "express";
import puppeteer from "puppeteer";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { db } from "../db";
import { brokers, listings } from "../../shared/schema";
import { createDealForListing } from "../integrations/hubspot";
import { eq } from "drizzle-orm"; // ✅ Added

const router = Router();

/* ---------------- Email setup (optional) ---------------- */
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

type ScrapeCfg =
  | {
      list: string;
      link?: string;
      title?: string;
      price?: string;
      location?: string;
      actions?: Array<{ click?: string; waitFor?: string } | { type: "sleep"; ms: number }>;
      include?: string;
      exclude?: string;
    }
  | string[]
  | undefined;

async function runActions(page: puppeteer.Page, cfg?: ScrapeCfg) {
  const obj = (cfg && !Array.isArray(cfg)) ? (cfg as any) : null;
  const actions: any[] = obj?.actions || [];
  for (const a of actions) {
    if (a.click) {
      await page.click(a.click);
      if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 15000 });
    } else if (a.type === "sleep" && a.ms) {
      await new Promise(r => setTimeout(r, a.ms));
    }
  }
}

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
  } else if (cfg && typeof cfg === "object" && cfg.list) {
    const { list, link, title, price, location } = cfg;
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
  } else {
    const anchors = await page.$$eval("a[href]", (els) =>
      els.map((a) => ({
        href: (a as HTMLAnchorElement).getAttribute("href") || "",
        title: (a.textContent || "").replace(/\s+/g, " ").trim(),
      }))
    );
    for (const a of anchors) {
      const url = toAbs(baseUrl, (a as any).href);
      if (url) out.push({ url, title: clean((a as any).title) || url });
    }
  }
  const seen = new Set<string>();
  return out.filter(r => (r.url && !seen.has(r.url) && seen.add(r.url)));
}

router.get("/", (_req, res) => {
  res.json({ ok: true, hint: "Use POST /api/scan to start the real scan" });
});

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

router.post("/", async (_req, res) => {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  const toNotify: any[] = [];
  const foundCountByBroker: Record<string, number> = {};

  try {
    const rows = await db.select().from(brokers).where(eq(brokers.isActive, true)); // ✅ FIXED
    if (!rows.length) return res.status(400).json({ ok: false, error: "no_brokers" });

    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH || (await puppeteer.executablePath());
    browser = await puppeteer.launch({
      headless: true,
      executablePath: exePath,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-zygote","--single-process"],
      timeout: 120_000
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);
    page.setDefaultNavigationTimeout(60_000);

    for (const b of rows) {
      try {
        await page.goto(b.website, { waitUntil: "domcontentloaded" });

        const cfg: ScrapeCfg = (b as any).scrapingPath ?? (b as any).scraping_path;
        await runActions(page, cfg);
        let items = await extract(page, b.website, cfg);

        if (cfg && !Array.isArray(cfg) && typeof cfg === "object") {
          const inc = cfg.include ? new RegExp(cfg.include) : null;
          const exc = cfg.exclude ? new RegExp(cfg.exclude) : null;
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
            .where(eq(listings.website as any, it.url)) // ✅ FIXED
            .limit(1);

          if (existing.length === 0) {
            const inserted = await db
              .insert(listings)
              .values({
                brokerId: b.id,
                title: it.title || it.url,
                website: it.url,
                price: it.price || null,
                location: it.location || null,
              } as any)
              .returning({ id: listings.id });

            toNotify.push({ id: inserted[0].id, broker: b.name, url: it.url, title: it.title || it.url, price: it.price, location: it.location });
          } else {
            const notifiedAt = (existing[0] as any).notifiedAt ?? (existing[0] as any).notified_at;
            if (!notifiedAt) {
              toNotify.push({ id: existing[0].id as any, broker: b.name, url: it.url, title: it.title || it.url, price: it.price, location: it.location });
            }
          }
        }
      } catch (e: any) {
        console.error(`Scan error for ${b.name}:`, e?.message || e);
      }
    }

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

    for (const n of toNotify) {
      await db.update(listings)
        .set({ [(listings as any).notifiedAt ? "notifiedAt" : "notified_at"]: new Date() } as any)
        .where(eq(listings.id as any, n.id as any)); // ✅ FIXED
    }

    res.json({
      ok: true,
      scannedBrokers: rows.length,
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
