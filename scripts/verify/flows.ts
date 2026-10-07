import { expect, type Page } from "@playwright/test";
import { env } from "@/env";

export type FlowStep = { name: string; run: (page: Page) => Promise<void> };

export type Flow = { route: string; startsSignedIn: boolean; steps: FlowStep[] };

const demoEmail = env.DEMO_USER_EMAIL;

const login: Flow = {
  route: "/login",
  startsSignedIn: false,
  steps: [
    {
      name: "a protected page sends a signed out visitor to sign in",
      run: async (page) => {
        await page.goto("/health");
        await expect(page).toHaveURL(/\/login\?next=%2Fhealth$/);
        await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      },
    },
    {
      name: "see plain language validation",
      run: async (page) => {
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await expect(page.getByText("Enter your email address.")).toBeVisible();
        await expect(page.getByText("Enter your password.")).toBeVisible();
      },
    },
    {
      name: "a wrong password is refused",
      run: async (page) => {
        await page.getByLabel("Email").fill(demoEmail);
        await page.getByLabel("Password").fill("not-the-password");
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await expect(page.getByText("That email and password do not match. Check them and try again.")).toBeVisible();
      },
    },
    {
      name: "the demo account signs in and returns to the page asked for",
      run: async (page) => {
        await page.getByRole("button", { name: "Sign in with the demo account" }).click();
        await expect(page).toHaveURL(/\/health$/);
        await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
      },
    },
    {
      name: "signing out returns to sign in",
      run: async (page) => {
        await page.getByRole("button", { name: "Sign out" }).filter({ visible: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        await page.goto("/");
        await expect(page).toHaveURL(/\/login\?next=%2F$/);
      },
    },
  ],
};

const health: Flow = {
  route: "/health",
  startsSignedIn: true,
  steps: [
    {
      name: "open the health page",
      run: async (page) => {
        await page.goto("/health");
        await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
        await expect(page.getByText("Connected")).toBeVisible();
      },
    },
    {
      name: "see plain language validation",
      run: async (page) => {
        await page.getByRole("button", { name: "Record check" }).click();
        await expect(page.getByText("Give the check a short name.")).toBeVisible();
      },
    },
    {
      name: "record a check",
      run: async (page) => {
        await page.getByLabel("Check name").fill("Verification run");
        await page.getByRole("button", { name: "Record check" }).click();
        await expect(page.getByTestId("latest-check")).toHaveText("Verification run");
        await expect(page.getByLabel("Check name")).not.toHaveAttribute("aria-invalid");
      },
    },
    {
      name: "confirm before clearing",
      run: async (page) => {
        await page.getByRole("button", { name: "Clear all checks" }).click();
        await expect(page.getByRole("alertdialog")).toContainText("It cannot be undone.");
      },
    },
    {
      name: "clear the checks",
      run: async (page) => {
        await page.getByRole("alertdialog").getByRole("button", { name: "Clear checks" }).click();
        await expect(page.getByText("No checks yet")).toBeVisible();
      },
    },
  ],
};

export const flows: Record<string, Flow> = { login, health };
