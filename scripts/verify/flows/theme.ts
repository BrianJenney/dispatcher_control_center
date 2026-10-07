import { expect, type Page } from "@playwright/test";
import type { Flow } from "./types";

function toggle(page: Page) {
  return page.getByRole("button", { name: /^Theme:/ }).filter({ visible: true });
}

async function isDark(page: Page) {
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
}

export const theme: Flow = {
  route: "/",
  startsSignedIn: true,
  steps: [
    {
      name: "the app follows the device until a choice is made",
      run: async ({ page }) => {
        await page.emulateMedia({ colorScheme: "light" });
        await page.goto("/");
        await expect(toggle(page)).toHaveAccessibleName(/Theme: Match my device/);
        expect(await isDark(page)).toBe(false);
        await page.emulateMedia({ colorScheme: "dark" });
        await expect.poll(() => isDark(page)).toBe(true);
        await page.emulateMedia({ colorScheme: "light" });
        await expect.poll(() => isDark(page)).toBe(false);
      },
    },
    {
      name: "choosing light, dark and device cycles in order",
      run: async ({ page }) => {
        await toggle(page).click();
        await expect(toggle(page)).toHaveAccessibleName(/Theme: Light/);
        await toggle(page).click();
        await expect(toggle(page)).toHaveAccessibleName(/Theme: Dark/);
        expect(await isDark(page)).toBe(true);
      },
    },
    {
      name: "the dark choice survives a reload and applies before first paint",
      run: async ({ page }) => {
        await page.reload();
        expect(await isDark(page)).toBe(true);
        await expect(toggle(page)).toHaveAccessibleName(/Theme: Dark/);
        await expect(page.getByRole("group", { name: "Active jobs" })).toBeVisible();
        await page.goto("/jobs");
        expect(await isDark(page)).toBe(true);
      },
    },
    {
      name: "dark mode keeps the other pages readable",
      run: async ({ page }) => {
        for (const route of ["/schedule", "/insights", "/drivers"]) {
          await page.goto(route);
          expect(await isDark(page)).toBe(true);
          await expect(page.getByRole("main")).toBeVisible();
        }
      },
    },
    {
      name: "going back to the device setting follows the device again",
      run: async ({ page }) => {
        await toggle(page).click();
        await expect(toggle(page)).toHaveAccessibleName(/Theme: Match my device/);
        await page.emulateMedia({ colorScheme: "light" });
        await expect.poll(() => isDark(page)).toBe(false);
        await page.evaluate(() => {
          localStorage.removeItem("dispatch-theme");
        });
      },
    },
  ],
};
