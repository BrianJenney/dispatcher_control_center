import { expect } from "@playwright/test";
import type { Flow } from "./types";

export const health: Flow = {
  route: "/health",
  startsSignedIn: true,
  steps: [
    {
      name: "open the health page",
      run: async ({ page }) => {
        await page.goto("/health");
        await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
        await expect(page.getByText("Connected")).toBeVisible();
      },
    },
    {
      name: "see plain language validation",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Record check" }).click();
        await expect(page.getByText("Give the check a short name.")).toBeVisible();
      },
    },
    {
      name: "record a check",
      run: async ({ page }) => {
        await page.getByLabel("Check name").fill("Verification run");
        await page.getByRole("button", { name: "Record check" }).click();
        await expect(page.getByTestId("latest-check")).toHaveText("Verification run");
        await expect(page.getByLabel("Check name")).not.toHaveAttribute("aria-invalid");
      },
    },
    {
      name: "confirm before clearing",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Clear all checks" }).click();
        await expect(page.getByRole("alertdialog")).toContainText("It cannot be undone.");
      },
    },
    {
      name: "clear the checks",
      run: async ({ page }) => {
        await page.getByRole("alertdialog").getByRole("button", { name: "Clear checks" }).click();
        await expect(page.getByText("No checks yet")).toBeVisible();
      },
    },
  ],
};

