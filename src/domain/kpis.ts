import type { VehicleStatus } from "@/domain/fleet";
import { isWithin, type TimeRange } from "@/domain/time";
import { isActive, type TripStatus } from "@/domain/trip-status";

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

export type DashboardKpis = {
  activeJobs: number;
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
  return {
    activeJobs: input.trips.filter((trip) => isActive(trip.status)).length,
    driversOnDuty: input.drivers.filter((driver) => driver.onDuty).length,
    driversTotal: input.drivers.length,
    fleetReady: input.vehicles.filter((vehicle) => vehicle.status === "ready").length,
    fleetTotal: input.vehicles.length,
    revenueTodayCents: revenueCents(completedToday),
    completedToday: completedToday.length,
  };
}
