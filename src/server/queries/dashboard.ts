import { and, eq, gte, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { drivers, trips, vehicles } from "@/db/schema";
import type { DashboardSnapshot } from "@/domain/dashboard";
import { dayRange } from "@/domain/time";
import { env } from "@/env";
import { defineQuery } from "@/server/query";
import { tripRows } from "@/server/trip-rows";

export const getDashboard = defineQuery("signed-in", async (): Promise<DashboardSnapshot> => {
  const today = dayRange(new Date(), env.APP_TIMEZONE);
  const [rows, driverRows, vehicleRows] = await Promise.all([
    tripRows(or(eq(trips.status, "en_route"), and(gte(trips.pickupAt, today.start), lt(trips.pickupAt, today.end)))),
    db.select({ onDuty: drivers.onDuty }).from(drivers),
    db.select({ status: vehicles.status }).from(vehicles),
  ]);
  return {
    today: { start: today.start.toISOString(), end: today.end.toISOString() },
    trips: rows,
    drivers: driverRows,
    vehicles: vehicleRows,
  };
});
