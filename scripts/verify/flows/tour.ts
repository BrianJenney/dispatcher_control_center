import { expect, type Page } from "@playwright/test";
import { tourStorageKey } from "@/domain/tour";
import type { Flow } from "./types";

function tour(page: Page) {
  return page.getByRole("dialog", { name: /./ });
}

function highlight(page: Page) {
  return page.getByTestId("tour-highlight");
}

export const guidedTour: Flow = {
  route: "/",
  startsSignedIn: true,
  steps: [
    {
      name: "the tour opens by itself on a first visit",
      run: async ({ page }) => {
        await page.goto("/");
        await page.evaluate((key) => {
          localStorage.removeItem(key);
        }, tourStorageKey);
        await page.reload();
        await expect(tour(page)).toBeVisible();
        await expect(page.getByRole("heading", { name: "Welcome to Dispatch Lite" })).toBeVisible();
        await expect(page.getByText("Step 1 of 6")).toBeVisible();
      },
    },
    {
      name: "next and back move between steps",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByRole("heading", { name: "Your four live numbers" })).toBeVisible();
        await expect(page.getByText("Step 2 of 6")).toBeVisible();
        await page.getByRole("button", { name: "Back" }).click();
        await expect(page.getByRole("heading", { name: "Welcome to Dispatch Lite" })).toBeVisible();
        await expect(highlight(page)).toBeHidden();
        for (let step = 0; step < 5; step += 1) await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByText("Step 6 of 6")).toBeVisible();
        await expect(page.getByRole("button", { name: "Start dispatching" })).toBeVisible();
      },
    },
    {
      name: "finishing closes it for good",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Start dispatching" }).click();
        await expect(tour(page)).toBeHidden();
        await page.reload();
        await expect(page.getByRole("group", { name: "Active jobs" })).toBeVisible();
        await expect(tour(page)).toBeHidden();
      },
    },
    {
      name: "the help button brings it back and Escape skips it",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Take the tour" }).filter({ visible: true }).click();
        await expect(tour(page)).toBeVisible();
        await expect(page.getByText("Step 1 of 6")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(tour(page)).toBeHidden();
      },
    },
    {
      name: "a step rings the part of the page it describes without covering it",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Take the tour" }).filter({ visible: true }).click();
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByRole("heading", { name: "Your four live numbers" })).toBeVisible();
        await expect(async () => {
          const ring = await highlight(page).boundingBox();
          const tiles = await page.getByRole("region", { name: "Key numbers" }).boundingBox();
          const card = await tour(page).boundingBox();
          expect(ring).not.toBeNull();
          expect(tiles).not.toBeNull();
          expect(card).not.toBeNull();
          expect(ring?.x).toBeCloseTo(tiles?.x ?? Number.NaN, 0);
          expect(ring?.y).toBeCloseTo(tiles?.y ?? Number.NaN, 0);
          expect(ring?.width).toBeCloseTo(tiles?.width ?? Number.NaN, 0);
          expect(ring?.height).toBeCloseTo(tiles?.height ?? Number.NaN, 0);
          expect((tiles?.y ?? Number.NaN) + (tiles?.height ?? Number.NaN)).toBeLessThanOrEqual(card?.y ?? Number.NaN);
        }).toPass();
        await page.keyboard.press("Escape");
        await expect(tour(page)).toBeHidden();
      },
    },
    {
      name: "a step can take you straight to the page it describes",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Take the tour" }).filter({ visible: true }).click();
        for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Next" }).click();
        await page.getByRole("link", { name: "Open the schedule" }).click();
        await expect(page).toHaveURL(/\/schedule$/);
        await expect(tour(page)).toBeHidden();
        await expect(page.getByRole("heading", { name: "Schedule", level: 1 })).toBeVisible();
      },
    },
    {
      name: "a step whose target is not on this page shows its card with no ring",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Take the tour" }).filter({ visible: true }).click();
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByRole("heading", { name: "Your four live numbers" })).toBeVisible();
        await expect(highlight(page)).toBeHidden();
        await page.getByRole("button", { name: "Next" }).click();
        await page.getByRole("button", { name: "Next" }).click();
        await expect(page.getByRole("heading", { name: "Move trips along" })).toBeVisible();
        await expect(highlight(page)).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(tour(page)).toBeHidden();
      },
    },
  ],
};
