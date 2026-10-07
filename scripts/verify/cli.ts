import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, openSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium, type Browser, type Page } from "@playwright/test";
import { launchApp, stopApp, waitForApp } from "../lib/app-server";
import { databaseUrlNamed, freshDatabase } from "../lib/database";
import { signInAsDemoUser } from "../lib/demo-session";
import { flows, type Flow } from "./flows";
import { runLighthouse, type ViewportName } from "./lighthouse";

const port = 3200;
const evidenceRoot = ".verify";

const viewportSizes: Record<ViewportName, { width: number; height: number; isMobile: boolean }> = {
  phone: { width: 375, height: 812, isMobile: true },
  desktop: { width: 1440, height: 900, isMobile: false },
};

type StepResult = { name: string; outcome: "pass" | "fail" | "skipped"; error?: string };
type ConsoleEntry = { type: string; text: string };
type Timing = { method: string; path: string; status: number; ms: number };
type AxeViolation = { id: string; impact: string | null; help: string; targets: string[] };

type ViewportRun = {
  viewport: ViewportName;
  steps: StepResult[];
  console: ConsoleEntry[];
  timings: Timing[];
  axe: AxeViolation[];
  lighthouse: { scores: Record<string, number | null>; metrics: Record<string, string | null> } | null;
};

function parseArgs(argv: string[]) {
  const names = argv.filter((arg) => !arg.startsWith("--"));
  const selected = argv.includes("--all") ? Object.keys(flows) : names;
  const unknown = selected.filter((name) => !(name in flows));
  if (selected.length === 0 || unknown.length > 0) {
    console.error(`Usage: pnpm verify <flow> [--phone] [--all] [--skip-build]`);
    console.error(`Known flows: ${Object.keys(flows).join(", ")}`);
    if (unknown.length > 0) console.error(`Unknown: ${unknown.join(", ")}`);
    process.exit(2);
  }
  const viewports: ViewportName[] = argv.includes("--phone") ? ["phone"] : ["phone", "desktop"];
  return { flowNames: selected, viewports, skipBuild: argv.includes("--skip-build") };
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function watch(page: Page, baseUrl: string) {
  const consoleEntries: ConsoleEntry[] = [];
  const timings: Timing[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleEntries.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("pageerror", (error) => consoleEntries.push({ type: "pageerror", text: error.message }));
  page.on("requestfinished", (request) => {
    if (!request.url().startsWith(baseUrl)) return;
    void request.response().then((response) => {
      timings.push({
        method: request.method(),
        path: new URL(request.url()).pathname,
        status: response?.status() ?? 0,
        ms: Math.round(request.timing().responseEnd),
      });
    });
  });
  return { consoleEntries, timings };
}

async function settle(page: Page) {
  await page
    .waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running"), null, {
      timeout: 2_000,
    })
    .catch(() => undefined);
}

async function runViewport(browser: Browser, baseUrl: string, flow: Flow, viewport: ViewportName, outDir: string) {
  const size = viewportSizes[viewport];
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: size.width, height: size.height },
    isMobile: size.isMobile,
    hasTouch: size.isMobile,
  });
  const page = await context.newPage();
  const watched = watch(page, baseUrl);
  if (flow.startsSignedIn) await signInAsDemoUser(page.request, baseUrl);

  const steps: StepResult[] = [];
  for (const [index, step] of flow.steps.entries()) {
    const stepDir = path.join(outDir, `${String(index + 1).padStart(2, "0")}-${slug(step.name)}`);
    mkdirSync(stepDir, { recursive: true });
    if (steps.some((result) => result.outcome === "fail")) {
      steps.push({ name: step.name, outcome: "skipped" });
      continue;
    }
    const error = await step.run(page).then(
      () => null,
      (failure: unknown) => (failure instanceof Error ? failure.message : String(failure)),
    );
    await settle(page);
    await page.screenshot({ path: path.join(stepDir, `${viewport}.png`), fullPage: true });
    steps.push(error ? { name: step.name, outcome: "fail", error } : { name: step.name, outcome: "pass" });
  }

  const axe = await new AxeBuilder({ page }).analyze();
  const cookie = (await context.cookies()).map((entry) => `${entry.name}=${entry.value}`).join("; ");
  await context.close();

  return {
    viewport,
    steps,
    console: watched.consoleEntries,
    timings: watched.timings,
    cookie,
    axe: axe.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    })),
  };
}

function summarize(flowName: string, flow: Flow, runs: ViewportRun[]) {
  const passed = runs.every((run) => run.steps.every((step) => step.outcome === "pass"));
  const errors = runs.flatMap((run) => run.console.filter((entry) => entry.type !== "warning"));
  const commit = execSync("git rev-parse --short HEAD").toString().trim();
  const lines = [
    `# Verify: ${flowName}`,
    "",
    `Route \`${flow.route}\`, commit \`${commit}\`, run at ${new Date().toISOString()}.`,
    "",
    `**Result: ${passed && errors.length === 0 ? "PASS" : "FAIL"}**`,
    "",
    "## Steps",
    "",
    `| Step | ${runs.map((run) => run.viewport).join(" | ")} |`,
    `|---|${runs.map(() => "---").join("|")}|`,
    ...flow.steps.map(
      (step, index) => `| ${step.name} | ${runs.map((run) => run.steps[index]?.outcome ?? "skipped").join(" | ")} |`,
    ),
    ...runs.flatMap((run) =>
      run.steps.filter((step) => step.error).map((step) => `\n${run.viewport}, "${step.name}": ${step.error ?? ""}`),
    ),
    "",
    "## Console",
    "",
    ...(runs.every((run) => run.console.length === 0)
      ? ["No errors or warnings."]
      : runs.flatMap((run) => run.console.map((entry) => `- ${run.viewport} ${entry.type}: ${entry.text}`))),
    "",
    "## Accessibility (axe)",
    "",
    ...runs.map((run) =>
      run.axe.length === 0
        ? `- ${run.viewport}: no violations`
        : `- ${run.viewport}: ${run.axe.map((violation) => `${violation.id} (${violation.impact ?? "unknown"})`).join(", ")}`,
    ),
    "",
    "## Lighthouse",
    "",
    "| Viewport | Performance | Accessibility | Best practices | LCP | CLS | TBT |",
    "|---|---|---|---|---|---|---|",
    ...runs.map((run) => {
      const lighthouse = run.lighthouse;
      if (!lighthouse) return `| ${run.viewport} | not run | | | | | |`;
      const score = (category: string) => String(lighthouse.scores[category] ?? "n/a");
      const metric = (name: string) => lighthouse.metrics[name] ?? "n/a";
      return `| ${run.viewport} | ${score("performance")} | ${score("accessibility")} | ${score("best-practices")} | ${metric("largest-contentful-paint")} | ${metric("cumulative-layout-shift")} | ${metric("total-blocking-time")} |`;
    }),
    "",
    "## Slowest requests",
    "",
    "| Viewport | Request | Status | ms |",
    "|---|---|---|---|",
    ...runs.flatMap((run) =>
      [...run.timings]
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 5)
        .map((timing) => `| ${run.viewport} | ${timing.method} ${timing.path} | ${String(timing.status)} | ${String(timing.ms)} |`),
    ),
    "",
  ];
  return { passed: passed && errors.length === 0, markdown: lines.join("\n") };
}

async function verifyFlow(browser: Browser, baseUrl: string, flowName: string, flow: Flow, viewports: ViewportName[]) {
  const outDir = path.join(evidenceRoot, flowName);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const runs: ViewportRun[] = [];
  for (const viewport of viewports) {
    console.log(`  ${flowName} at ${viewport} width`);
    const { cookie, ...run } = await runViewport(browser, baseUrl, flow, viewport, outDir);
    const lighthouse = await runLighthouse({
      url: `${baseUrl}${flow.route}`,
      chromePath: chromium.executablePath(),
      cookie,
      viewport,
    }).catch((error: unknown) => {
      console.error(`  Lighthouse failed at ${viewport}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    if (lighthouse) writeFileSync(path.join(outDir, `lighthouse-${viewport}.html`), lighthouse.html);
    runs.push({ ...run, lighthouse: lighthouse ? { scores: lighthouse.scores, metrics: lighthouse.metrics } : null });
  }

  const write = (name: string, data: unknown) => {
    writeFileSync(path.join(outDir, name), `${JSON.stringify(data, null, 2)}\n`);
  };
  write("console.json", Object.fromEntries(runs.map((run) => [run.viewport, run.console])));
  write("axe.json", Object.fromEntries(runs.map((run) => [run.viewport, run.axe])));
  write("lighthouse.json", Object.fromEntries(runs.map((run) => [run.viewport, run.lighthouse])));
  write("timings.json", Object.fromEntries(runs.map((run) => [run.viewport, run.timings])));
  const summary = summarize(flowName, flow, runs);
  writeFileSync(path.join(outDir, "summary.md"), summary.markdown);
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = databaseUrlNamed("dispatch_verify");

  console.log("Recreating and seeding the verify database");
  await freshDatabase(databaseUrl, { seed: true });

  if (!args.skipBuild) {
    console.log("Building the app");
    const build = spawnSync("pnpm", ["build"], { stdio: "inherit" });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }

  mkdirSync(evidenceRoot, { recursive: true });
  const serverLog = openSync(path.join(evidenceRoot, "server.log"), "w");
  const { baseUrl, child } = launchApp({ port, databaseUrl, mode: "start", stdio: ["ignore", serverLog, serverLog] });
  const browser = await chromium.launch();
  let allPassed = true;
  try {
    await waitForApp(baseUrl);
    for (const flowName of args.flowNames) {
      const flow = flows[flowName];
      if (!flow) continue;
      const summary = await verifyFlow(browser, baseUrl, flowName, flow, args.viewports);
      allPassed &&= summary.passed;
      console.log(`\n${summary.markdown}`);
      console.log(`Evidence written to ${path.join(evidenceRoot, flowName)}/`);
    }
  } finally {
    await browser.close();
    stopApp(child);
  }
  process.exit(allPassed ? 0 : 1);
}

await main();
