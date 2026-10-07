import { expect, test } from "@playwright/test";
import { signInAsDemoUser } from "../scripts/lib/demo-session";

test("health page works by keyboard alone", async ({ page, baseURL }) => {
  test.skip(test.info().project.name === "phone", "Keyboard use is checked at desktop width");
  await signInAsDemoUser(page.request, baseURL ?? "");
  await page.goto("/health");
  await expect(page.getByText("Connected")).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Check name")).toBeFocused();
  await page.keyboard.type("Keyboard check");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("latest-check")).toHaveText("Keyboard check");

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Clear all checks" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Clear checks" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("No checks yet")).toBeVisible();
});
