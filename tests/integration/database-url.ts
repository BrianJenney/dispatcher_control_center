import { existsSync } from "node:fs";

export function testDatabaseUrl() {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  const url = new URL(base);
  url.pathname = "/dispatch_test";
  return url.toString();
}
