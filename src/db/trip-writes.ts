import { eq, sql } from "drizzle-orm";
import type { Transaction } from "@/db/client";
import { tripEvents, trips } from "@/db/schema";
import { DomainError } from "@/domain/result";
import { tripMessages, type TripEvent, type TripState } from "@/domain/trip-status";

export type NewTrip = typeof trips.$inferInsert & { id: string };

export type TripMove = { tripId: string; trip: TripState; event: TripEvent };

export type TripDetails = Omit<NewTrip, "id" | "status" | "driverId" | "cancelReason">;

export async function insertOffers(tx: Transaction, actorId: string, newTrips: readonly NewTrip[]) {
  if (newTrips.length === 0) return [];
  const created = await tx
    .insert(trips)
    .values([...newTrips])
    .returning({ id: trips.id, reference: trips.reference, customerName: trips.customerName });
  await tx
    .insert(tripEvents)
    .values(newTrips.map((trip) => ({ tripId: trip.id, actorId, fromStatus: null, toStatus: "offer" as const })));
  return created;
}

export async function updateTripDetails(tx: Transaction, tripId: string, details: TripDetails) {
  await tx.update(trips).set(details).where(eq(trips.id, tripId));
}

export async function applyTransitions(tx: Transaction, moves: readonly TripMove[]) {
  if (moves.length === 0) return;
  const rows = sql.join(
    moves.map(
      (move) =>
        sql`(${move.tripId}::uuid, ${move.event.fromStatus}::trip_status, ${move.trip.status}::trip_status, ${move.trip.driverId}::uuid, ${move.trip.cancelReason})`,
    ),
    sql`, `,
  );
  const updated = await tx.execute(sql`
    update trips
    set status = moves.status, driver_id = moves.driver_id, cancel_reason = moves.cancel_reason, updated_at = now()
    from (values ${rows}) as moves (id, from_status, status, driver_id, cancel_reason)
    where trips.id = moves.id and trips.status = moves.from_status`);
  if (updated.rowCount !== moves.length) throw new DomainError(tripMessages.changedElsewhere);
  await tx.insert(tripEvents).values(moves.map((move) => ({ tripId: move.tripId, ...move.event })));
}
