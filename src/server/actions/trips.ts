"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Transaction } from "@/db/client";
import { drivers, trips } from "@/db/schema";
import { applyTransitions, insertOffers, updateTripDetails } from "@/db/trip-writes";
import { assignmentProblem, isEditable, reassignTrip, withArticle } from "@/domain/assignment";
import { vehicleClassLabels } from "@/domain/fleet";
import { DomainError, missingRecord } from "@/domain/result";
import type { TripDetails } from "@/domain/trip-edits";
import { dollarsToCents, tripInput, updateTripInput, type TripInput } from "@/domain/trip-form";
import { zonedWallTime } from "@/domain/time";
import { moveTripInput, transitionTrip, tripMessages } from "@/domain/trip-status";
import { env } from "@/env";
import { defineAction } from "@/server/action";

function tripDetails(input: TripInput): TripDetails {
  return {
    customerName: input.customerName,
    pickupAddress: input.pickupAddress,
    dropoffAddress: input.dropoffAddress,
    pickupAt: zonedWallTime(input.pickupDate, input.pickupTime, env.APP_TIMEZONE),
    durationMinutes: input.durationMinutes,
    passengers: input.passengers,
    vehicleClass: input.vehicleClass,
    fareCents: dollarsToCents(input.fare),
  };
}

async function lockedTrip(tx: Transaction, tripId: string) {
  const [trip] = await tx
    .select({
      status: trips.status,
      driverId: trips.driverId,
      cancelReason: trips.cancelReason,
      vehicleClass: trips.vehicleClass,
      reference: trips.reference,
    })
    .from(trips)
    .where(eq(trips.id, tripId))
    .for("update");
  if (!trip) throw new DomainError(missingRecord.trip);
  return trip;
}

async function driverFor(tx: Transaction, driverId: string) {
  const [driver] = await tx
    .select({ id: drivers.id, name: drivers.name, onDuty: drivers.onDuty, vehicleClass: drivers.vehicleClass })
    .from(drivers)
    .where(eq(drivers.id, driverId));
  if (!driver) throw new DomainError(missingRecord.driver);
  return driver;
}

async function assignableDriver(tx: Transaction, trip: { vehicleClass: TripInput["vehicleClass"] }, driverId: string) {
  const driver = await driverFor(tx, driverId);
  const problem = assignmentProblem(trip, driver);
  if (problem) throw new DomainError(problem);
  return driver;
}

export const createTrip = defineAction(tripInput, async (input, { tx, userId }) => {
  const [created] = await insertOffers(tx, userId, [{ id: crypto.randomUUID(), ...tripDetails(input) }]);
  if (!created) throw new Error("Creating the trip returned nothing.");
  return created;
});

export const updateTrip = defineAction(updateTripInput, async ({ tripId, ...input }, { tx, userId }) => {
  const trip = await lockedTrip(tx, tripId);
  if (!isEditable(trip.status)) {
    throw new DomainError("This trip is already under way or finished, so it can no longer be edited.");
  }
  if (trip.driverId) {
    const driver = await driverFor(tx, trip.driverId);
    if (driver.vehicleClass !== input.vehicleClass) {
      throw new DomainError(
        `${driver.name} drives ${withArticle(vehicleClassLabels[driver.vehicleClass])}. Reassign the trip before changing its class.`,
      );
    }
  }
  await updateTripDetails(tx, userId, tripId, tripDetails(input));
  return { id: tripId, reference: trip.reference, customerName: input.customerName };
});

export const moveTrip = defineAction(moveTripInput, async (input, { tx, userId }) => {
  const trip = await lockedTrip(tx, input.tripId);
  if (trip.status !== input.from) throw new DomainError(tripMessages.changedElsewhere);
  if (input.to === "assigned" && input.driverId) await assignableDriver(tx, trip, input.driverId);
  const moved = transitionTrip(trip, {
    to: input.to,
    actorId: userId,
    driverId: input.driverId,
    reason: input.reason,
  });
  await applyTransitions(tx, [{ tripId: input.tripId, ...moved }]);
  return { status: moved.trip.status };
});

export const reassignDriver = defineAction(
  z.object({ tripId: z.uuid(), driverId: z.uuid() }),
  async (input, { tx, userId }) => {
    const trip = await lockedTrip(tx, input.tripId);
    await assignableDriver(tx, trip, input.driverId);
    const moved = reassignTrip(trip, { driverId: input.driverId, actorId: userId });
    await applyTransitions(tx, [{ tripId: input.tripId, ...moved }]);
    return { status: moved.trip.status };
  },
);
