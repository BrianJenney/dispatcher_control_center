import { eq } from "drizzle-orm";
import { trips } from "@/db/schema";
import { activityPage } from "@/domain/activity";
import { recordId } from "@/domain/result";
import { tripHistoryLimit, type TripDetail } from "@/domain/trip-detail";
import { defineQuery } from "@/server/query";
import { newestEdits, newestMoves } from "@/server/trip-history";
import { tripRows } from "@/server/trip-rows";

export const getTripDetail = defineQuery("signed-in", async (id: unknown): Promise<TripDetail | null> => {
  const tripId = recordId(id);
  if (!tripId) return null;
  const [rows, moves, edits] = await Promise.all([
    tripRows(eq(trips.id, tripId), { limit: 1 }),
    newestMoves(tripHistoryLimit, tripId),
    newestEdits(tripHistoryLimit, tripId),
  ]);
  const trip = rows[0];
  if (!trip) return null;
  return { trip, history: activityPage([...moves, ...edits], tripHistoryLimit).entries };
});
