import { z } from "zod";
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

const statusPhrases: Record<TripStatus, string> = {
  offer: "still an offer",
  assigned: "assigned",
  en_route: "en route",
  completed: "completed",
  cancelled: "cancelled",
};

export const tripMessages = {
  driverRequired: "Choose a driver before assigning the trip.",
  cancelReasonRequired: "Give a reason for cancelling the trip.",
  changedElsewhere: "Someone else changed this trip first. Refresh to see its latest status.",
};

export const activeStatuses: readonly TripStatus[] = ["assigned", "en_route"];

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return transitions[from].includes(to);
}

export function isFinal(status: TripStatus): boolean {
  return transitions[status].length === 0;
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
  fromDriverId: string | null;
  toDriverId: string | null;
  actorId: string;
  reason: string | null;
};

function nextDriver(trip: TripState, request: TransitionRequest): string | null {
  if (request.to !== "assigned") return trip.driverId;
  if (!request.driverId) throw new DomainError(tripMessages.driverRequired);
  return request.driverId;
}

function cancelReason(request: TransitionRequest): string | null {
  if (request.to !== "cancelled") return null;
  const reason = request.reason?.trim();
  if (!reason) throw new DomainError(tripMessages.cancelReasonRequired);
  return reason;
}

export function transitionTrip(trip: TripState, request: TransitionRequest): { trip: TripState; event: TripEvent } {
  if (!canTransition(trip.status, request.to)) {
    throw new DomainError(
      `A trip that is ${statusPhrases[trip.status]} cannot move to ${statusLabels[request.to].toLowerCase()}.`,
    );
  }
  const reason = cancelReason(request);
  const driverId = nextDriver(trip, request);
  return {
    trip: { status: request.to, driverId, cancelReason: reason },
    event: {
      fromStatus: trip.status,
      toStatus: request.to,
      fromDriverId: trip.driverId,
      toDriverId: driverId,
      actorId: request.actorId,
      reason,
    },
  };
}

export const moveTripInput = z.object({
  tripId: z.uuid(),
  from: z.enum(tripStatuses),
  to: z.enum(tripStatuses),
  driverId: z.uuid().optional(),
  reason: z.string().trim().max(200, "Keep the reason to 200 characters or fewer.").optional(),
});

export const nextStep: Partial<Record<TripStatus, { to: TripStatus; label: string }>> = {
  assigned: { to: "en_route", label: "Start trip" },
  en_route: { to: "completed", label: "Complete trip" },
};
