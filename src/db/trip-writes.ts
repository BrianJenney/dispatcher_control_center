import { eq, sql } from "drizzle-orm";
import type { Transaction } from "@/db/client";
import { tripEdits, tripEvents, trips } from "@/db/schema";
import { DomainError, missingRecord } from "@/domain/result";
import { diffTripDetails, type TripDetails, type TripEdit } from "@/domain/trip-edits";
import { tripMessages, type TripEvent, type TripState } from "@/domain/trip-status";

export type NewTrip = typeof trips.$inferInsert & { id: string };

export type TripMove = { tripId: string; trip: TripState; event: TripEvent };

const detailColumns = {
  customerName: trips.customerName,
  pickupAddress: trips.pickupAddress,
  dropoffAddress: trips.dropoffAddress,
  pickupAt: trips.pickupAt,
  durationMinutes: trips.durationMinutes,
  passengers: trips.passengers,
  vehicleClass: trips.vehicleClass,
  fareCents: trips.fareCents,
};

function editValues(edit: TripEdit) {
  switch (edit.field) {
    case "pickup_at":
      return { fromTime: new Date(edit.from), toTime: new Date(edit.to) };
    case "vehicle_class":
      return { fromClass: edit.from, toClass: edit.to };
    case "duration_minutes":
    case "passengers":
    case "fare_cents":
      return { fromInteger: edit.from, toInteger: edit.to };
    case "customer_name":
    case "pickup_address":
    case "dropoff_address":
      return { fromText: edit.from, toText: edit.to };
  }
}

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

export async function updateTripDetails(tx: Transaction, actorId: string, tripId: string, details: TripDetails) {
  const [current] = await tx.select(detailColumns).from(trips).where(eq(trips.id, tripId)).for("update");
  if (!current) throw new DomainError(missingRecord.trip);
  const edits = diffTripDetails(current, details);
  if (edits.length === 0) return;
  await tx.insert(tripEdits).values(edits.map((edit) => ({ tripId, actorId, field: edit.field, ...editValues(edit) })));
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
