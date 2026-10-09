import { expect, type Page } from "@playwright/test";
import { insertTodaysOffer, viewportTag } from "./expected";
import type { Flow, FlowContext } from "./types";

function waitingCard(page: Page, customer: string) {
  return page.getByRole("region", { name: "Needs a driver" }).getByRole("article", { name: new RegExp(`for ${customer}$`) });
}

async function expectSuggestionsFollowTheRules(context: FlowContext) {
  const suggestions = context.page.getByRole("list", { name: "Suggested drivers" });
  await expect(suggestions).toBeVisible();
  const names = await suggestions
    .getByRole("listitem")
    .locator("span.font-medium")
    .allTextContents();
  expect(names.length).toBeGreaterThan(0);
  expect(names.length).toBeLessThanOrEqual(3);
  for (const name of names) {
    const fits = await context.number(
      `select count(*) as value from drivers where name = $1 and on_duty and vehicle_class = 'luxury_sedan'`,
      [name],
    );
    expect(fits, `${name} should be on duty and drive a luxury sedan`).toBe(1);
  }
  return names;
}

async function assignedDriver(context: FlowContext, customer: string) {
  return context.text(
    `select drivers.name as value from trips join drivers on drivers.id = trips.driver_id
      where trips.customer_name = $1 and trips.status = 'assigned'`,
    [customer],
  );
}

const customers = { click: "", keyboard: "" };

export const assign: Flow = {
  route: "/",
  startsSignedIn: true,
  steps: [
    {
      name: "an offer waits for a driver on the dashboard",
      run: async (context) => {
        const tag = `${viewportTag(context.page)} ${String(Date.now())}`;
        customers.click = `Assign Guest ${tag}`;
        customers.keyboard = `Keyboard Guest ${tag}`;
        await insertTodaysOffer(context, { customer: customers.click, hour: 0 });
        await insertTodaysOffer(context, { customer: customers.keyboard, hour: 0 });
        await context.page.goto("/");
        await expect(waitingCard(context.page, customers.click)).toBeVisible();
      },
    },
    {
      name: "click one shows the top three drivers by the rules",
      run: async (context) => {
        await waitingCard(context.page, customers.click).getByRole("button", { name: "Assign driver" }).click();
        await expectSuggestionsFollowTheRules(context);
      },
    },
    {
      name: "click two assigns the best match",
      run: async (context) => {
        const { page } = context;
        const best = await page.getByRole("list", { name: "Suggested drivers" }).getByRole("listitem").first().locator("span.font-medium").textContent();
        await page.getByRole("button", { name: `Assign ${best ?? ""}` }).click();
        await expect(waitingCard(page, customers.click)).toHaveCount(0);
        await expect(page.getByText(new RegExp(`is now assigned\\.$`))).toBeVisible();
        await expect.poll(() => assignedDriver(context, customers.click)).toBe(best);
      },
    },
    {
      name: "assign by keyboard alone",
      run: async (context) => {
        const { page } = context;
        const button = waitingCard(page, customers.keyboard).getByRole("button", { name: "Assign driver" });
        await button.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("list", { name: "Suggested drivers" })).toBeVisible();
        await page.keyboard.press("Enter");
        await expect(waitingCard(page, customers.keyboard)).toHaveCount(0);
        await expect.poll(() => assignedDriver(context, customers.keyboard)).not.toBeNull();
      },
    },
  ],
};
