import { and, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { drivers, trips } from "@/db/schema";
import { buildInsights, insightsWindow, type InsightsSnapshot } from "@/domain/insights";
import { env } from "@/env";
import { defineQuery } from "@/server/query";
import { tripRows } from "@/server/trip-rows";

export const getInsights = defineQuery("signed-in", async (): Promise<InsightsSnapshot> => {
  const now = new Date();
  const window = insightsWindow(now, env.APP_TIMEZONE);
  const [rows, driverRows] = await Promise.all([
    tripRows(and(gte(trips.pickupAt, window.start), lt(trips.pickupAt, window.end))),
    db.select({ id: drivers.id, name: drivers.name, onDuty: drivers.onDuty }).from(drivers),
  ]);
  return buildInsights({ trips: rows, drivers: driverRows, now, timeZone: env.APP_TIMEZONE });
});
