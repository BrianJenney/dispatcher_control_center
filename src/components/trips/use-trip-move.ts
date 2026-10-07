"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod";
import { unreachableMessage } from "@/components/form";
import { patchTrips, type TripPatch, type TripRow } from "@/domain/trip-row";
import { statusLabels, type moveTripInput } from "@/domain/trip-status";
import { moveTrip } from "@/server/actions/trips";

export const tripsQueryKey = ["trips"] as const;

type TripLists = { trips: TripRow[] };
type MoveRequest = z.input<typeof moveTripInput> & { reference: number; driver?: TripRow["driver"] };

export function useTripMove() {
  const queryClient = useQueryClient();

  function restore(previous: [readonly unknown[], TripLists | undefined][] | undefined) {
    for (const [key, data] of previous ?? []) queryClient.setQueryData(key, data);
  }

  return useMutation({
    mutationFn: (request: MoveRequest) =>
      moveTrip({
        tripId: request.tripId,
        from: request.from,
        to: request.to,
        driverId: request.driverId,
        reason: request.reason,
      }),
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: tripsQueryKey });
      const previous = queryClient.getQueriesData<TripLists>({ queryKey: tripsQueryKey });
      const patch: TripPatch = {
        id: request.tripId,
        status: request.to,
        ...(request.driver ? { driver: request.driver } : {}),
        ...(request.to === "cancelled" ? { cancelReason: request.reason ?? null } : {}),
      };
      queryClient.setQueriesData<TripLists>({ queryKey: tripsQueryKey }, (data) =>
        data ? { ...data, trips: patchTrips(data.trips, patch) } : data,
      );
      return { previous };
    },
    onSuccess: (result, request, context) => {
      if (!result.ok) {
        restore(context.previous);
        toast.error(result.message);
        return;
      }
      toast.success(`Trip #${String(request.reference)} is now ${statusLabels[request.to].toLowerCase()}.`);
    },
    onError: (_error, _request, context) => {
      restore(context?.previous);
      toast.error(unreachableMessage);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: tripsQueryKey }),
  });
}
