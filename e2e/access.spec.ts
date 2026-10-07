import { expect, test } from "@playwright/test";
import { apiRoutes, pageRoutes, withSampleParams } from "../scripts/lib/routes";

const publicPages = new Set(["/login"]);
const publicApi = new Set(["/api/health", "/api/auth/[...all]"]);

test.describe("signed out visitors", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(({ isMobile }) => isMobile, "Run once, at desktop width");

  for (const route of pageRoutes().filter((page) => !publicPages.has(page))) {
    test(`are sent to sign in from ${route}`, async ({ page }) => {
      const path = withSampleParams(route);
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/\//g, "%2F")}`));
    });
  }

  for (const route of apiRoutes().filter((api) => !publicApi.has(api))) {
    test(`are refused by ${route}`, async ({ request }) => {
      const response = await request.get(withSampleParams(route), { maxRedirects: 0 });
      expect(response.status()).toBe(401);
    });
  }

  test("can still reach the health check used for uptime monitoring", async ({ request }) => {
    expect((await request.get("/api/health")).status()).toBe(200);
  });
});
