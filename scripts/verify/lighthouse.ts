import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type BrowserContext } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

export type ViewportName = "phone" | "desktop";

export type BrowserStorage = Awaited<ReturnType<BrowserContext["storageState"]>>;

const categories = ["performance", "accessibility", "best-practices"] as const;
const metrics = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
] as const;

async function profileWithStorage(chromePath: string, storage: BrowserStorage) {
  const userDataDir = mkdtempSync(path.join(tmpdir(), "verify-lighthouse-"));
  const context = await chromium.launchPersistentContext(userDataDir, { executablePath: chromePath, headless: true });
  try {
    await context.addCookies(storage.cookies);
    const page = await context.newPage();
    for (const { origin, localStorage } of storage.origins) {
      await page.route(`${origin}/`, (route) => route.fulfill({ contentType: "text/html", body: "" }));
      await page.goto(`${origin}/`);
      await page.evaluate((entries) => {
        for (const entry of entries) window.localStorage.setItem(entry.name, entry.value);
      }, localStorage);
      await page.unrouteAll();
    }
  } finally {
    await context.close();
  }
  return userDataDir;
}

export async function runLighthouse(options: {
  url: string;
  chromePath: string;
  storage: BrowserStorage;
  viewport: ViewportName;
}) {
  const userDataDir = await profileWithStorage(options.chromePath, options.storage);
  const chrome = await launch({
    chromePath: options.chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
    userDataDir,
  });
  try {
    const result = await lighthouse(
      options.url,
      {
        port: chrome.port,
        output: "html",
        logLevel: "error",
        onlyCategories: [...categories],
      },
      options.viewport === "desktop" ? desktopConfig : undefined,
    );
    if (!result) throw new Error(`Lighthouse returned no result for ${options.url}`);
    const scores = Object.fromEntries(
      categories.map((category) => {
        const score = result.lhr.categories[category]?.score;
        return [category, typeof score === "number" ? Math.round(score * 100) : null];
      }),
    );
    const measured = Object.fromEntries(metrics.map((metric) => [metric, result.lhr.audits[metric]?.displayValue ?? null]));
    const html = typeof result.report === "string" ? result.report : result.report.join("");
    return { scores, metrics: measured, html };
  } finally {
    chrome.kill();
    rmSync(userDataDir, { recursive: true, force: true });
  }
}
