import { expect, test } from "@playwright/test";
import { databaseUrlNamed } from "../scripts/lib/database";
import { flowDatabase } from "../scripts/verify/flows/context";
import { insertTodaysOffer } from "../scripts/verify/flows/expected";

test.describe("trying to break it", () => {
  test.skip(({ isMobile }) => isMobile, "Run once, at desktop width");

  test("double clicking Book trip books one trip", async ({ page }) => {
    const database = flowDatabase(databaseUrlNamed("dispatch_e2e"));
    const customer = `Double Click Guest ${String(Date.now())}`;
    await page.goto("/jobs/new");
    await page.getByRole("textbox", { name: "Customer" }).fill(customer);
    await page.getByRole("textbox", { name: "Pickup", exact: true }).fill("Harborview Hotel");
    await page.getByRole("textbox", { name: "Drop-off" }).fill("Maple Ridge Inn");
    await page.getByRole("textbox", { name: "Fare in dollars" }).fill("150");
    await page.getByRole("button", { name: "Book trip" }).dblclick();
    await expect(page).toHaveURL(/\/jobs\?q=/);
    const booked = await database.contextFor(page).number(`select count(*) as value from trips where customer_name = $1`, [customer]);
    expect(booked).toBe(1);
    await database.close();
  });

  test("a stale tab cannot move a trip someone else already moved", async ({ page, context }) => {
    const database = flowDatabase(databaseUrlNamed("dispatch_e2e"));
    const customer = `Stale Tab Guest ${String(Date.now())}`;
    await insertTodaysOffer(database.contextFor(page), { customer, hour: 4 });
    const fresh = await context.newPage();
    for (const tab of [page, fresh]) {
      await tab.goto(`/jobs?q=${encodeURIComponent(customer)}`);
      await expect(tab.getByRole("article")).toHaveCount(1);
    }
    await fresh.getByRole("button", { name: "Cancel trip" }).click();
    await fresh.getByRole("alertdialog").getByLabel("Reason for cancelling").fill("Client called");
    await fresh.getByRole("alertdialog").getByRole("button", { name: "Cancel trip" }).click();
    await expect(fresh.getByRole("article").getByText("Cancelled", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Assign driver" }).click();
    await page.getByRole("list", { name: "Suggested drivers" }).getByRole("button").first().click();
    await expect(page.getByText("Someone else changed this trip first. Refresh to see its latest status.")).toBeVisible();
    await expect(page.getByRole("article").getByText("Cancelled", { exact: true })).toBeVisible({ timeout: 7_000 });
    const status = await database.contextFor(page).text(`select status as value from trips where customer_name = $1`, [customer]);
    expect(status).toBe("cancelled");
    await database.close();
  });
});
