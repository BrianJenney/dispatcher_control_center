import { expect, type Page } from "@playwright/test";
import { expectTilesMatchDatabase, fromDatabase } from "./expected";
import type { Flow } from "./types";

function listCount(page: Page, title: string) {
  return page.getByRole("region", { name: title }).getByTestId("list-count");
}

export const dashboard: Flow = {
  route: "/",
  startsSignedIn: true,
  steps: [
    {
      name: "open the dashboard",
      run: async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("heading", { name: "Today at a glance" })).toBeVisible();
      },
    },
    {
      name: "the four tiles match the database",
      run: expectTilesMatchDatabase,
    },
    {
      name: "trips that need a driver and trips on the road are listed",
      run: async ({ page }) => {
        await expect(page.getByRole("heading", { name: "Needs a driver" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "On the road" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Up next" })).toBeVisible();
        await expect(page.getByRole("article").first()).toBeVisible();
      },
    },
    {
      name: "the lists hold today's trips plus everything on the road",
      run: async (context) => {
        const { page } = context;
        await expect(listCount(page, "Needs a driver")).toHaveText(String(await fromDatabase.tripsTodayInStatus(context, "offer")));
        await expect(listCount(page, "Up next")).toHaveText(String(await fromDatabase.tripsTodayInStatus(context, "assigned")));
        await expect(listCount(page, "On the road")).toHaveText(String(await fromDatabase.enRouteNow(context)));
      },
    },
  ],
};
