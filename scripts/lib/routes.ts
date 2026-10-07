import { readdirSync } from "node:fs";
import path from "node:path";

const appDir = path.join("src", "app");

function routesUnder(dir: string, file: RegExp, segments: string[] = []): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (entry.name.startsWith("_")) return [];
      const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
      return routesUnder(path.join(dir, entry.name), file, isGroup ? segments : [...segments, entry.name]);
    }
    return file.test(entry.name) ? [`/${segments.join("/")}`] : [];
  });
}

export function pageRoutes(): string[] {
  return routesUnder(appDir, /^page\.(tsx|ts)$/).filter((route) => !route.startsWith("/api"));
}

export function apiRoutes(): string[] {
  return routesUnder(appDir, /^route\.(tsx|ts)$/);
}

export function withSampleParams(route: string, sample = "4f1c2b8e-3a6d-4e2f-9b1a-7c5d8e9f0a1b"): string {
  return route.replace(/\[\.\.\.[^\]]+\]/g, "session").replace(/\[[^\]]+\]/g, sample);
}
