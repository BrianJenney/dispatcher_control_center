import { z } from "zod";
import { tripRow, type TripRow } from "@/domain/trip-row";

export const scheduleSnapshot = z.object({
  today: z.object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) }),
  trips: z.array(tripRow),
  drivers: z.array(z.object({ id: z.uuid(), name: z.string() })),
});

export type ScheduleSnapshot = z.infer<typeof scheduleSnapshot>;

export function groupByHour(trips: readonly TripRow[], hourOf: (iso: string) => string) {
  const groups: { hour: string; trips: TripRow[] }[] = [];
  for (const trip of trips) {
    const hour = hourOf(trip.pickupAt);
    const last = groups.at(-1);
    if (last?.hour === hour) last.trips.push(trip);
    else groups.push({ hour, trips: [trip] });
  }
  return groups;
}
