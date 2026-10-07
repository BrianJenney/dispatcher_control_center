import { expect, type Page } from "@playwright/test";
import { fromDatabase } from "./expected";
import type { Flow } from "./types";

async function choose(page: Page, filter: string, option: string) {
  await page.getByRole("combobox", { name: filter }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export const schedule: Flow = {
  route: "/schedule",
  startsSignedIn: true,
  steps: [
    {
      name: "today's trips appear in pickup order",
      run: async (context) => {
        const { page } = context;
        await page.goto("/schedule");
        const total = await fromDatabase.tripsToday(context);
        await expect(page.getByText(`${String(total)} of ${String(total)} trips on`)).toBeVisible();
        const times = await page
          .getByRole("list", { name: "Timeline" })
          .getByRole("article")
          .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-pickup-at") ?? ""));
        expect(times.length).toBe(total);
        expect(times).toEqual([...times].sort());
      },
    },
    {
      name: "filter by status",
      run: async (context) => {
        const { page } = context;
        await choose(page, "Status", "Completed");
        const completed = await fromDatabase.tripsTodayInStatus(context, "completed");
        const cards = page.getByRole("list", { name: "Timeline" }).getByRole("article");
        await expect(cards).toHaveCount(completed);
        await expect(cards.filter({ hasNotText: "Completed" })).toHaveCount(0);
      },
    },
    {
      name: "filter by driver as well",
      run: async ({ page }) => {
        const cards = page.getByRole("list", { name: "Timeline" }).getByRole("article");
        const driver = await cards.first().getByTestId("trip-driver").textContent();
        if (!driver) throw new Error("The first completed trip has no driver.");
        await choose(page, "Driver", driver);
        await expect(cards.filter({ hasNotText: driver })).toHaveCount(0);
        await expect(cards.first()).toBeVisible();
      },
    },
    {
      name: "clear the filters",
      run: async (context) => {
        const { page } = context;
        await page.getByRole("button", { name: "Clear filters" }).click();
        const total = await fromDatabase.tripsToday(context);
        await expect(page.getByRole("list", { name: "Timeline" }).getByRole("article")).toHaveCount(total);
      },
    },
  ],
};
