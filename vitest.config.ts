import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/integration/database-url";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "domain", include: ["src/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: { name: "lint", include: ["tests/lint/**/*.test.ts"], testTimeout: 60_000 },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          env: { DATABASE_URL: testDatabaseUrl() },
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
