import { readFileSync } from "node:fs";
import { pageRoutes } from "./lib/routes";
import { flows } from "./verify/flows";

const readme = "README.md";
const featureMapHeading = "## Feature map";

function codeIn(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
}

const featureMapSection = (readFileSync(readme, "utf8").split(featureMapHeading)[1] ?? "").split("\n## ")[0] ?? "";

const rows = featureMapSection
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
  console.error(`The "Feature map" table in ${readme} is out of date:\n${problems.map((problem) => `  ${problem}`).join("\n")}`);
  console.error("Add or fix a row with how a user reaches it and what working looks like.");
  process.exit(1);
}
console.log("Every page route and verify flow is in the feature map.");
