import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { databaseUrlNamed } from "../scripts/lib/database";
import { apiRoutes, pageRoutes, withSampleParams } from "../scripts/lib/routes";

const publicPages = new Set(["/login"]);
const publicApi = new Set(["/api/health", "/api/auth/[...all]"]);
const forgedSession = "better-auth.session_token=forged-token.forged-signature";

type SeededRecords = { names: string[]; ids: Record<string, string> };

async function seededRecords(): Promise<SeededRecords> {
  const pool = new Pool({ connectionString: databaseUrlNamed("dispatch_e2e"), max: 1 });
  const { rows } = await pool.query<{ kind: string; value: string }>(`
    select 'name' as kind, name as value from drivers
    union all select 'name', model from vehicles
    union all (select distinct 'name', customer_name from trips)
    union all (select '/drivers/[id]', id::text from drivers order by 2 limit 1)
    union all (select '/fleet/[id]', id::text from vehicles order by 2 limit 1)
    union all (select '/jobs/[id]/edit', id::text from trips order by 2 limit 1)
  `);
  await pool.end();
  return {
    names: rows.filter((row) => row.kind === "name").map((row) => row.value),
    ids: Object.fromEntries(rows.filter((row) => row.kind !== "name").map((row) => [row.kind, row.value])),
  };
}

function leakedNames(body: string, names: string[]): string[] {
  return names.filter((name) => body.includes(name));
}

const protectedPages = pageRoutes().filter((page) => !publicPages.has(page));
const protectedApi = apiRoutes().filter((api) => !publicApi.has(api));

test.describe("signed out visitors", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(({ isMobile }) => isMobile, "Run once, at desktop width");

  for (const route of protectedPages) {
    test(`are sent to sign in from ${route}`, async ({ page }) => {
      const path = withSampleParams(route);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/\//g, "%2F")}`));
    });
  }

  for (const route of protectedApi) {
    test(`are refused by ${route}`, async ({ request }) => {
      const response = await request.get(withSampleParams(route), { maxRedirects: 0 });
      expect(response.status()).toBe(401);
    });
  }

  test("can still reach the health check used for uptime monitoring", async ({ request }) => {
    expect((await request.get("/api/health")).status()).toBe(200);
  });
});

test.describe("visitors with a forged session cookie", () => {
  test.use({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { cookie: forgedSession } });
  test.skip(({ isMobile }) => isMobile, "Run once, at desktop width");

  let seeded: SeededRecords = { names: [], ids: {} };

  test.beforeAll(async () => {
    seeded = await seededRecords();
    expect(seeded.names.length).toBeGreaterThan(20);
  });

  for (const route of protectedPages) {
    test(`see no data and are sent to sign in from ${route}`, async ({ page, request }) => {
      const path = withSampleParams(route, seeded.ids[route]);
      const document = await request.get(path, { maxRedirects: 0 });
      expect(leakedNames(await document.text(), seeded.names)).toEqual([]);
      const navigation = await request.get(path, { maxRedirects: 0, headers: { RSC: "1" } });
      expect(leakedNames(await navigation.text(), seeded.names)).toEqual([]);

      await page.goto(path);
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });
  }

  for (const route of protectedApi) {
    test(`are refused by ${route}`, async ({ request }) => {
      const response = await request.get(withSampleParams(route), { maxRedirects: 0 });
      expect(response.status()).toBe(401);
      expect(leakedNames(await response.text(), seeded.names)).toEqual([]);
    });
  }
});
