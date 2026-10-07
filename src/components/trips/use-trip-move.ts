"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";
import { unreachableMessage } from "@/components/form";
import type { ActionResult } from "@/domain/result";
import { patchTrips, type TripPatch, type TripRow } from "@/domain/trip-row";
import { statusLabels, type moveTripInput } from "@/domain/trip-status";
import { moveTrip, reassignDriver } from "@/server/actions/trips";

export const tripsQueryKey = ["trips"] as const;

type TripLists = { trips: TripRow[] };
type Snapshot = [readonly unknown[], TripLists | undefined][];

function useOptimisticTrips() {
  const queryClient = useQueryClient();
  return {
    apply: async (patch: TripPatch): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: tripsQueryKey });
      const previous = queryClient.getQueriesData<TripLists>({ queryKey: tripsQueryKey });
      queryClient.setQueriesData<TripLists>({ queryKey: tripsQueryKey }, (data) =>
        data ? { ...data, trips: patchTrips(data.trips, patch) } : data,
      );
      return previous;
    },
    restore: (previous: Snapshot | undefined) => {
      for (const [key, data] of previous ?? []) queryClient.setQueryData(key, data);
    },
    settle: () => queryClient.invalidateQueries({ queryKey: tripsQueryKey }),
  };
}

function useTripMutation<V extends { reference: number }>(options: {
  send: (request: V) => Promise<ActionResult<unknown>>;
  patch: (request: V) => TripPatch;
  done: (request: V) => string;
}) {
  const trips = useOptimisticTrips();
  return useMutation({
    mutationFn: options.send,
    onMutate: async (request) => ({ previous: await trips.apply(options.patch(request)) }),
    onSuccess: (result, request, context) => {
      if (!result.ok) {
        trips.restore(context.previous);
        toast.error(result.message);
        return;
      }
      toast.success(options.done(request));
    },
    onError: (_error, _request, context) => {
      trips.restore(context?.previous);
      toast.error(unreachableMessage);
    },
    onSettled: trips.settle,
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
