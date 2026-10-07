import { DomainError } from "@/domain/result";

export const tripStatuses = ["offer", "assigned", "en_route", "completed", "cancelled"] as const;
export type TripStatus = (typeof tripStatuses)[number];

export const statusLabels: Record<TripStatus, string> = {
  offer: "Offer",
  assigned: "Assigned",
  en_route: "En route",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const transitions: Record<TripStatus, readonly TripStatus[]> = {
  offer: ["assigned", "cancelled"],
  assigned: ["en_route", "cancelled"],
  en_route: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const activeStatuses: readonly TripStatus[] = ["assigned", "en_route"];

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return transitions[from].includes(to);
}

export function isFinal(status: TripStatus): boolean {
  return transitions[status].length === 0;
}

export function isActive(status: TripStatus): boolean {
  return activeStatuses.includes(status);
}

export type TripState = {
  status: TripStatus;
  driverId: string | null;
  cancelReason: string | null;
};

export type TransitionRequest = {
  to: TripStatus;
  actorId: string;
  driverId?: string;
  reason?: string;
};

export type TripEvent = {
  fromStatus: TripStatus;
  toStatus: TripStatus;
  actorId: string;
  reason: string | null;
};

function nextDriver(trip: TripState, request: TransitionRequest): string | null {
  if (request.to !== "assigned") return trip.driverId;
  if (!request.driverId) throw new DomainError("Choose a driver before assigning the trip.");
  return request.driverId;
}

function cancelReason(request: TransitionRequest): string | null {
  if (request.to !== "cancelled") return null;
  const reason = request.reason?.trim();
  if (!reason) throw new DomainError("Give a reason for cancelling the trip.");
  return reason;
}

export function transitionTrip(trip: TripState, request: TransitionRequest): { trip: TripState; event: TripEvent } {
  if (!canTransition(trip.status, request.to)) {
    throw new DomainError(
      `A trip that is ${statusLabels[trip.status].toLowerCase()} cannot move to ${statusLabels[request.to].toLowerCase()}.`,
    );
  }
  const reason = cancelReason(request);
  return {
    trip: { status: request.to, driverId: nextDriver(trip, request), cancelReason: reason },
    event: { fromStatus: trip.status, toStatus: request.to, actorId: request.actorId, reason },
  };
}
