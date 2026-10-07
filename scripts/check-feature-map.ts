import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const appDir = "src/app";
const featureMap = ".claude/skills/verify/feature-map.md";

function pageRoutes(dir: string, segments: string[] = []): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name.startsWith("_")) return [];
      const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      return pageRoutes(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name]);
    }
    return /^page\.(tsx|ts|jsx|js)$/.test(entry.name) ? [`/${segments.join("/")}`] : [];
  });
}

function mappedRoutes(markdown: string): Set<string> {
  const routes = markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|")[3] ?? "")
    .flatMap((cell) => [...cell.matchAll(/`(\/[^`]*)`/g)].map((match) => match[1] ?? ""));
  return new Set(routes);
}

const routes = pageRoutes(appDir);
const mapped = mappedRoutes(readFileSync(featureMap, "utf8"));
const missing = routes.filter((route) => !mapped.has(route));

if (missing.length > 0) {
  console.error(`These routes are not in ${featureMap}:\n${missing.map((route) => `  ${route}`).join("\n")}`);
  console.error("Add a row for each with how a user reaches it and what working looks like.");
  process.exit(1);
}
console.log(`All ${String(routes.length)} page routes are in the feature map.`);
