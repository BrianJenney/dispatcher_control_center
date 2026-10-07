import { and, asc, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { drivers, trips } from "@/db/schema";
import type { ScheduleSnapshot } from "@/domain/schedule";
import { dayRange } from "@/domain/time";
import { env } from "@/env";
import { tripRows } from "@/server/queries/trips";

export async function getSchedule(): Promise<ScheduleSnapshot> {
  const today = dayRange(new Date(), env.APP_TIMEZONE);
  const [rows, driverRows] = await Promise.all([
    tripRows(and(gte(trips.pickupAt, today.start), lt(trips.pickupAt, today.end))),
    db.select({ id: drivers.id, name: drivers.name }).from(drivers).orderBy(asc(drivers.name)),
  ]);
  return { today: { start: today.start.toISOString(), end: today.end.toISOString() }, trips: rows, drivers: driverRows };
}
