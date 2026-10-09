import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { drivers, tripEdits, tripEvents, trips, user } from "@/db/schema";
import { activityPage, type ActivityEntry, type ActivityFilter, type ActivitySnapshot } from "@/domain/activity";
import { tripEdit } from "@/domain/trip-edits";
import { defineQuery } from "@/server/query";

const fromDriver = alias(drivers, "from_driver");
const toDriver = alias(drivers, "to_driver");

async function newestMoves(limit: number): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id: tripEvents.id,
      createdAt: tripEvents.createdAt,
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
    .orderBy(desc(tripEvents.createdAt), desc(tripEvents.id))
    .limit(limit);
  return rows.map((row) => ({ ...row, kind: "move", createdAt: row.createdAt.toISOString() }));
}

async function newestEdits(limit: number): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id: tripEdits.id,
      createdAt: tripEdits.createdAt,
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
    .orderBy(desc(tripEdits.createdAt), desc(tripEdits.id))
    .limit(limit);
  return rows.map((row) => ({
    kind: "edit",
    id: row.id,
    createdAt: row.createdAt.toISOString(),
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

export const getActivity = defineQuery("signed-in", async (filter: ActivityFilter): Promise<ActivitySnapshot> => {
  const [moves, edits] = await Promise.all([newestMoves(filter.show + 1), newestEdits(filter.show + 1)]);
  return activityPage([...moves, ...edits], filter.show);
});
