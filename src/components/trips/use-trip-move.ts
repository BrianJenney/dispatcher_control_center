"use client";

import type { z } from "zod";
import { tripsQueryKey } from "@/components/queries";
import { keepFocusNearTrip } from "@/components/trips/trip-focus";
import { useOptimisticAction } from "@/components/use-optimistic-action";
import type { ActivitySnapshot } from "@/domain/activity";
import type { DashboardSnapshot } from "@/domain/dashboard";
import type { InsightsSnapshot } from "@/domain/insights";
import type { JobsSnapshot } from "@/domain/jobs";
import type { ActionResult } from "@/domain/result";
import type { ScheduleSnapshot } from "@/domain/schedule";
import type { TripDetail } from "@/domain/trip-detail";
import { patchTrip, patchTrips, type TripPatch, type TripRow } from "@/domain/trip-row";
import { statusLabels, type moveTripInput } from "@/domain/trip-status";
import { moveTrip, reassignDriver } from "@/server/actions/trips";

type TripsData = DashboardSnapshot | ScheduleSnapshot | JobsSnapshot | InsightsSnapshot | ActivitySnapshot | TripDetail;

function useTripMutation<V extends { tripId: string; reference: number }>(options: {
  send: (request: V) => Promise<ActionResult<unknown>>;
  patch: (request: V) => TripPatch;
  done: (request: V) => string;
}) {
  return useOptimisticAction<V, TripsData>({
    queryKey: tripsQueryKey,
    action: options.send,
    update: (data, request) => {
      if ("trips" in data) return { ...data, trips: patchTrips(data.trips, options.patch(request)) };
      if ("trip" in data) return { ...data, trip: patchTrip(data.trip, options.patch(request)) };
      return data;
    },
    done: options.done,
    settled: (request) => {
      keepFocusNearTrip(request.tripId);
    },
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
