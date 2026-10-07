import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import local from "./eslint-rules/index.mjs";

const aliasOnly = {
  regex: "^\\.\\./",
  message: "Import across folders with the @/ alias.",
};

const strayCnPackage = {
  group: ["cn"],
  message: "Import cn from @/components/ui/utils. shadcn sometimes rewrites it to an unrelated npm package.",
};

function layer(...patterns) {
  return ["error", { patterns: [aliasOnly, strayCnPackage, ...patterns] }];
}

const outsideSrc = ["error", { patterns: [strayCnPackage] }];

const noDatabase = {
  group: ["@/db", "@/db/*", "drizzle-orm", "drizzle-orm/*", "pg"],
  message: "Only src/server touches the database. Call a query or an action instead.",
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "next-env.d.ts",
    "src/db/migrations/**",
    "tests/lint/fixtures/**",
    ".stryker-tmp/**",
    "reports/**",
    ".verify/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    linterOptions: { noInlineConfig: true },
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-expect-error": true, "ts-nocheck": true, "ts-check": true },
      ],
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    plugins: { local },
    rules: {
      "local/no-comments": "error",
      "local/no-fetch-in-effect": "error",
      "local/no-hardcoded-secrets": "error",
      "no-restricted-imports": outsideSrc,
    },
  },
  {
    files: ["**/src/**"],
    rules: { "no-restricted-imports": layer() },
  },
  {
    files: ["**/src/**"],
    ignores: ["**/src/env.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Read env vars through @/env." },
      ],
    },
  },
  {
    files: ["**/src/domain/**"],
    rules: {
      "no-restricted-imports": layer({
        regex: "^(?!zod$|@/domain/)",
        message: "src/domain is pure. Import only zod and other @/domain modules.",
      }),
    },
  },
  {
    files: ["**/src/db/**"],
    rules: {
      "no-restricted-imports": layer({
        group: ["@/server", "@/server/*", "@/app/*", "@/components/*", "next", "next/*", "react"],
        message: "src/db holds schema, migrations and seed. It depends only on @/domain and @/env.",
      }),
    },
  },
  {
    files: ["**/src/server/**"],
    rules: {
      "no-restricted-imports": layer({
        group: ["@/app/*", "@/components/*"],
        message: "src/server does not depend on UI code.",
      }),
    },
  },
  {
    files: ["**/src/app/**", "**/src/components/**"],
    rules: {
      "no-restricted-imports": layer(noDatabase),
    },
  },
]);
