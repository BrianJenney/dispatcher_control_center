import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const components = process.argv.slice(2);
if (components.length === 0) {
  console.error("Usage: pnpm ui:add <component> [...components]");
  process.exit(2);
}

const added = spawnSync("pnpm", ["dlx", "shadcn@4.21.4", "add", ...components], { stdio: ["pipe", "inherit", "inherit"], input: "n\n".repeat(20) });
if (added.status !== 0) process.exit(added.status ?? 1);

const manifest: unknown = JSON.parse(readFileSync("package.json", "utf8"));
const hasStrayCn =
  typeof manifest === "object" &&
  manifest !== null &&
  "dependencies" in manifest &&
  typeof manifest.dependencies === "object" &&
  manifest.dependencies !== null &&
  "cn" in manifest.dependencies;
if (hasStrayCn) spawnSync("pnpm", ["remove", "cn"], { stdio: "inherit" });

const uiDir = path.join("src", "components", "ui");
for (const file of readdirSync(uiDir).filter((name) => name.endsWith(".tsx"))) {
  const target = path.join(uiDir, file);
  const source = readFileSync(target, "utf8");
  const fixed = source.replaceAll('from "cn"', 'from "@/components/ui/utils"');
  if (fixed !== source) writeFileSync(target, fixed);
}
console.log("Added. Run pnpm lint to check the new components against the house rules.");
