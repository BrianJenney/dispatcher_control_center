import { z } from "zod";
import { shownCount } from "@/domain/paging";
import { describeTripEdit, tripEdit, type HistoryFormat } from "@/domain/trip-edits";
import { tripStatuses, type TripStatus } from "@/domain/trip-status";

export const activityFilter = z.object({
  show: shownCount,
});

export type ActivityFilter = z.output<typeof activityFilter>;

const activityBase = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  historyOrder: z.number().int(),
  actorName: z.string(),
  tripId: z.uuid(),
  reference: z.number().int(),
  customerName: z.string(),
});

const moveEntry = activityBase.extend({
  kind: z.literal("move"),
  fromStatus: z.enum(tripStatuses).nullable(),
  toStatus: z.enum(tripStatuses),
  fromDriverName: z.string().nullable(),
  toDriverName: z.string().nullable(),
  reason: z.string().nullable(),
});

const editEntry = activityBase.extend({
  kind: z.literal("edit"),
  edit: tripEdit,
});

export const activityEntry = z.discriminatedUnion("kind", [moveEntry, editEntry]);

export type ActivityEntry = z.infer<typeof activityEntry>;

export type MoveEntry = z.infer<typeof moveEntry>;

export const activitySnapshot = z.object({ entries: z.array(activityEntry), hasMore: z.boolean() });

export type ActivitySnapshot = z.infer<typeof activitySnapshot>;

const arrivals: Record<TripStatus, string> = {
  offer: "booked",
  assigned: "assigned",
  en_route: "started",
  completed: "completed",
  cancelled: "cancelled",
};

function describeMove(entry: MoveEntry, trip: string): string {
  const { fromStatus, toStatus, fromDriverName, toDriverName } = entry;
  if (fromStatus === "assigned" && toStatus === "assigned") {
    return fromDriverName && toDriverName
      ? `reassigned ${trip} from ${fromDriverName} to ${toDriverName}`
      : `changed the driver on ${trip}`;
  }
  if (toStatus === "assigned") return toDriverName ? `assigned ${trip} to ${toDriverName}` : `assigned a driver to ${trip}`;
  if (toStatus === "cancelled" && entry.reason) return `cancelled ${trip}: ${entry.reason}`;
  return `${arrivals[toStatus]} ${trip}`;
}

export function describeActivity(entry: ActivityEntry, format: HistoryFormat): string {
  const trip = `trip #${String(entry.reference)}`;
  return entry.kind === "edit" ? describeTripEdit(entry.edit, trip, format) : describeMove(entry, trip);
}

function newerFirst(a: ActivityEntry, b: ActivityEntry): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return b.historyOrder - a.historyOrder;
}

export function activityPage(entries: readonly ActivityEntry[], show: number): ActivitySnapshot {
  const newest = entries.toSorted(newerFirst);
  return { entries: newest.slice(0, show), hasMore: newest.length > show };
}
