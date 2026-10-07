import type { VehicleClass } from "@/domain/fleet";
import { rangesOverlap, tripWindow } from "@/domain/time";

export type ScheduledTrip = { tripId: string; pickupAt: Date; durationMinutes: number };

export type OpenTrip = ScheduledTrip & { vehicleClass: VehicleClass };

export type DriverCandidate = {
  id: string;
  name: string;
  onDuty: boolean;
  vehicleClass: VehicleClass;
  tripsToday: number;
  activeTrips: readonly ScheduledTrip[];
};

export const suggestionLimit = 3;

function isFreeFor(trip: OpenTrip, driver: DriverCandidate): boolean {
  const wanted = tripWindow(trip.pickupAt, trip.durationMinutes);
  return driver.activeTrips.every(
    (held) => held.tripId === trip.tripId || !rangesOverlap(wanted, tripWindow(held.pickupAt, held.durationMinutes)),
  );
}

function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function byFairness(a: DriverCandidate, b: DriverCandidate): number {
  return a.tripsToday - b.tripsToday || compareText(a.name, b.name) || compareText(a.id, b.id);
}

export function matchDrivers(trip: OpenTrip, drivers: readonly DriverCandidate[]): DriverCandidate[] {
  return drivers
    .filter((driver) => driver.onDuty && driver.vehicleClass === trip.vehicleClass && isFreeFor(trip, driver))
    .sort(byFairness)
    .slice(0, suggestionLimit);
}
