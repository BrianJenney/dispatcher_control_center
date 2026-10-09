import { z } from "zod";
import { vehicleStatuses } from "@/domain/fleet";
import { dashboardKpis, isOnTheRoad, isUpNext, needsDriverToday, type DashboardKpis, type TripFigures } from "@/domain/kpis";
import { isWithin, type TimeRange } from "@/domain/time";
import { byPickupTime, tripRow, type TripRow } from "@/domain/trip-row";

export const dashboardSnapshot = z.object({
  today: z.object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) }),
  trips: z.array(tripRow),
  drivers: z.array(z.object({ onDuty: z.boolean() })),
  vehicles: z.array(z.object({ status: z.enum(vehicleStatuses) })),
});

export type DashboardSnapshot = z.infer<typeof dashboardSnapshot>;

function todayRange(today: DashboardSnapshot["today"]): TimeRange {
  return { start: new Date(today.start), end: new Date(today.end) };
}

function figures(trip: TripRow): TripFigures {
  return { status: trip.status, fareCents: trip.fareCents, pickupAt: new Date(trip.pickupAt), driverId: trip.driver?.id ?? null };
}

export function summarizeDashboard(snapshot: DashboardSnapshot): DashboardKpis {
  return dashboardKpis({
    trips: snapshot.trips.map(figures),
    drivers: snapshot.drivers,
    vehicles: snapshot.vehicles,
    today: todayRange(snapshot.today),
  });
}

export function isPickedUpToday(trip: TripRow, today: DashboardSnapshot["today"]): boolean {
  return isWithin(new Date(trip.pickupAt), todayRange(today));
}

export type DashboardLists = { needsDriver: TripRow[]; onTheRoad: TripRow[]; upNext: TripRow[] };

export function dashboardLists(snapshot: DashboardSnapshot): DashboardLists {
  const today = todayRange(snapshot.today);
  const sorted = [...snapshot.trips].sort(byPickupTime);
  return {
    needsDriver: sorted.filter((trip) => needsDriverToday(figures(trip), today)),
    onTheRoad: sorted.filter(isOnTheRoad),
    upNext: sorted.filter((trip) => isUpNext(figures(trip), today)),
  };
}
