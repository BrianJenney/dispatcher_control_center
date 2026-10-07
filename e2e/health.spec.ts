import { expect, test } from "@playwright/test";
import { signInAsDemoUser } from "./auth";

test("health page reads, writes and clears through the paved path", async ({ page }) => {
  await signInAsDemoUser(page);
  await page.goto("/health");

  await expect(page.getByRole("heading", { name: "System health" })).toBeVisible();
  await expect(page.getByText("Connected")).toBeVisible();

  await page.getByRole("button", { name: "Record check" }).click();
  await expect(page.getByText("Give the check a short name.")).toBeVisible();

  const label = `Check ${test.info().project.name}`;
  await page.getByLabel("Check name").fill(label);
  await page.getByRole("button", { name: "Record check" }).click();
  await expect(page.getByTestId("latest-check")).toHaveText(label);

  await page.getByRole("button", { name: "Clear all checks" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("It cannot be undone.");
  await dialog.getByRole("button", { name: "Clear checks" }).click();
  await expect(page.getByText("No checks yet")).toBeVisible();
});
