import { expect } from "@playwright/test";
import { expectTilesMatchDatabase } from "./expected";
import type { Flow } from "./types";

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
  ],
};
