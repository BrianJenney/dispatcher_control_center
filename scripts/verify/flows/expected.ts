import { expect, type Page } from "@playwright/test";
import { formatMoney } from "@/components/format";
import { env } from "@/env";
import type { FlowContext } from "./types";

const today = `pickup_at >= (date_trunc('day', now() at time zone $1) at time zone $1)
  and pickup_at < ((date_trunc('day', now() at time zone $1) + interval '1 day') at time zone $1)`;

export const fromDatabase = {
  activeJobs: (context: FlowContext) =>
    context.number(`select count(*) as value from trips where status in ('assigned', 'en_route')`),
  driversOnDuty: (context: FlowContext) => context.number(`select count(*) as value from drivers where on_duty`),
  driversTotal: (context: FlowContext) => context.number(`select count(*) as value from drivers`),
  fleetReady: (context: FlowContext) => context.number(`select count(*) as value from vehicles where status = 'ready'`),
  fleetTotal: (context: FlowContext) => context.number(`select count(*) as value from vehicles`),
  revenueTodayCents: (context: FlowContext) =>
    context.number(`select coalesce(sum(fare_cents), 0) as value from trips where status = 'completed' and ${today}`, [
      env.APP_TIMEZONE,
    ]),
  tripsToday: (context: FlowContext) =>
    context.number(`select count(*) as value from trips where ${today}`, [env.APP_TIMEZONE]),
  tripsTodayInStatus: (context: FlowContext, status: string) =>
    context.number(`select count(*) as value from trips where ${today} and status = $2`, [env.APP_TIMEZONE, status]),
};

export function tile(page: Page, label: string) {
  return page.getByRole("group", { name: label }).getByTestId("kpi-value");
}

export async function expectTilesMatchDatabase(context: FlowContext) {
  const { page } = context;
  await expect(tile(page, "Active jobs")).toHaveText(String(await fromDatabase.activeJobs(context)));
  await expect(tile(page, "Drivers on duty")).toHaveText(String(await fromDatabase.driversOnDuty(context)));
  await expect(tile(page, "Fleet ready")).toHaveText(
    `${String(await fromDatabase.fleetReady(context))}/${String(await fromDatabase.fleetTotal(context))}`,
  );
  await expect(tile(page, "Today's revenue")).toHaveText(formatMoney(await fromDatabase.revenueTodayCents(context)));
}

export async function openFromNavigation(page: Page, label: string) {
  await page
    .getByRole("navigation", { name: "Main" })
    .filter({ visible: true })
    .getByRole("link", { name: label, exact: true })
    .click();
}
