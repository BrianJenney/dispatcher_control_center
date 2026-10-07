"use client";

import type { z } from "zod";
import { tripsQueryKey } from "@/components/queries";
import { useOptimisticAction } from "@/components/use-optimistic-action";
import type { ActionResult } from "@/domain/result";
import { patchTrips, type TripPatch, type TripRow } from "@/domain/trip-row";
import { statusLabels, type moveTripInput } from "@/domain/trip-status";
import { moveTrip, reassignDriver } from "@/server/actions/trips";


type TripLists = { trips: TripRow[] };

function useTripMutation<V extends { reference: number }>(options: {
  send: (request: V) => Promise<ActionResult<unknown>>;
  patch: (request: V) => TripPatch;
  done: (request: V) => string;
}) {
  return useOptimisticAction<V, TripLists>({
    queryKey: tripsQueryKey,
    action: options.send,
    update: (data, request) => ({ ...data, trips: patchTrips(data.trips, options.patch(request)) }),
    done: options.done,
  });
}

type MoveRequest = z.input<typeof moveTripInput> & { reference: number; driver?: TripRow["driver"] };

export function useTripMove() {
  return useTripMutation({
    send: (request: MoveRequest) =>
      moveTrip({
        tripId: request.tripId,
        from: request.from,
        to: request.to,
        driverId: request.driverId,
        reason: request.reason,
      }),
    patch: (request) => ({
      id: request.tripId,
      status: request.to,
      ...(request.driver ? { driver: request.driver } : {}),
      ...(request.to === "cancelled" ? { cancelReason: request.reason ?? null } : {}),
    }),
    done: (request) => `Trip #${String(request.reference)} is now ${statusLabels[request.to].toLowerCase()}.`,
  });
}

type ReassignRequest = { tripId: string; reference: number; driver: { id: string; name: string } };

export function useTripReassign() {
  return useTripMutation({
    send: (request: ReassignRequest) => reassignDriver({ tripId: request.tripId, driverId: request.driver.id }),
    patch: (request) => ({ id: request.tripId, status: "assigned", driver: request.driver }),
    done: (request) => `Trip #${String(request.reference)} now goes to ${request.driver.name}.`,
  });
}
