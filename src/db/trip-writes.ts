import { sql } from "drizzle-orm";
import type { Transaction } from "@/db/client";
import { tripEvents, trips } from "@/db/schema";
import { DomainError } from "@/domain/result";
import { tripMessages, type TripEvent, type TripState } from "@/domain/trip-status";

export type NewTrip = typeof trips.$inferInsert & { id: string };

export type TripMove = { tripId: string; trip: TripState; event: TripEvent };

export async function insertOffers(tx: Transaction, actorId: string, newTrips: readonly NewTrip[]) {
  if (newTrips.length === 0) return;
  await tx.insert(trips).values([...newTrips]);
  await tx
    .insert(tripEvents)
    .values(newTrips.map((trip) => ({ tripId: trip.id, actorId, fromStatus: null, toStatus: "offer" as const })));
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
