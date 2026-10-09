import { describe, expect, it } from "vitest";
import { matchDrivers, type DriverCandidate, type OpenTrip } from "@/domain/matching";

const at = (time: string) => new Date(`2026-10-07T${time}:00Z`);

const trip: OpenTrip = { tripId: "trip-open", vehicleClass: "luxury_sedan", pickupAt: at("14:00"), durationMinutes: 60, driverId: null };

function driver(overrides: Partial<DriverCandidate> & Pick<DriverCandidate, "id" | "name">): DriverCandidate {
  return { onDuty: true, vehicleClass: "luxury_sedan", tripsToday: 0, activeTrips: [], ...overrides };
}

const ids = (drivers: DriverCandidate[]) => drivers.map((candidate) => candidate.id);

describe("matchDrivers", () => {
  it("leaves out drivers who are off duty", () => {
    const result = matchDrivers(trip, [driver({ id: "a", name: "Ava", onDuty: false }), driver({ id: "b", name: "Ben" })]);
    expect(ids(result)).toEqual(["b"]);
  });

  it("leaves out drivers in another vehicle class", () => {
    const result = matchDrivers(trip, [
      driver({ id: "a", name: "Ava", vehicleClass: "executive_van" }),
      driver({ id: "b", name: "Ben" }),
    ]);
    expect(ids(result)).toEqual(["b"]);
  });

  it("leaves out drivers holding an overlapping active trip", () => {
    const result = matchDrivers(trip, [
      driver({ id: "a", name: "Ava", activeTrips: [{ tripId: "t1", pickupAt: at("14:30"), durationMinutes: 60 }] }),
      driver({ id: "b", name: "Ben", activeTrips: [{ tripId: "t2", pickupAt: at("13:30"), durationMinutes: 31 }] }),
      driver({ id: "c", name: "Cy" }),
    ]);
    expect(ids(result)).toEqual(["c"]);
  });

  it("keeps drivers whose trips only touch the window edges", () => {
    const result = matchDrivers(trip, [
      driver({ id: "a", name: "Ava", activeTrips: [{ tripId: "t1", pickupAt: at("13:00"), durationMinutes: 60 }] }),
      driver({ id: "b", name: "Ben", activeTrips: [{ tripId: "t2", pickupAt: at("15:00"), durationMinutes: 60 }] }),
    ]);
    expect(ids(result)).toEqual(["a", "b"]);
  });

  it("offers three other drivers when reassigning, never the current one", () => {
    const held = [{ tripId: "trip-open", pickupAt: trip.pickupAt, durationMinutes: 60 }];
    const result = matchDrivers({ ...trip, driverId: "a" }, [
      driver({ id: "a", name: "Ava", activeTrips: held }),
      driver({ id: "b", name: "Ben", tripsToday: 2 }),
      driver({ id: "c", name: "Cal", tripsToday: 2 }),
      driver({ id: "d", name: "Dee", tripsToday: 2 }),
    ]);
    expect(ids(result)).toEqual(["b", "c", "d"]);
  });

  it("ranks fewest trips today first", () => {
    const result = matchDrivers(trip, [
      driver({ id: "a", name: "Ava", tripsToday: 3 }),
      driver({ id: "b", name: "Ben", tripsToday: 1 }),
      driver({ id: "c", name: "Cy", tripsToday: 2 }),
    ]);
    expect(ids(result)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties on name, then id", () => {
    const result = matchDrivers(trip, [
      driver({ id: "z", name: "Ben" }),
      driver({ id: "y", name: "Ava" }),
      driver({ id: "x", name: "Ben" }),
    ]);
    expect(ids(result)).toEqual(["y", "x", "z"]);
  });

  it("returns at most three", () => {
    const pool = ["a", "b", "c", "d", "e"].map((id) => driver({ id, name: id.toUpperCase() }));
    expect(ids(matchDrivers(trip, pool))).toEqual(["a", "b", "c"]);
  });

  it("is stable whatever order the drivers arrive in", () => {
    const pool = [
      driver({ id: "a", name: "Ava", tripsToday: 2 }),
      driver({ id: "b", name: "Ben", tripsToday: 1 }),
      driver({ id: "c", name: "Ben", tripsToday: 1 }),
      driver({ id: "d", name: "Cy", tripsToday: 0 }),
    ];
    expect(ids(matchDrivers(trip, [...pool].reverse()))).toEqual(ids(matchDrivers(trip, pool)));
    expect(ids(matchDrivers(trip, pool))).toEqual(["d", "b", "c"]);
  });

  it("returns nothing when nobody qualifies", () => {
    expect(matchDrivers(trip, [driver({ id: "a", name: "Ava", onDuty: false })])).toEqual([]);
  });
});
