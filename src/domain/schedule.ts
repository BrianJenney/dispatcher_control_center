import { z } from "zod";
import { hourMs, tripWindow } from "@/domain/time";
import { byPickupTime, tripRow, type TripRow } from "@/domain/trip-row";
import { tripStatuses } from "@/domain/trip-status";

export const scheduleSnapshot = z.object({
  today: z.object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) }),
  now: z.iso.datetime({ offset: true }),
  trips: z.array(tripRow),
  drivers: z.array(z.object({ id: z.uuid(), name: z.string() })),
});

export type ScheduleSnapshot = z.infer<typeof scheduleSnapshot>;

export const scheduleFilter = z.object({
  status: z.enum(tripStatuses).nullable().catch(null),
  driver: z.uuid().nullable().catch(null),
});

export type ScheduleFilter = z.output<typeof scheduleFilter>;

export const noScheduleFilter: ScheduleFilter = { status: null, driver: null };

export function scheduleSearch(filter: ScheduleFilter): string {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.driver) params.set("driver", filter.driver);
  return params.toString();
}

export function isFiltered(filter: ScheduleFilter): boolean {
  return filter.status !== null || filter.driver !== null;
}

export function filterTrips(rows: readonly TripRow[], filter: ScheduleFilter): TripRow[] {
  return rows.filter(
    (row) =>
      (filter.status === null || row.status === filter.status) &&
      (filter.driver === null || row.driver?.id === filter.driver),
  );
}


export const minimumAxisHours = 4;

export type TimelineAxis = { start: string; end: string; hours: string[] };

function endOf(trip: TripRow): number {
  return tripWindow(new Date(trip.pickupAt), trip.durationMinutes).end.getTime();
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function timelineAxis(
  today: ScheduleSnapshot["today"],
  trips: readonly TripRow[],
  now: string,
): TimelineAxis {
  const dayStart = Date.parse(today.start);
  const dayEnd = Date.parse(today.end);
  const nowMs = clamp(Date.parse(now), dayStart, dayEnd);
  const earliest = Math.min(nowMs, ...trips.map((trip) => Date.parse(trip.pickupAt)));
  const latest = clamp(Math.max(nowMs, ...trips.map(endOf)), dayStart, dayEnd);
  let start = dayStart + Math.floor((clamp(earliest, dayStart, dayEnd) - dayStart) / hourMs) * hourMs;
  let end = Math.min(dayEnd, dayStart + Math.ceil((latest - dayStart) / hourMs) * hourMs);
  const shortBy = minimumAxisHours * hourMs - (end - start);
  if (shortBy > 0) {
    end = Math.min(dayEnd, end + shortBy);
    start = Math.max(dayStart, end - minimumAxisHours * hourMs);
  }
  const hours: string[] = [];
  for (let hour = start; hour < end; hour += hourMs) hours.push(new Date(hour).toISOString());
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString(), hours };
}

function fractionOf(axis: TimelineAxis, instant: number): number {
  const start = Date.parse(axis.start);
  return (instant - start) / (Date.parse(axis.end) - start);
}

export type AxisPlacement = { left: number; width: number; runsOver: boolean };

export function placeOnAxis(axis: TimelineAxis, trip: TripRow): AxisPlacement {
  const from = clamp(fractionOf(axis, Date.parse(trip.pickupAt)), 0, 1);
  const until = fractionOf(axis, endOf(trip));
  return { left: from, width: clamp(until, from, 1) - from, runsOver: until > 1 };
}

export function axisPosition(axis: TimelineAxis, instant: string): number | null {
  const fraction = fractionOf(axis, Date.parse(instant));
  return fraction >= 0 && fraction <= 1 ? fraction : null;
}

export type LanedTrip = { trip: TripRow; lane: number };

export function packLanes(trips: readonly TripRow[]): { lanes: number; trips: LanedTrip[] } {
  const laneEnds: number[] = [];
  const laned = [...trips].sort(byPickupTime).map((trip) => {
    const start = Date.parse(trip.pickupAt);
    const free = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    const lane = free === -1 ? laneEnds.length : free;
    laneEnds[lane] = endOf(trip);
    return { trip, lane };
  });
  return { lanes: Math.max(1, laneEnds.length), trips: laned };
}

export type TimelineRow = { driver: TripRow["driver"]; lanes: number; trips: LanedTrip[] };

function byDriver(a: TimelineRow, b: TimelineRow): number {
  if (!a.driver || !b.driver) return Number(Boolean(a.driver)) - Number(Boolean(b.driver));
  return a.driver.name.localeCompare(b.driver.name) || a.driver.id.localeCompare(b.driver.id);
}

export function timelineRows(trips: readonly TripRow[]): TimelineRow[] {
  const groups = new Map<string | null, TripRow[]>();
  for (const trip of trips) {
    const key = trip.driver?.id ?? null;
    const group = groups.get(key);
    if (group) group.push(trip);
    else groups.set(key, [trip]);
  }
  return [...groups.values()]
    .map((group) => ({ driver: group[0]?.driver ?? null, ...packLanes(group) }))
    .sort(byDriver);
}

export function upcomingIndex(sortedTrips: readonly TripRow[], now: string): number {
  const nowMs = Date.parse(now);
  const index = sortedTrips.findIndex((trip) => Date.parse(trip.pickupAt) >= nowMs);
  return index === -1 ? sortedTrips.length : index;
}
