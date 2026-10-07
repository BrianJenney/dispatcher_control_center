import { z } from "zod";
import { revenueCents, tripsTodayByDriver } from "@/domain/kpis";
import { dayRange, isWithin, shiftDays, type TimeRange } from "@/domain/time";
import type { TripRow } from "@/domain/trip-row";
import { isFinal } from "@/domain/trip-status";

export const insightWindowDays = 7;
export const soonMinutes = 120;
export const lateMinutes = 15;
export const reasonLimit = 5;

const minuteMs = 60_000;

export const attentionKinds = ["needs-driver-soon", "missed-pickup", "late-to-start"] as const;
export type AttentionKind = (typeof attentionKinds)[number];

export const insightsSnapshot = z.object({
  today: z.object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) }),
  days: z.array(
    z.object({
      start: z.iso.datetime({ offset: true }),
      completed: z.number().int(),
      cancelled: z.number().int(),
      open: z.number().int(),
      revenueCents: z.number().int(),
    }),
  ),
  weekTrips: z.number().int(),
  weekCompleted: z.number().int(),
  weekCancelled: z.number().int(),
  weekRevenueCents: z.number().int(),
  cancelReasons: z.array(z.object({ reason: z.string(), count: z.number().int() })),
  attention: z.array(
    z.object({
      kind: z.enum(attentionKinds),
      tripId: z.uuid(),
      reference: z.number().int(),
      customerName: z.string(),
      pickupAt: z.iso.datetime({ offset: true }),
    }),
  ),
  driverLoad: z.array(z.object({ driverId: z.uuid(), name: z.string(), trips: z.number().int() })),
});

export type InsightsSnapshot = z.infer<typeof insightsSnapshot>;

export type InsightDriver = { id: string; name: string; onDuty: boolean };

export function insightsWindow(now: Date, timeZone: string): TimeRange {
  const today = dayRange(now, timeZone);
  return { start: shiftDays(today, 1 - insightWindowDays, timeZone).start, end: shiftDays(today, 1, timeZone).end };
}

function attentionKind(trip: TripRow, now: Date): AttentionKind | null {
  const pickup = new Date(trip.pickupAt).getTime();
  const nowMs = now.getTime();
  if (trip.status === "offer") {
    if (pickup < nowMs) return "missed-pickup";
    return pickup <= nowMs + soonMinutes * minuteMs ? "needs-driver-soon" : null;
  }
  if (trip.status === "assigned" && pickup < nowMs - lateMinutes * minuteMs) return "late-to-start";
  return null;
}

function topReasons(cancelled: readonly TripRow[]) {
  const counts = new Map<string, { reason: string; count: number }>();
  for (const trip of cancelled) {
    const reason = trip.cancelReason?.trim() ?? "";
    if (!reason) continue;
    const key = reason.toLowerCase();
    const seen = counts.get(key);
    counts.set(key, { reason: seen?.reason ?? reason, count: (seen?.count ?? 0) + 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, reasonLimit);
}

export function buildInsights(input: {
  trips: readonly TripRow[];
  drivers: readonly InsightDriver[];
  now: Date;
  timeZone: string;
}): InsightsSnapshot {
  const { drivers, now, timeZone } = input;
  const today = dayRange(now, timeZone);
  const window = insightsWindow(now, timeZone);
  const inWindow = input.trips.filter((trip) => isWithin(new Date(trip.pickupAt), window));
  const lastDays = Array.from({ length: insightWindowDays }, (_, index) =>
    shiftDays(today, index + 1 - insightWindowDays, timeZone),
  );
  const days = lastDays.map((day) => {
    const dayTrips = inWindow.filter((trip) => isWithin(new Date(trip.pickupAt), day));
    return {
      start: day.start.toISOString(),
      completed: dayTrips.filter((trip) => trip.status === "completed").length,
      cancelled: dayTrips.filter((trip) => trip.status === "cancelled").length,
      open: dayTrips.filter((trip) => !isFinal(trip.status)).length,
      revenueCents: revenueCents(
        dayTrips.map((trip) => ({ ...trip, pickupAt: new Date(trip.pickupAt), driverId: trip.driver?.id ?? null })),
      ),
    };
  });
  const counted = inWindow.filter((trip) => isWithin(new Date(trip.pickupAt), { start: window.start, end: today.end }));
  const loads = tripsTodayByDriver(
    inWindow.map((trip) => ({
      status: trip.status,
      fareCents: trip.fareCents,
      pickupAt: new Date(trip.pickupAt),
      driverId: trip.driver?.id ?? null,
    })),
    today,
  );
  return {
    today: { start: today.start.toISOString(), end: today.end.toISOString() },
    days,
    weekTrips: counted.length,
    weekCompleted: days.reduce((sum, day) => sum + day.completed, 0),
    weekCancelled: days.reduce((sum, day) => sum + day.cancelled, 0),
    weekRevenueCents: days.reduce((sum, day) => sum + day.revenueCents, 0),
    cancelReasons: topReasons(counted.filter((trip) => trip.status === "cancelled")),
    attention: inWindow
      .flatMap((trip) => {
        const kind = attentionKind(trip, now);
        return kind ? [{ kind, tripId: trip.id, reference: trip.reference, customerName: trip.customerName, pickupAt: trip.pickupAt }] : [];
      })
      .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt) || a.reference - b.reference),
    driverLoad: drivers
      .filter((driver) => driver.onDuty)
      .map((driver) => ({ driverId: driver.id, name: driver.name, trips: loads.get(driver.id) ?? 0 }))
      .sort((a, b) => b.trips - a.trips || a.name.localeCompare(b.name) || a.driverId.localeCompare(b.driverId)),
  };
}
