import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { env } from "@/env";
import { dayRange, shiftDays } from "@/domain/time";
import { tripStatuses } from "@/domain/trip-status";

const today = dayRange(new Date(), env.APP_TIMEZONE);
const weekAgo = shiftDays(today, -7, env.APP_TIMEZONE);

async function statusesBetween(start: Date, end: Date) {
  const rows = await db.execute<{ status: string }>(sql`
    select distinct status from trips where pickup_at >= ${start.toISOString()} and pickup_at < ${end.toISOString()}`);
  return rows.rows.map((row) => row.status).sort();
}

describe("seed", () => {
  it("puts trips in every status today", async () => {
    expect(await statusesBetween(today.start, today.end)).toEqual([...tripStatuses].sort());
  });

  it("puts at least three trips in each status today", async () => {
    const rows = await db.execute<{ fewest: number }>(sql`
      select min(count)::int as fewest from (
        select count(*) from trips where pickup_at >= ${today.start.toISOString()} and pickup_at < ${today.end.toISOString()}
        group by status) as per_status`);
    expect(rows.rows[0]?.fewest).toBeGreaterThanOrEqual(3);
  });

  it("spreads trips across each of the last seven days", async () => {
    const rows = await db.execute<{ days: number }>(sql`
      select count(distinct date_trunc('day', pickup_at at time zone ${env.APP_TIMEZONE}))::int as days
      from trips where pickup_at >= ${weekAgo.start.toISOString()} and pickup_at < ${today.start.toISOString()}`);
    expect(rows.rows[0]?.days).toBe(7);
  });

  it("records an event for every status each trip has passed through", async () => {
    const rows = await db.execute<{ missing: number }>(sql`
      select count(*)::int as missing from trips
      where (select count(*) from trip_events where trip_id = trips.id) <> case status
        when 'offer' then 1 when 'assigned' then 2 when 'en_route' then 3 when 'completed' then 4
        else 2 + (case when driver_id is null then 0 else 1 end)
      end
      and status <> 'cancelled'`);
    expect(rows.rows[0]?.missing).toBe(0);
  });

  it("leaves no driver with overlapping active trips", async () => {
    const rows = await db.execute<{ clashes: number }>(sql`
      select count(*)::int as clashes from trips a join trips b
        on a.driver_id = b.driver_id and a.id < b.id
        and trip_window(a.pickup_at, a.duration_minutes) && trip_window(b.pickup_at, b.duration_minutes)
      where a.status in ('assigned', 'en_route') and b.status in ('assigned', 'en_route')`);
    expect(rows.rows[0]?.clashes).toBe(0);
  });

  it("uses fictional contact details only", async () => {
    const rows = await db.execute<{ real: number }>(sql`
      select count(*)::int as real from drivers where phone !~ '^\\(\\d{3}\\) 555-01\\d{2}$'`);
    expect(rows.rows[0]?.real).toBe(0);
  });
});
