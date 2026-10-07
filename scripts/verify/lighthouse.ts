import { launch } from "chrome-launcher";
import lighthouse, { desktopConfig } from "lighthouse";

export type ViewportName = "phone" | "desktop";

const categories = ["performance", "accessibility", "best-practices"] as const;
const metrics = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
] as const;

export async function runLighthouse(options: { url: string; chromePath: string; cookie: string; viewport: ViewportName }) {
  const chrome = await launch({
    chromePath: options.chromePath,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const result = await lighthouse(
      options.url,
      {
        port: chrome.port,
        output: "html",
        logLevel: "error",
        onlyCategories: [...categories],
        extraHeaders: { Cookie: options.cookie },
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
  }
}
