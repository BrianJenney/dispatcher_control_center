import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ["src/domain/**/*.test.ts"], environment: "node" },
});
