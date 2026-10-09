import { activityPage, type ActivityFilter, type ActivitySnapshot } from "@/domain/activity";
import { defineQuery } from "@/server/query";
import { newestEdits, newestMoves } from "@/server/trip-history";

export const getActivity = defineQuery("signed-in", async (filter: ActivityFilter): Promise<ActivitySnapshot> => {
  const [moves, edits] = await Promise.all([newestMoves(filter.show + 1), newestEdits(filter.show + 1)]);
  return activityPage([...moves, ...edits], filter.show);
});
