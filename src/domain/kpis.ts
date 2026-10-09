import type { VehicleStatus } from "@/domain/fleet";
import { isWithin, type TimeRange } from "@/domain/time";
import type { TripStatus } from "@/domain/trip-status";

export type TripFigures = { status: TripStatus; fareCents: number; pickupAt: Date; driverId: string | null };

export function revenueCents(trips: readonly TripFigures[]): number {
  return trips.filter((trip) => trip.status === "completed").reduce((sum, trip) => sum + trip.fareCents, 0);
}

export function tripsTodayByDriver(trips: readonly TripFigures[], today: TimeRange): Map<string, number> {
  const counts = new Map<string, number>();
  for (const trip of trips) {
    if (!trip.driverId || trip.status === "cancelled" || !isWithin(trip.pickupAt, today)) continue;
    counts.set(trip.driverId, (counts.get(trip.driverId) ?? 0) + 1);
  }
  return counts;
}

export function needsDriverToday(trip: Pick<TripFigures, "status" | "pickupAt">, today: TimeRange): boolean {
  return trip.status === "offer" && isWithin(trip.pickupAt, today);
}

export function isUpNext(trip: Pick<TripFigures, "status" | "pickupAt">, today: TimeRange): boolean {
  return trip.status === "assigned" && isWithin(trip.pickupAt, today);
}

export function isOnTheRoad(trip: Pick<TripFigures, "status">): boolean {
  return trip.status === "en_route";
}

export type DashboardKpis = {
  activeJobs: number;
  needsDriver: number;
  enRouteNow: number;
  driversOnDuty: number;
  driversTotal: number;
  fleetReady: number;
  fleetTotal: number;
  revenueTodayCents: number;
  completedToday: number;
};

export function dashboardKpis(input: {
  trips: readonly TripFigures[];
  drivers: readonly { onDuty: boolean }[];
  vehicles: readonly { status: VehicleStatus }[];
  today: TimeRange;
}): DashboardKpis {
  const completedToday = input.trips.filter((trip) => trip.status === "completed" && isWithin(trip.pickupAt, input.today));
  const needsDriver = input.trips.filter((trip) => needsDriverToday(trip, input.today)).length;
  const upNext = input.trips.filter((trip) => isUpNext(trip, input.today)).length;
  const enRouteNow = input.trips.filter(isOnTheRoad).length;
  return {
    activeJobs: needsDriver + upNext + enRouteNow,
    needsDriver,
    enRouteNow,
    driversOnDuty: input.drivers.filter((driver) => driver.onDuty).length,
    driversTotal: input.drivers.length,
    fleetReady: input.vehicles.filter((vehicle) => vehicle.status === "ready").length,
    fleetTotal: input.vehicles.length,
    revenueTodayCents: revenueCents(completedToday),
    completedToday: completedToday.length,
  };
}
