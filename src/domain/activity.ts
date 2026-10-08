import { z } from "zod";
import { shownCount } from "@/domain/paging";
import { tripStatuses, type TripStatus } from "@/domain/trip-status";

export const activityFilter = z.object({
  show: shownCount,
});

export type ActivityFilter = z.output<typeof activityFilter>;

export const activityEntry = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  actorName: z.string(),
  tripId: z.uuid(),
  reference: z.number().int(),
  customerName: z.string(),
  fromStatus: z.enum(tripStatuses).nullable(),
  toStatus: z.enum(tripStatuses),
  reason: z.string().nullable(),
});

export type ActivityEntry = z.infer<typeof activityEntry>;

export const activitySnapshot = z.object({ entries: z.array(activityEntry), hasMore: z.boolean() });

export type ActivitySnapshot = z.infer<typeof activitySnapshot>;

const arrivals: Record<TripStatus, string> = {
  offer: "booked the trip",
  assigned: "assigned a driver to the trip",
  en_route: "started the trip",
  completed: "completed the trip",
  cancelled: "cancelled the trip",
};

export function describeActivity(entry: Pick<ActivityEntry, "fromStatus" | "toStatus" | "reason">): string {
  if (entry.fromStatus === "assigned" && entry.toStatus === "assigned") return "changed the driver on the trip";
  const action = arrivals[entry.toStatus];
  return entry.toStatus === "cancelled" && entry.reason ? `${action}: ${entry.reason}` : action;
}
