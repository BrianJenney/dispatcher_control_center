import { vehicleClassLabels, type VehicleClass } from "@/domain/fleet";
import { DomainError } from "@/domain/result";
import type { TripEvent, TripState, TripStatus } from "@/domain/trip-status";

export type AssignableDriver = { id: string; name: string; onDuty: boolean; vehicleClass: VehicleClass };

export function withArticle(label: string): string {
  return `${/^[aeiou]/i.test(label) ? "an" : "a"} ${label}`;
}

export function assignmentProblem(trip: { vehicleClass: VehicleClass }, driver: AssignableDriver): string | null {
  if (!driver.onDuty) return `${driver.name} is off duty. Choose a driver who is on duty.`;
  if (driver.vehicleClass !== trip.vehicleClass) {
    const drives = vehicleClassLabels[driver.vehicleClass];
    const needs = vehicleClassLabels[trip.vehicleClass];
    return `${driver.name} drives ${withArticle(drives)}, but this trip needs ${withArticle(needs)}.`;
  }
  return null;
}

export const editableStatuses: readonly TripStatus[] = ["offer", "assigned"];

export function isEditable(status: TripStatus): boolean {
  return editableStatuses.includes(status);
}

export function reassignTrip(
  trip: TripState,
  request: { driverId: string; actorId: string },
): { trip: TripState; event: TripEvent } {
  if (trip.status !== "assigned") throw new DomainError("Only an assigned trip can move to another driver.");
  if (trip.driverId === request.driverId) throw new DomainError("That driver already has this trip.");
  return {
    trip: { ...trip, driverId: request.driverId },
    event: { fromStatus: "assigned", toStatus: "assigned", actorId: request.actorId, reason: "Reassigned to another driver" },
  };
}
