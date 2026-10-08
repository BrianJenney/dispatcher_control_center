"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { drivers, trips, vehicles } from "@/db/schema";
import { classChangeProblem } from "@/domain/assignment";
import { vehicleStatuses } from "@/domain/fleet";
import { driverInput, updateDriverInput, updateVehicleInput, vehicleInput } from "@/domain/people";
import { DomainError, missingRecord } from "@/domain/result";
import { activeStatuses } from "@/domain/trip-status";
import { defineAction } from "@/server/action";

export const createDriver = defineAction(driverInput, async (input, { tx }) => {
  const [created] = await tx.insert(drivers).values({ ...input, onDuty: false }).returning({ id: drivers.id, name: drivers.name });
  if (!created) throw new Error("Creating the driver returned nothing.");
  return created;
});

export const updateDriver = defineAction(updateDriverInput, async ({ driverId, ...input }, { tx }) => {
  const [driver] = await tx.select({ name: drivers.name }).from(drivers).where(eq(drivers.id, driverId)).for("update");
  if (!driver) throw new DomainError(missingRecord.driver);
  const activeTrips = await tx
    .select({ vehicleClass: trips.vehicleClass })
    .from(trips)
    .where(and(eq(trips.driverId, driverId), inArray(trips.status, activeStatuses)));
  const problem = classChangeProblem(driver, input.vehicleClass, activeTrips.map((trip) => trip.vehicleClass));
  if (problem) throw new DomainError(problem);
  const [updated] = await tx.update(drivers).set(input).where(eq(drivers.id, driverId)).returning({ id: drivers.id, name: drivers.name });
  if (!updated) throw new DomainError(missingRecord.driver);
  return updated;
});

export const setDriverDuty = defineAction(
  z.object({ driverId: z.uuid(), onDuty: z.boolean() }),
  async (input, { tx }) => {
    const [updated] = await tx
      .update(drivers)
      .set({ onDuty: input.onDuty })
      .where(eq(drivers.id, input.driverId))
      .returning({ onDuty: drivers.onDuty });
    if (!updated) throw new DomainError(missingRecord.driver);
    return updated;
  },
);

export const createVehicle = defineAction(vehicleInput, async (input, { tx }) => {
  const [created] = await tx
    .insert(vehicles)
    .values(input)
    .returning({ id: vehicles.id, unitNumber: vehicles.unitNumber });
  if (!created) throw new Error("Creating the vehicle returned nothing.");
  return created;
});

export const updateVehicle = defineAction(updateVehicleInput, async ({ vehicleId, ...input }, { tx }) => {
  const [updated] = await tx
    .update(vehicles)
    .set(input)
    .where(eq(vehicles.id, vehicleId))
    .returning({ id: vehicles.id, unitNumber: vehicles.unitNumber });
  if (!updated) throw new DomainError(missingRecord.vehicle);
  return updated;
});

export const setVehicleStatus = defineAction(
  z.object({ vehicleId: z.uuid(), status: z.enum(vehicleStatuses) }),
  async (input, { tx }) => {
    const [updated] = await tx
      .update(vehicles)
      .set({ status: input.status })
      .where(eq(vehicles.id, input.vehicleId))
      .returning({ status: vehicles.status });
    if (!updated) throw new DomainError(missingRecord.vehicle);
    return updated;
  },
);
