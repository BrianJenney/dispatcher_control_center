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
  ],
};
