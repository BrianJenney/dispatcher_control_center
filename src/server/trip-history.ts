import { desc, eq, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { drivers, tripEdits, tripEvents, trips, user } from "@/db/schema";
import type { ActivityEntry } from "@/domain/activity";
import { tripEdit } from "@/domain/trip-edits";

const fromDriver = alias(drivers, "from_driver");
const toDriver = alias(drivers, "to_driver");

function forTrip(column: typeof tripEvents.tripId | typeof tripEdits.tripId, tripId: string | undefined): SQL | undefined {
  return tripId ? eq(column, tripId) : undefined;
}

export async function newestMoves(limit: number, tripId?: string): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id: tripEvents.id,
      createdAt: tripEvents.createdAt,
      historyOrder: tripEvents.historyOrder,
      actorName: user.name,
      tripId: trips.id,
      reference: trips.reference,
      customerName: trips.customerName,
      fromStatus: tripEvents.fromStatus,
      toStatus: tripEvents.toStatus,
      fromDriverName: fromDriver.name,
      toDriverName: toDriver.name,
      reason: tripEvents.reason,
    })
    .from(tripEvents)
    .innerJoin(trips, eq(tripEvents.tripId, trips.id))
    .innerJoin(user, eq(tripEvents.actorId, user.id))
    .leftJoin(fromDriver, eq(tripEvents.fromDriverId, fromDriver.id))
    .leftJoin(toDriver, eq(tripEvents.toDriverId, toDriver.id))
    .where(forTrip(tripEvents.tripId, tripId))
    .orderBy(desc(tripEvents.createdAt), desc(tripEvents.historyOrder))
    .limit(limit);
  return rows.map((row) => ({ ...row, kind: "move", createdAt: row.createdAt.toISOString() }));
}

export async function newestEdits(limit: number, tripId?: string): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id: tripEdits.id,
      createdAt: tripEdits.createdAt,
      historyOrder: tripEdits.historyOrder,
      actorName: user.name,
      tripId: trips.id,
      reference: trips.reference,
      customerName: trips.customerName,
      field: tripEdits.field,
      fromText: tripEdits.fromText,
      toText: tripEdits.toText,
      fromInteger: tripEdits.fromInteger,
      toInteger: tripEdits.toInteger,
      fromTime: tripEdits.fromTime,
      toTime: tripEdits.toTime,
      fromClass: tripEdits.fromClass,
      toClass: tripEdits.toClass,
    })
    .from(tripEdits)
    .innerJoin(trips, eq(tripEdits.tripId, trips.id))
    .innerJoin(user, eq(tripEdits.actorId, user.id))
    .where(forTrip(tripEdits.tripId, tripId))
    .orderBy(desc(tripEdits.createdAt), desc(tripEdits.historyOrder))
    .limit(limit);
  return rows.map((row) => ({
    kind: "edit",
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    historyOrder: row.historyOrder,
    actorName: row.actorName,
    tripId: row.tripId,
    reference: row.reference,
    customerName: row.customerName,
    edit: tripEdit.parse({
      field: row.field,
      from: row.fromText ?? row.fromInteger ?? row.fromTime?.toISOString() ?? row.fromClass,
      to: row.toText ?? row.toInteger ?? row.toTime?.toISOString() ?? row.toClass,
    }),
  }));
}
