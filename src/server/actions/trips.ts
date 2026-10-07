"use server";

import { eq } from "drizzle-orm";
import { trips } from "@/db/schema";
import { applyTransitions } from "@/db/trip-writes";
import { DomainError } from "@/domain/result";
import { moveTripInput, transitionTrip, tripMessages } from "@/domain/trip-status";
import { defineAction } from "@/server/action";

export const moveTrip = defineAction(moveTripInput, async (input, { tx, userId }) => {
  const [current] = await tx
    .select({ status: trips.status, driverId: trips.driverId, cancelReason: trips.cancelReason })
    .from(trips)
    .where(eq(trips.id, input.tripId))
    .for("update");
  if (!current) throw new DomainError("That trip no longer exists.");
  if (current.status !== input.from) throw new DomainError(tripMessages.changedElsewhere);
  const moved = transitionTrip(current, {
    to: input.to,
    actorId: userId,
    driverId: input.driverId,
    reason: input.reason,
  });
  await applyTransitions(tx, [{ tripId: input.tripId, ...moved }]);
  return { status: moved.trip.status };
});
