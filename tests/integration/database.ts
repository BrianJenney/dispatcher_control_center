import { sql } from "drizzle-orm";
import { expect } from "vitest";
import { db } from "@/db/client";
import { drivers } from "@/db/schema";
import { demoUser } from "@/env-demo";
import type { VehicleClass } from "@/domain/fleet";
import type { TripStatus } from "@/domain/trip-status";
import { violatedConstraint } from "@/server/database-errors";

export async function demoUserId() {
  const rows = await db.execute<{ id: string }>(sql`select id from "user" where email = ${demoUser.email}`);
  const id = rows.rows[0]?.id;
  if (!id) throw new Error("The seed did not create the demo user.");
  return id;
}

export async function insertDriver(vehicleClass: VehicleClass = "luxury_sedan") {
  const [driver] = await db
    .insert(drivers)
    .values({ name: "Test Driver", phone: "(555) 555-0100", vehicleClass, onDuty: true })
    .returning({ id: drivers.id });
  if (!driver) throw new Error("Driver insert returned nothing.");
  return driver.id;
}

let nextSlot = 0;

export function freeSlot() {
  nextSlot += 1;
  return new Date(Date.UTC(2030, 0, 1) + nextSlot * 4 * 3_600_000);
}

export async function insertOffer(actorId: string, pickupAt = freeSlot(), durationMinutes = 60) {
  return db.transaction(async (tx) => {
    const inserted = await tx.execute<{ id: string }>(sql`
      insert into trips (customer_name, pickup_address, dropoff_address, pickup_at, duration_minutes, passengers, vehicle_class, fare_cents)
      values ('Test Customer', '1 Alder Court', 'Regional Airport', ${pickupAt.toISOString()}, ${durationMinutes}, 2, 'luxury_sedan', 12000)
      returning id`);
    const id = inserted.rows[0]?.id;
    if (!id) throw new Error("Trip insert returned nothing.");
    await tx.execute(sql`insert into trip_events (trip_id, actor_id, to_status) values (${id}, ${actorId}, 'offer')`);
    return id;
  });
}

export async function forceStatus(
  tripId: string,
  actorId: string,
  move: { from: TripStatus; to: TripStatus; driverId: string | null; reason?: string | null },
) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update trips set status = ${move.to}, driver_id = ${move.driverId}, cancel_reason = ${move.reason ?? null}
      where id = ${tripId}`);
    await tx.execute(sql`
      insert into trip_events (trip_id, actor_id, from_status, to_status, reason)
      values (${tripId}, ${actorId}, ${move.from}, ${move.to}, ${move.reason ?? null})`);
  });
}

export async function expectRejectedBy(attempt: Promise<unknown>, constraint: string) {
  const error: unknown = await attempt.then(
    () => null,
    (failure: unknown) => failure,
  );
  expect(error, `expected the database to reject the write with ${constraint}`).not.toBeNull();
  expect(violatedConstraint(error)).toBe(constraint);
}
