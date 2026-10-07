import { and, gte, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { drivers, trips, vehicles } from "@/db/schema";
import type { DashboardSnapshot } from "@/domain/dashboard";
import { dayRange } from "@/domain/time";
import { activeStatuses } from "@/domain/trip-status";
import { env } from "@/env";
import { tripRows } from "@/server/queries/trips";

export async function getDashboard(): Promise<DashboardSnapshot> {
  const today = dayRange(new Date(), env.APP_TIMEZONE);
  const [rows, driverRows, vehicleRows] = await Promise.all([
    tripRows(
      or(inArray(trips.status, [...activeStatuses]), and(gte(trips.pickupAt, today.start), lt(trips.pickupAt, today.end))),
    ),
    db.select({ onDuty: drivers.onDuty }).from(drivers),
    db.select({ status: vehicles.status }).from(vehicles),
  ]);
  return {
    timeZone: env.APP_TIMEZONE,
    today: { start: today.start.toISOString(), end: today.end.toISOString() },
    trips: rows,
    drivers: driverRows,
    vehicles: vehicleRows,
  };
}
