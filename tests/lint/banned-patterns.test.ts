import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const fixtures = path.join(import.meta.dirname, "fixtures", "src");
const eslint = new ESLint({ ignore: false });

async function ruleIds(fixture: string): Promise<(string | null)[]> {
  const results = await eslint.lintFiles([path.join(fixtures, fixture)]);
  return results.flatMap((result) => result.messages.map((message) => message.ruleId));
}

const banned = [
  { pattern: "a code comment", fixture: "server/comment.ts", rule: "local/no-comments" },
  { pattern: "any", fixture: "server/explicit-any.ts", rule: "@typescript-eslint/no-explicit-any" },
  {
    pattern: "a non-null assertion",
    fixture: "server/non-null-assertion.ts",
    rule: "@typescript-eslint/no-non-null-assertion",
  },
  { pattern: "@ts-ignore", fixture: "server/ts-ignore.ts", rule: "@typescript-eslint/ban-ts-comment" },
  { pattern: "a disabled lint rule", fixture: "server/eslint-disable.ts", rule: "local/no-comments" },
  {
    pattern: "a type assertion",
    fixture: "server/type-assertion.ts",
    rule: "@typescript-eslint/consistent-type-assertions",
  },
  { pattern: "a hard-coded secret", fixture: "server/hardcoded-secret.ts", rule: "local/no-hardcoded-secrets" },
  { pattern: "a secret as a default value", fixture: "server/secret-default.ts", rule: "local/no-hardcoded-secrets" },
  { pattern: "process.env outside @/env", fixture: "server/reads-process-env.ts", rule: "no-restricted-properties" },
  { pattern: "a relative parent import", fixture: "server/relative-parent-import.ts", rule: "no-restricted-imports" },
  { pattern: "importing src/db outside src/server", fixture: "app/imports-db.tsx", rule: "no-restricted-imports" },
  { pattern: "fetching in useEffect", fixture: "components/fetch-in-effect.tsx", rule: "local/no-fetch-in-effect" },
  { pattern: "I/O imports in src/domain", fixture: "domain/imports-next.ts", rule: "no-restricted-imports" },
];

describe("banned patterns fail lint", () => {
  it.each(banned)("$pattern is rejected by $rule", async ({ fixture, rule }) => {
    expect(await ruleIds(fixture)).toContain(rule);
  });

  it("a disabled lint rule does not switch the rule off", async () => {
    expect(await ruleIds("server/eslint-disable.ts")).toContain("@typescript-eslint/no-explicit-any");
  });

  it("clean domain code passes", async () => {
    expect(await ruleIds("domain/clean.ts")).toEqual([]);
  });
});
