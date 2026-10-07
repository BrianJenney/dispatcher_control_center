import { readFileSync } from "node:fs";
import { pageRoutes } from "./lib/routes";
import { flows } from "./verify/flows";

const featureMap = ".claude/skills/verify/feature-map.md";

function codeIn(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
}

const rows = readFileSync(featureMap, "utf8")
  .split("\n")
  .filter((line) => line.startsWith("|"))
  .map((line) => line.split("|").map((cell) => cell.trim()))
  .map((cells) => ({ flows: codeIn(cells[1] ?? ""), routes: codeIn(cells[3] ?? "") }));

const mappedRoutes = new Set(rows.flatMap((row) => row.routes));
const problems = [
  ...pageRoutes()
    .filter((route) => !mappedRoutes.has(route))
    .map((route) => `Route ${route} has no row in the feature map.`),
  ...Object.entries(flows)
    .filter(([name, flow]) => !rows.some((row) => row.flows.includes(name) && row.routes.includes(flow.route)))
    .map(([name, flow]) => `Verify flow "${name}" needs a feature map row with route ${flow.route}.`),
];

if (problems.length > 0) {
  console.error(`${featureMap} is out of date:\n${problems.map((problem) => `  ${problem}`).join("\n")}`);
  console.error("Add or fix a row with how a user reaches it and what working looks like.");
  process.exit(1);
}
console.log("Every page route and verify flow is in the feature map.");
