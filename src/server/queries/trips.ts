import { asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { drivers, trips } from "@/db/schema";
import type { TripRow } from "@/domain/trip-row";

export async function tripRows(where: SQL | undefined, limit?: number): Promise<TripRow[]> {
  const query = db
    .select({
      id: trips.id,
      reference: trips.reference,
      customerName: trips.customerName,
      pickupAddress: trips.pickupAddress,
      dropoffAddress: trips.dropoffAddress,
      pickupAt: trips.pickupAt,
      durationMinutes: trips.durationMinutes,
      passengers: trips.passengers,
      vehicleClass: trips.vehicleClass,
      fareCents: trips.fareCents,
      status: trips.status,
      cancelReason: trips.cancelReason,
      driverId: drivers.id,
      driverName: drivers.name,
    })
    .from(trips)
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .where(where)
    .orderBy(asc(trips.pickupAt), asc(trips.reference))
    .$dynamic();
  const rows = await (limit ? query.limit(limit) : query);
  return rows.map(({ driverId, driverName, pickupAt, ...row }) => ({
    ...row,
    pickupAt: pickupAt.toISOString(),
    driver: driverId && driverName ? { id: driverId, name: driverName } : null,
  }));
}
