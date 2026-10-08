import { expect, type Page } from "@playwright/test";
import type { Flow } from "./types";

function toggle(page: Page) {
  return page.getByRole("button", { name: /^Theme:/ }).filter({ visible: true });
}

async function isDark(page: Page) {
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
}

async function storedTheme(page: Page) {
  return page.evaluate(() => localStorage.getItem("dispatch-theme"));
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
        await expect(toggle(page)).toHaveAccessibleName("Theme: Light. Switch to Dark");
        expect(await isDark(page)).toBe(false);
        expect(await storedTheme(page)).toBeNull();
        await page.emulateMedia({ colorScheme: "dark" });
        await expect.poll(() => isDark(page)).toBe(true);
        await expect(toggle(page)).toHaveAccessibleName("Theme: Dark. Switch to Light");
      },
    },
    {
      name: "the first click flips the active theme and stores an explicit choice",
      run: async ({ page }) => {
        await toggle(page).click();
        await expect(toggle(page)).toHaveAccessibleName("Theme: Light. Switch to Dark");
        expect(await isDark(page)).toBe(false);
        expect(await storedTheme(page)).toBe("light");
        await page.emulateMedia({ colorScheme: "dark" });
        expect(await isDark(page)).toBe(false);
        await toggle(page).click();
        await expect(toggle(page)).toHaveAccessibleName("Theme: Dark. Switch to Light");
        expect(await isDark(page)).toBe(true);
        expect(await storedTheme(page)).toBe("dark");
      },
    },
    {
      name: "the dark choice survives a reload and applies before first paint",
      run: async ({ page }) => {
        await page.emulateMedia({ colorScheme: "light" });
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
      name: "a leftover system value is ignored and the device decides",
      run: async ({ page }) => {
        await page.evaluate(() => {
          localStorage.setItem("dispatch-theme", "system");
        });
        await page.emulateMedia({ colorScheme: "light" });
        await page.reload();
        expect(await isDark(page)).toBe(false);
        await expect(toggle(page)).toHaveAccessibleName("Theme: Light. Switch to Dark");
        await page.evaluate(() => {
          localStorage.removeItem("dispatch-theme");
        });
      },
    },
  ],
};
