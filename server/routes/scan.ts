// server/routes/scan.ts
import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import puppeteer from "puppeteer";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { db } from "../db";
import { brokers, listings } from "../../shared/schema";
import { createDealForListing } from "../integrations/hubspot";
import { launchBrowser, slimPage } from "./puppeteer-lite";

const router = Router();

/* ========== Email (optional) ========== */
const SENDGRID_KEY = process.env.SENDGRID_API_KEY || "";
if (SENDGRID_KEY) sgMail.setApiKey(SENDGRID_KEY);

async function sendEmail(opts: { to: string; from: string; subject: string; html: string }) {
  if (SENDGRID_KEY) { await sgMail.send(opts); return; }
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) { console.log(`[email skipped] ${opts.subject}`); return; }
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail(opts);
}

/* ========== Utils ========== */
const clean = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
const toAbs = (base: string, href?: string | null) => { try { return href ? new URL(href, base).toString() : null; } catch { return null; } };

type Action =
  | { click: string; waitFor?: string }                               // CSS click
  | { clickText: string; within?: string; waitFor?: string }          // visible text click (no XPath)
  | { select: { selector: string; value?: string; text?: string }; waitFor?: string }
  | { scrollUntilText: string; maxScrolls?: number }
  | { type: "sleep"; ms: number }
  | { waitFor: string };

type ScrapeCfg =
  | { actions?: Action[]; include?: string; exclude?: string; list?: string; link?: string; title?: string; price?: string; location?: string; }
  | string[]
  | undefined;

/* ========== Action helpers (NO $x) ========== */
async function clickAndMaybeNavigate(page: puppeteer.Page, fn: () => Promise<void>) {
  const nav = page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
  await fn();
  await Promise.race([nav, page.waitForTimeout(300)]);
}

async function clickByText(page: puppeteer.Page, text: string, within?: string) {
  const needle = text.trim().toLowerCase();
  const rootSel = within || "body";
  const ok = await page.evaluate((t, root) => {
    const container = document.querySelector(root) || document.body;
    const nodes = container.querySelectorAll("button,a,[role='button'],li,div,span,label,input");
    for (const el of Array.from(nodes) as HTMLElement[]) {
      const txt = (el.innerText || (el as any).value || el.textContent || "").trim().toLowerCase();
      if (txt && txt.includes(t)) { el.click(); return true; }
    }
    return false;
  }, needle, rootSel);
  if (!ok) throw new Error(`clickText not found: ${text}`);
}

async function runActions(page: puppeteer.Page, cfg?: ScrapeCfg) {
  const obj = (cfg && !Array.isArray(cfg)) ? (cfg as any) : null;
  const actions: Action[] = obj?.actions || [];
  for (const a of actions) {
    if ("click" in a) {
      await page.waitForSelector(a.click, { timeout: 15000 });
      await clickAndMaybeNavigate(page, () => page.click(a.click));
      if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 15000 });
      continue;
    }
    if ("clickText" in a) {
      await clickAndMaybeNavigate(page, () => clickByText(page, a.clickText, (a as any).within));
      if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 15000 });
      continue;
    }
    if ("select" in a) {
      const { selector, value, text } = a.select;
      await page.waitForSelector(selector, { timeout: 15000 });
      if (value) await page.select(selector, value);
      else if (text) {
        await page.$eval(selector, (el, t) => {
          const sel = el as HTMLSelectElement;
          const opt = Array.from(sel.options).find(o => o.text.trim() === String(t).trim());
          if (!opt) throw new Error(`select text not found: ${t}`);
          sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true }));
        }, text);
      } else throw new Error("select: provide value or text");
      if (a.waitFor) await page.waitForSelector(a.waitFor, { timeout: 15000 });
      continue;
    }
    if ("scrollUntilText" in a) {
      const target = String(a.scrollUntilText).toLowerCase().trim();
      const max = Number(a.maxScrolls ?? 20);
      let found = false;
      for (let i = 0; i < max; i++) {
        const seen = await page.evaluate((t) => {
          const all = document.querySelectorAll("body *");
          for (const el of Array.from(all) as HTMLElement[]) {
            const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
            if (txt && txt.includes(t)) return true;
          }
          return false;
        }, target);
        if (seen) { found = true; break; }
        await page.evaluate(() => window.scrollBy(0, Math.floor(window.innerHeight * 0.9)));
        await page.waitForTimeout(600);
      }
      if (!found) console.warn(`[actions] scrollUntilText: "${a.scrollUntilText}" not found after ${max} scrolls`);
      continue;
    }
    if ("waitFor" in a) { await page.waitForSelector(a.waitFor, { timeout: 15000 }); continue; }
    if ((a as any).type === "sleep") { await page.waitForTimeout((a as any).ms); continue; }
  }
}

/* ========== Extraction ========== */
async function extract(page: puppeteer.Page, baseUrl: string, cfg?: ScrapeCfg) {
  const out: Array<{ url: string; title: string; price?: string; location?: string }> = [];

  if (Array.isArray(cfg)) {
    const [listSel, linkSel] = cfg;
    if (listSel) {
      const items = await page.$$eval(listSel, (els, linkSelIn) => {
        const res: any[] = [];
        for (const el of els as Element[]) {
          const a = linkSelIn ? el.querySelector(linkSelIn as string)
            : (el.tagName.toLowerCase() === "a" ? el : el.querySelector("a"));
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
  } else {
    const sel = (cfg && typeof cfg === "object") ? (cfg as any) : {};
    const listSel = sel.list as string | undefined;
    const linkSel = sel.link as string | undefined;
    const titleSel = sel.title as string | undefined;
    const priceSel = sel.price as string | undefined;
    const locSel = sel.location as string | undefined;

    if (listSel) {
      const items = await page.$$eval(
        listSel,
        (els, sels) => {
          const res: any[] = [];
          const { linkSel, titleSel, priceSel, locSel } = sels as any;
          for (const el of els as Element[]) {
            const a: Element | null =
              (linkSel && el.querySelector(linkSel)) ||
              (el.tagName.toLowerCase() === "a" ? el : el.querySelector("a"));
            const href = (a as HTMLAnchorElement | null)?.getAttribute("href") || "";
            const t = titleSel ? el.querySelector(titleSel)?.textContent : a?.textContent || el.textContent;
            const p = priceSel ? el.querySelector(priceSel)?.textContent : null;
            const loc = locSel ? el.querySelector(locSel)?.textContent : null;
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
        { linkSel, titleSel, priceSel, locSel }
      );
      for (const it of items) {
        const url = toAbs(baseUrl, (it as any).href);
        if (url) out.push({ url, title: clean((it as any).title) || url, price: clean((it as any).price), location: clean((it as any).location) });
      }
    } else {
      const items = await page.$$eval(
        "article a[href], .listing a[href], li.result-item a[href], .result a[href], a.listing-title, h2 a",
        (links) => {
          const res: any[] = [];
          for (const a of links as HTMLAnchorElement[]) {
            const href = a.getAttribute("href") || "";
            const text = (a.textContent || "").replace(/\s+/g, " ").trim();
            if (!href || text.length < 8) continue;
            if (href.startsWith("#")) continue;
            const bad = ["login", "signup", "privacy", "terms", "contact", "cookie"];
            if (bad.some(b => href.toLowerCase().includes(b))) continue;
            res.push({ href, title: text });
          }
          return res;
        }
      );
      for (const it of items) {
        const url = toAbs(baseUrl, (it as any).href);
        if (url) out.push({ url, title: clean((it as any).title) || url });
      }
    }
  }

  const seen = new Set<string>();
  return out.filter(r => (r.url && !seen.has(r.url) && seen.add(r.url)));
}

/* ========== Info route ========== */
router.get("/", (_req, res) => res.json({ ok: true, hint: "POST /api/scan  (body: { only: 'rightbiz' } optional)" }));

/* ========== Main scan ========== */
router.post("/", async (req: Request, res: Response) => {
  const toNotify: Array<{ id: any; broker: string; url: string; title: string; price?: string; location?: string }> = [];
  const foundCountByBroker: Record<string, number> = {};

  const allBrokers = await db.select().from(brokers);
  const only = typeof req.body?.only === "string" ? req.body.only.toLowerCase().trim() : "";
  const targets = only
    ? allBrokers.filter(b => (b as any).name?.toLowerCase() === only)
    : allBrokers.filter(b => ((b as any).is_active ?? (b as any).isActive ?? true) === true);

  if (targets.length === 0) return res.status(400).json({ ok: false, error: only ? `no_broker_named_${only}` : "no_brokers" });

  const browser = await launchBrowser();

  try {
    for (const b of targets) {
      const brokerName: string = (b as any).name || "Unknown";
      const baseUrl: string = (b as any).website || "";
      const cfg: ScrapeCfg = (b as any).scrapingPath ?? (b as any).scraping_path;

      if (!baseUrl) { foundCountByBroker[brokerName] = 0; continue; }

      const page = await browser.newPage();

      try {
        await slimPage(page);
        page.setDefaultTimeout(60_000);
        page.setDefaultNavigationTimeout(60_000);

        await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await runActions(page, cfg);
        let items = await extract(page, baseUrl, cfg);

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

        foundCountByBroker[brokerName] = items.length;

        for (const it of items) {
          const existing = await db
            .select({ id: listings.id, notifiedAt: listings.notified_at })
            .from(listings)
            .where(eq(listings.link, it.url))
            .limit(1);

          if (existing.length === 0) {
            const inserted = await db
              .insert(listings)
              .values({
                broker_id: (b as any).id,
                title: it.title || it.url,
                link: it.url,
                price: it.price || null,
                location: it.location || null,
              } as any)
              .returning({ id: listings.id });

            toNotify.push({
              id: inserted[0].id,
              broker: brokerName,
              url: it.url,
              title: it.title || it.url,
              price: it.price,
              location: it.location,
            });
          } else {
            const notifiedAt = (existing[0] as any)?.notifiedAt ?? null;
            if (!notifiedAt) {
              toNotify.push({
                id: (existing[0] as any).id,
                broker: brokerName,
                url: it.url,
                title: it.title || it.url,
                price: it.price,
                location: it.location,
              });
            }
          }
        }
      } catch (e: any) {
        console.error(`Scan error for ${brokerName}:`, e?.message || e);
      } finally {
        try { await page.close(); } catch {}
      }
    }

    // HubSpot push
    for (const n of toNotify) {
      try {
        await createDealForListing({
          title: n.title,
          website: n.url,
          price: n.price || null,
          location: n.location || null,
          brokerName: n.broker,
          firstSeenISO: new Date().toISOString(),
        });
      } catch (e: any) {
        console.error("HubSpot error:", e?.message || e);
      }
    }

    // mark notified
    for (const n of toNotify) {
      await db.update(listings)
        .set({ notified_at: new Date() } as any)
        .where(eq(listings.id as any, n.id as any));
    }

    res.json({ ok: true, scannedBrokers: targets.length, foundCounts: foundCountByBroker, notifiedCount: toNotify.length, preview: toNotify.slice(0, 3) });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  } finally {
    try { await browser.close(); } catch {}
  }
});

export default router;
