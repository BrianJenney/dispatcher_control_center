import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { trips, tripEvents, user } from "@/db/schema";
import type { ActivityFilter, ActivitySnapshot } from "@/domain/activity";

export async function getActivity(filter: ActivityFilter): Promise<ActivitySnapshot> {
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
      reason: tripEvents.reason,
    })
    .from(tripEvents)
    .innerJoin(trips, eq(tripEvents.tripId, trips.id))
    .innerJoin(user, eq(tripEvents.actorId, user.id))
    .orderBy(desc(tripEvents.createdAt), desc(tripEvents.id))
    .limit(filter.show + 1);
  return {
    entries: rows.slice(0, filter.show).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    hasMore: rows.length > filter.show,
  };
}
