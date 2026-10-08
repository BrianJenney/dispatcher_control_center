import { expect } from "@playwright/test";
import { demoUser } from "@/env-demo";
import type { Flow } from "./types";

export const login: Flow = {
  route: "/login",
  startsSignedIn: false,
  steps: [
    {
      name: "a protected page sends a signed out visitor to sign in",
      run: async ({ page }) => {
        await page.goto("/health");
        await expect(page).toHaveURL(/\/login\?next=%2Fhealth$/);
        await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      },
    },
    {
      name: "see plain language validation",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await expect(page.getByText("Enter your email address.")).toBeVisible();
        await expect(page.getByText("Enter your password.")).toBeVisible();
      },
    },
    {
      name: "a wrong password is refused",
      run: async ({ page }) => {
        await page.getByLabel("Email").fill(demoUser.email);
        await page.getByLabel("Password").fill("not-the-password");
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await expect(page.getByText("That email and password do not match. Check them and try again.")).toBeVisible();
      },
    },
    {
      name: "the demo account signs in and returns to the page asked for",
      run: async ({ page }) => {
        await page.getByLabel("Password").fill(demoUser.password);
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await expect(page).toHaveURL(/\/health$/);
        await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
      },
    },
    {
      name: "signing out returns to sign in",
      run: async ({ page }) => {
        await page.getByRole("button", { name: "Sign out" }).filter({ visible: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        await page.goto("/");
        await expect(page).toHaveURL(/\/login\?next=%2F$/);
      },
    },
  ],
};

