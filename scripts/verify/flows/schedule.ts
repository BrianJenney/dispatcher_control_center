import { expect, type Page } from "@playwright/test";
import { fromDatabase } from "./expected";
import type { Flow } from "./types";

function timeline(page: Page) {
  return page.getByRole("list", { name: "Timeline" });
}

function cards(page: Page) {
  return timeline(page).getByRole("article");
}

function statusButton(page: Page, label: string) {
  return page.getByRole("group", { name: "Filter by status" }).getByRole("button", { name: label, exact: true });
}

async function chooseDriver(page: Page, driver: string) {
  await page.getByRole("combobox", { name: "Driver" }).click();
  await page.getByRole("option", { name: driver, exact: true }).click();
}

export const schedule: Flow = {
  route: "/schedule",
  startsSignedIn: true,
  steps: [
    {
      name: "today's trips appear in pickup order with a now marker",
      run: async (context) => {
        const { page } = context;
        await page.goto("/schedule");
        const total = await fromDatabase.tripsToday(context);
        await expect(page.getByText(`${String(total)} of ${String(total)} trips on`)).toBeVisible();
        const times = await cards(page).evaluateAll((items) => items.map((card) => card.getAttribute("data-pickup-at") ?? ""));
        expect(times.length).toBe(total);
        expect(times).toEqual([...times].sort());
        await expect(timeline(page).getByText(/^Now, \d{1,2}:\d{2}\s[AP]M$/)).toBeVisible();
        await expect(page.getByRole("region", { name: "Day at a glance" })).toBeVisible();
      },
    },
    {
      name: "each trip shows its time window, duration, driver and vehicle class",
      run: async ({ page }) => {
        const open = cards(page).filter({ has: page.getByRole("button", { name: "Cancel trip" }) }).first();
        await expect(open).toContainText(/\d{1,2}:\d{2} [AP]M – \d{1,2}:\d{2} [AP]M/);
        await expect(open).toContainText(/\d+ (min|hr)/);
        await expect(open).toContainText(/sedan|SUV|van/);
        await expect(open.getByTestId("trip-driver")).not.toBeEmpty();
      },
    },
    {
      name: "a bar on the day chart jumps to its trip",
      run: async ({ page }) => {
        const bar = page.getByRole("region", { name: "Day at a glance" }).locator("button").first();
        const customer = (await bar.getAttribute("title"))?.split(" · ")[1] ?? "";
        await bar.click();
        const focused = page.locator("[data-trip-card]:focus");
        await expect(focused).toHaveCount(1);
        await expect(focused).toContainText(customer);
        await expect(focused).toBeInViewport();
      },
    },
    {
      name: "filter by status, kept in the address",
      run: async (context) => {
        const { page } = context;
        await statusButton(page, "Completed").click();
        await expect(page).toHaveURL(/status=completed/);
        const completed = await fromDatabase.tripsTodayInStatus(context, "completed");
        await expect(cards(page)).toHaveCount(completed);
        await expect(cards(page).filter({ hasNotText: "Completed" })).toHaveCount(0);
      },
    },
    {
      name: "filter by driver as well",
      run: async ({ page }) => {
        const driver = await cards(page).first().getByTestId("trip-driver").textContent();
        if (!driver) throw new Error("The first completed trip has no driver.");
        await chooseDriver(page, driver);
        await expect(page).toHaveURL(/status=completed&driver=[0-9a-f-]{36}/);
        await expect(cards(page).filter({ hasNotText: driver })).toHaveCount(0);
        await expect(cards(page).first()).toBeVisible();
      },
    },
    {
      name: "the filters survive a refresh",
      run: async ({ page }) => {
        const shown = await cards(page).count();
        await page.reload();
        await expect(statusButton(page, "Completed")).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByRole("combobox", { name: "Driver" })).not.toHaveText("All drivers");
        await expect(cards(page)).toHaveCount(shown);
      },
    },
    {
      name: "clear the filters",
      run: async (context) => {
        const { page } = context;
        await page.getByRole("button", { name: "Clear filters" }).click();
        await expect(page).toHaveURL(/\/schedule$/);
        const total = await fromDatabase.tripsToday(context);
        await expect(cards(page)).toHaveCount(total);
        await expect(page.getByRole("combobox", { name: "Driver" })).toBeFocused();
      },
    },
  ],
};
