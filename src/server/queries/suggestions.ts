import { and, eq, gte, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { drivers, trips } from "@/db/schema";
import type { DriverSuggestions } from "@/domain/jobs";
import { tripsTodayByDriver } from "@/domain/kpis";
import { recordId } from "@/domain/result";
import { matchDrivers } from "@/domain/matching";
import { dayRange } from "@/domain/time";
import { activeStatuses } from "@/domain/trip-status";
import { env } from "@/env";

export async function getSuggestions(id: unknown): Promise<DriverSuggestions | null> {
  const tripId = recordId(id);
  if (!tripId) return null;
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    columns: { id: true, vehicleClass: true, pickupAt: true, durationMinutes: true },
  });
  if (!trip) return null;
  const day = dayRange(trip.pickupAt, env.APP_TIMEZONE);

  const [inClass, activeTrips, dayTrips] = await Promise.all([
    db
      .select({ id: drivers.id, name: drivers.name, onDuty: drivers.onDuty, vehicleClass: drivers.vehicleClass })
      .from(drivers)
      .where(eq(drivers.vehicleClass, trip.vehicleClass)),
    db
      .select({ tripId: trips.id, driverId: trips.driverId, pickupAt: trips.pickupAt, durationMinutes: trips.durationMinutes })
      .from(trips)
      .innerJoin(drivers, eq(trips.driverId, drivers.id))
      .where(and(inArray(trips.status, [...activeStatuses]), eq(drivers.vehicleClass, trip.vehicleClass))),
    db
      .select({ status: trips.status, fareCents: trips.fareCents, pickupAt: trips.pickupAt, driverId: trips.driverId })
      .from(trips)
      .where(and(isNotNull(trips.driverId), gte(trips.pickupAt, day.start), lt(trips.pickupAt, day.end))),
  ]);

  const counts = tripsTodayByDriver(dayTrips, day);
  const suggestions = matchDrivers(
    { tripId: trip.id, vehicleClass: trip.vehicleClass, pickupAt: trip.pickupAt, durationMinutes: trip.durationMinutes },
    inClass.map((driver) => ({
      ...driver,
      tripsToday: counts.get(driver.id) ?? 0,
      activeTrips: activeTrips.filter((held) => held.driverId === driver.id),
    })),
  );
  return {
    vehicleClass: trip.vehicleClass,
    onDutyInClass: inClass.filter((driver) => driver.onDuty).length,
    suggestions: suggestions.map((driver) => ({ id: driver.id, name: driver.name, tripsToday: driver.tripsToday })),
  };
}
