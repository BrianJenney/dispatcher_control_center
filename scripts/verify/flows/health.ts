import { expect } from "@playwright/test";
import { env } from "@/env";
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
      name: "monitoring says plainly whether it is switched on",
      run: async ({ page }) => {
        const on = Boolean(env.SENTRY_DSN);
        await expect(page.getByText("Error and speed monitoring")).toBeVisible();
        await expect(page.getByText(on ? "Errors and page timings are sent to Sentry." : "Add a Sentry DSN to the environment to switch this on.")).toBeVisible();
        const test = page.getByRole("button", { name: "Send a test error and trace" });
        if (on) await expect(test).toBeEnabled();
        else await expect(test).toBeDisabled();
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

