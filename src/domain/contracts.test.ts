import { describe, expect, it } from "vitest";
import { driverSuggestions, jobsSnapshot } from "@/domain/jobs";
import { driversSnapshot, fleetSnapshot } from "@/domain/people";
import { scheduleSnapshot } from "@/domain/schedule";
import { tripRow } from "@/domain/trip-row";

const id = "00000000-0000-4000-8000-000000000001";

const row = {
  id,
  reference: 1001,
  customerName: "Arden Ashdown",
  pickupAddress: "A",
  dropoffAddress: "B",
  pickupAt: "2026-10-07T15:00:00.000Z",
  durationMinutes: 60,
  passengers: 1,
  vehicleClass: "luxury_sedan",
  fareCents: 10_000,
  status: "assigned",
  driver: { id, name: "Ava" },
  cancelReason: null,
};

describe("what the client accepts from polling routes", () => {
  it("accepts a trip row and refuses a broken one", () => {
    expect(tripRow.parse(row)).toEqual(row);
    expect(tripRow.safeParse({ ...row, driver: { id } }).success).toBe(false);
    expect(tripRow.safeParse({ ...row, pickupAt: "tomorrow" }).success).toBe(false);
    expect(tripRow.safeParse({ ...row, pickupAt: "2026-10-07T15:00:00-04:00" }).success).toBe(true);
    expect(tripRow.safeParse({ ...row, id: undefined }).success).toBe(false);
  });

  it("checks each snapshot's shape", () => {
    expect(jobsSnapshot.safeParse({ trips: [row], hasMore: false }).success).toBe(true);
    expect(jobsSnapshot.safeParse({ trips: [row] }).success).toBe(false);
    const today = { start: row.pickupAt, end: row.pickupAt };
    expect(scheduleSnapshot.safeParse({ today, now: row.pickupAt, trips: [], drivers: [] }).success).toBe(true);
    expect(scheduleSnapshot.safeParse({ today, trips: [], drivers: [] }).success).toBe(false);
    expect(scheduleSnapshot.safeParse({ today: {}, now: row.pickupAt, trips: [], drivers: [] }).success).toBe(false);
    expect(driversSnapshot.safeParse({}).success).toBe(false);
    expect(fleetSnapshot.safeParse({}).success).toBe(false);
    expect(driverSuggestions.safeParse({ vehicleClass: "luxury_sedan", onDutyInClass: 1, suggestions: [{ id, name: "Ava" }] }).success).toBe(false);
  });

  it("checks driver and vehicle rows", () => {
    const driver = { id, name: "Ava", phone: "1", vehicleClass: "luxury_sedan", onDuty: true, photoVersion: null, tripsToday: 0, licenses: 0 };
    expect(driversSnapshot.parse({ drivers: [driver] }).drivers).toHaveLength(1);
    expect(driversSnapshot.safeParse({ drivers: [{ ...driver, id: "x" }] }).success).toBe(false);
    const vehicle = { id, model: "BMW", unitNumber: "DL-1", plate: "A", vehicleClass: "luxury_sedan", status: "ready", registrations: 0 };
    expect(fleetSnapshot.parse({ vehicles: [vehicle] }).vehicles).toHaveLength(1);
    expect(fleetSnapshot.safeParse({ vehicles: [{ ...vehicle, id: "x" }] }).success).toBe(false);
  });
});
