import { expect } from "@playwright/test";
import { pageSize } from "@/domain/paging";
import { insertTodaysOffer, viewportTag } from "./expected";
import type { Flow } from "./types";

const guest = { name: "" };

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
          `select trips.reference as value from trip_events join trips on trips.id = trip_events.trip_id
            order by trip_events.created_at desc, trip_events.id desc limit 1`,
        );
        const entries = page.getByRole("list", { name: "Activity" }).getByRole("listitem");
        await expect(entries.first()).toContainText(`#${String(newest)} `);
        await expect(entries.first()).toContainText("Demo Dispatcher");
      },
    },
    {
      name: "a new booking appears without a refresh",
      run: async (context) => {
        const { page } = context;
        guest.name = `Activity Guest ${viewportTag(page)} ${String(Date.now())}`;
        await insertTodaysOffer(context, { customer: guest.name, hour: 2 });
        const log = page.getByRole("list", { name: "Activity" });
        await expect(log.getByRole("listitem").first()).toContainText(guest.name, { timeout: 10_000 });
        await expect(log.getByRole("listitem").first()).toContainText("booked the trip");
      },
    },
    {
      name: "show more loads older entries",
      run: async (context) => {
        const { page } = context;
        const total = await context.number(`select count(*) as value from trip_events`);
        const entries = page.getByRole("list", { name: "Activity" }).getByRole("listitem");
        await expect(entries).toHaveCount(Math.min(pageSize, total));
        await page.getByRole("button", { name: "Show more" }).click();
        await expect(entries).toHaveCount(Math.min(pageSize * 2, total));
      },
    },
  ],
};
