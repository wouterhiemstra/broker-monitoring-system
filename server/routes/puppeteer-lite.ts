import puppeteer from "puppeteer";

export async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--no-first-run"
    ],
    defaultViewport: { width: 1280, height: 800 }
  });
}

export async function slimPage(page: import("puppeteer").Page) {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const t = req.resourceType();
    if (t === "image" || t === "media" || t === "font") return req.abort();
    req.continue();
  });
}
