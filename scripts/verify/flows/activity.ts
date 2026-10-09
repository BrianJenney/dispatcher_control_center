import { expect, type Page } from "@playwright/test";
import { pageSize } from "@/domain/paging";
import { insertTodaysOffer, viewportTag } from "./expected";
import type { Flow, FlowContext } from "./types";

const guest = { name: "", reference: 0 };

const history = `(select trip_id, created_at, id from trip_events union all select trip_id, created_at, id from trip_edits)`;

function entries(page: Page) {
  return page.getByRole("list", { name: "Activity" }).getByRole("listitem");
}

function guestCard(page: Page) {
  return page.getByRole("list", { name: "Jobs" }).getByRole("article", { name: new RegExp(`for ${guest.name}$`) });
}

async function chooseFirstSuggestion(page: Page) {
  await page.getByRole("list", { name: "Suggested drivers" }).getByRole("button").first().click();
}

async function reassignedDrivers(context: FlowContext) {
  return context.text(
    `select from_driver.name || ' to ' || to_driver.name as value
      from trip_events
      join trips on trips.id = trip_events.trip_id
      join drivers from_driver on from_driver.id = trip_events.from_driver_id
      join drivers to_driver on to_driver.id = trip_events.to_driver_id
      where trips.reference = $1 and from_status = 'assigned' and to_status = 'assigned'`,
    [guest.reference],
  );
}

export const activity: Flow = {
  route: "/activity",
  startsSignedIn: true,
  steps: [
    {
      name: "the log opens from insights and lists the latest change first",
      run: async (context) => {
        const { page } = context;
        await page.goto("/insights");
        await page.getByRole("link", { name: "Activity log" }).click();
        await expect(page.getByRole("heading", { name: "Activity", level: 1 })).toBeVisible();
        const newest = await context.number(
          `select trips.reference as value from ${history} as changes join trips on trips.id = changes.trip_id
            order by changes.created_at desc, changes.id desc limit 1`,
        );
        await expect(entries(page).first()).toContainText(`trip #${String(newest)}`);
        await expect(entries(page).first()).toContainText("Demo Dispatcher");
      },
    },
    {
      name: "a new booking appears without a refresh",
      run: async (context) => {
        const { page } = context;
        guest.name = `Activity Guest ${viewportTag(page)} ${String(Date.now())}`;
        await insertTodaysOffer(context, { customer: guest.name, hour: 4 });
        guest.reference = await context.number(`select reference as value from trips where customer_name = $1`, [guest.name]);
        await expect(entries(page).first()).toContainText(guest.name, { timeout: 10_000 });
        await expect(entries(page).first()).toContainText(`booked trip #${String(guest.reference)}`);
      },
    },
    {
      name: "an edit shows the old and new fare",
      run: async ({ page }) => {
        await page.goto(`/jobs?q=${encodeURIComponent(guest.name)}`);
        await guestCard(page).getByRole("link", { name: /^Edit trip \d+$/ }).click();
        await page.getByRole("textbox", { name: "Fare in dollars" }).fill("199");
        await page.getByRole("button", { name: "Save changes" }).click();
        await expect(page.getByText(/is updated\.$/)).toBeVisible();
        await page.goto("/activity");
        await expect(entries(page).first()).toContainText(
          `Demo Dispatcher changed the fare on trip #${String(guest.reference)} from $150 to $199`,
        );
        await expect(entries(page).first()).toContainText("Edited");
      },
    },
    {
      name: "a reassignment names both drivers",
      run: async (context) => {
        const { page } = context;
        await page.goto(`/jobs?q=${encodeURIComponent(guest.name)}`);
        await guestCard(page).getByRole("button", { name: "Assign driver" }).click();
        await chooseFirstSuggestion(page);
        await expect
          .poll(() => context.text(`select status::text as value from trips where reference = $1`, [guest.reference]))
          .toBe("assigned");
        await guestCard(page).getByRole("button", { name: "Reassign" }).click();
        await chooseFirstSuggestion(page);
        await expect.poll(() => reassignedDrivers(context)).not.toBeNull();
        const drivers = await reassignedDrivers(context);
        await page.goto("/activity");
        await expect(entries(page).first()).toContainText(`reassigned trip #${String(guest.reference)} from ${drivers ?? ""}`);
        await expect(entries(page).nth(1)).toContainText(`assigned trip #${String(guest.reference)} to ${drivers?.split(" to ")[0] ?? ""}`);
      },
    },
    {
      name: "an entry opens its trip",
      run: async ({ page }) => {
        await entries(page).first().getByRole("link", { name: `Open trip ${String(guest.reference)} for ${guest.name}` }).click();
        await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
        await expect(page.getByRole("list", { name: "Trip history" })).toContainText("reassigned");
        await page.goto("/activity");
      },
    },
    {
      name: "show more loads older entries",
      run: async (context) => {
        const { page } = context;
        const total = await context.number(`select count(*) as value from ${history} as changes`);
        await expect(entries(page)).toHaveCount(Math.min(pageSize, total));
        await page.getByRole("button", { name: "Show more" }).click();
        await expect(entries(page)).toHaveCount(Math.min(pageSize * 2, total));
      },
    },
  ],
};
