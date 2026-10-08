import { expect, type Locator, type Page } from "@playwright/test";
import { expectTilesMatchDatabase, fromDatabase, openFromNavigation, tile } from "./expected";
import type { Flow } from "./types";

function timeline(page: Page) {
  return page.getByRole("list", { name: "Timeline" });
}

async function firstAssignedTrip(page: Page) {
  const card = timeline(page)
    .getByRole("article")
    .filter({ has: page.getByText("Assigned", { exact: true }) })
    .first();
  const label = await card.getAttribute("aria-label");
  if (!label) throw new Error("No assigned trip is on the schedule.");
  return page.getByRole("article", { name: label, exact: true });
}

function completeDialog(page: Page) {
  return page.getByRole("alertdialog", { name: /^Complete trip #\d+\?$/ });
}

async function completeTrip(page: Page, trip: Locator) {
  await trip.getByRole("button", { name: "Complete trip" }).click();
  const dialog = completeDialog(page);
  await dialog.getByRole("button", { name: "Complete trip" }).click();
  await expect(dialog).toHaveCount(0);
}

let movedTripLabel = "";

export const status: Flow = {
  route: "/schedule",
  startsSignedIn: true,
  steps: [
    {
      name: "start an assigned trip",
      run: async ({ page }) => {
        await page.goto("/schedule");
        const trip = await firstAssignedTrip(page);
        movedTripLabel = (await trip.getAttribute("aria-label")) ?? "";
        await trip.getByRole("button", { name: "Start trip" }).click();
        await expect(trip.getByText("En route", { exact: true })).toBeVisible();
        await expect(page.getByText(/is now en route\.$/)).toBeVisible();
      },
    },
    {
      name: "completing asks first, and backing out by keyboard changes nothing",
      run: async ({ page }) => {
        const trip = page.getByRole("article", { name: movedTripLabel, exact: true });
        const trigger = trip.getByRole("button", { name: "Complete trip" });
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = completeDialog(page);
        await expect(dialog).toContainText("will count toward");
        await expect(dialog.getByRole("button", { name: "Not yet" })).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await expect(trip.getByText("En route", { exact: true })).toBeVisible();
      },
    },
    {
      name: "complete it, and no further moves are offered",
      run: async ({ page }) => {
        const trip = page.getByRole("article", { name: movedTripLabel, exact: true });
        await completeTrip(page, trip);
        await expect(trip.getByText("Completed", { exact: true })).toBeVisible();
        await expect(trip.getByRole("button")).toHaveCount(0);
        await expect(page.locator("body")).not.toBeFocused();
      },
    },
    {
      name: "the dashboard tiles reflect it without a refresh",
      run: async (context) => {
        await openFromNavigation(context.page, "Dashboard");
        await expectTilesMatchDatabase(context);
      },
    },
    {
      name: "cancelling asks for a reason",
      run: async ({ page }) => {
        await openFromNavigation(page, "Schedule");
        const trip = await firstAssignedTrip(page);
        await trip.getByRole("button", { name: "Cancel trip" }).click();
        const dialog = page.getByRole("alertdialog");
        await dialog.getByRole("button", { name: "Cancel trip" }).click();
        await expect(dialog.getByText("Give a reason for cancelling the trip.")).toBeVisible();
        await dialog.getByLabel("Reason for cancelling").fill("Client changed plans");
        await dialog.getByRole("button", { name: "Cancel trip" }).click();
        await expect(dialog).toHaveCount(0);
        await expect(trip.getByText("Cancelled: Client changed plans")).toBeVisible();
      },
    },
    {
      name: "a dashboard in a second tab sees a move within one polling interval",
      run: async (context) => {
        const { page } = context;
        const second = await page.context().newPage();
        await second.goto("/");
        const before = await fromDatabase.activeJobs(context);
        await expect(tile(second, "Active jobs")).toHaveText(String(before));
        const trip = await firstAssignedTrip(page);
        await trip.getByRole("button", { name: "Start trip" }).click();
        await expect(trip.getByText("En route", { exact: true })).toBeVisible();
        await completeTrip(page, trip);
        await expect(tile(second, "Active jobs")).toHaveText(String(before - 1), { timeout: 7_000 });
        await second.close();
      },
    },
  ],
};
