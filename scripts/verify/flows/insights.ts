import { expect, type Page } from "@playwright/test";
import { demoUser } from "@/env-demo";
import { env } from "@/env";
import { tile, viewportTag } from "./expected";
import type { Flow, FlowContext } from "./types";

const lastSevenDays = `pickup_at >= ((date_trunc('day', now() at time zone $1) - interval '6 days') at time zone $1)
  and pickup_at < ((date_trunc('day', now() at time zone $1) + interval '1 day') at time zone $1)`;

async function insertOfferDueSoon(context: FlowContext, customer: string) {
  await context.execute(
    `with created as (
       insert into trips (customer_name, pickup_address, dropoff_address, pickup_at, passengers, vehicle_class, fare_cents)
       values ($1, 'Harborview Hotel', 'Regional Airport, Terminal B', now() + interval '40 minutes', 2, 'luxury_sedan', 15000)
       returning id)
     insert into trip_events (trip_id, actor_id, to_status)
     select created.id, "user".id, 'offer' from created, "user" where "user".email = $2`,
    [customer, demoUser.email],
  );
}

async function insertMissedOfferYesterday(context: FlowContext, customer: string) {
  await context.execute(
    `with created as (
       insert into trips (customer_name, pickup_address, dropoff_address, pickup_at, passengers, vehicle_class, fare_cents)
       values ($1, 'Harborview Hotel', 'Regional Airport, Terminal B', now() - interval '1 day', 2, 'luxury_sedan', 15000)
       returning id)
     insert into trip_events (trip_id, actor_id, to_status)
     select created.id, "user".id, 'offer' from created, "user" where "user".email = $2`,
    [customer, demoUser.email],
  );
  return context.number(`select reference as value from trips where customer_name = $1`, [customer]);
}

function attentionList(page: Page) {
  return page.getByRole("region", { name: "Needs attention" });
}

const guests = { first: "", second: "" };

export const insights: Flow = {
  route: "/insights",
  startsSignedIn: true,
  steps: [
    {
      name: "the week's numbers match the database",
      run: async (context) => {
        const { page } = context;
        await page.goto("/insights");
        await expect(page.getByRole("heading", { name: "Insights", level: 1 })).toBeVisible();
        const trips = await context.number(`select count(*) as value from trips where ${lastSevenDays}`, [env.APP_TIMEZONE]);
        const cancelled = await context.number(
          `select count(*) as value from trips where status = 'cancelled' and ${lastSevenDays}`,
          [env.APP_TIMEZONE],
        );
        await expect(tile(page, "Trips this week")).toHaveText(String(trips));
        await expect(page.getByRole("group", { name: "Cancellation rate" })).toContainText(`${String(cancelled)} cancelled`);
      },
    },
    {
      name: "charts are named and readable as tables",
      run: async ({ page }) => {
        await expect(page.getByRole("figure", { name: "Trips per day" })).toBeVisible();
        await expect(page.getByRole("figure", { name: "Revenue per day" })).toBeVisible();
        await expect(page.getByRole("table", { name: "Trips per day" }).getByRole("row")).toHaveCount(8);
        await expect(page.getByRole("figure", { name: "Trips per driver today" })).toBeVisible();
      },
    },
    {
      name: "an offer due within two hours is flagged",
      run: async (context) => {
        const { page } = context;
        guests.first = `Insight Guest ${viewportTag(page)} ${String(Date.now())}`;
        await insertOfferDueSoon(context, guests.first);
        await page.goto("/insights");
        await expect(attentionList(page).getByText(guests.first)).toBeVisible();
        await expect(attentionList(page).getByText("Needs a driver soon").first()).toBeVisible();
      },
    },
    {
      name: "a new problem appears without a refresh",
      run: async (context) => {
        const { page } = context;
        guests.second = `Insight Guest Two ${viewportTag(page)} ${String(Date.now())}`;
        await insertOfferDueSoon(context, guests.second);
        await expect(attentionList(page).getByText(guests.second)).toBeVisible({ timeout: 10_000 });
      },
    },
    {
      name: "opening a missed pickup from yesterday shows that trip ready to assign",
      run: async (context) => {
        const { page } = context;
        const customer = `Missed Guest ${viewportTag(page)} ${String(Date.now())}`;
        const reference = await insertMissedOfferYesterday(context, customer);
        await page.goto("/insights");
        const item = attentionList(page).getByRole("listitem").filter({ hasText: customer });
        await expect(item).toContainText("Pickup time passed");
        await item.getByRole("link", { name: `Open trip ${String(reference)}` }).click();
        await expect(page).toHaveURL(new RegExp(`/jobs\\?q=%23${String(reference)}$`));
        const card = page.locator("[data-trip-card]").filter({ hasText: customer });
        await expect(card).toBeVisible();
        await expect(card.getByRole("button", { name: "Assign driver" })).toBeVisible();
      },
    },
  ],
};
