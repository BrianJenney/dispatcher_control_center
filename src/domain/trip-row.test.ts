import { describe, expect, it } from "vitest";
import { byPickupTime, filterTrips, patchTrips, type TripRow } from "@/domain/trip-row";

function row(overrides: Partial<TripRow>): TripRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    reference: 1001,
    customerName: "Arden Ashdown",
    pickupAddress: "Harborview Hotel",
    dropoffAddress: "Regional Airport, Terminal A",
    pickupAt: "2026-10-07T14:00:00.000Z",
    durationMinutes: 60,
    passengers: 2,
    vehicleClass: "luxury_sedan",
    fareCents: 12_000,
    status: "offer",
    driver: null,
    cancelReason: null,
    ...overrides,
  };
}

const ava = { id: "00000000-0000-4000-8000-00000000000a", name: "Ava" };
const ben = { id: "00000000-0000-4000-8000-00000000000b", name: "Ben" };

describe("patchTrips", () => {
  it("changes only the matching trip", () => {
    const rows = [row({ id: "a" }), row({ id: "b" })];
    const patched = patchTrips(rows, { id: "b", status: "assigned", driver: ava });
    expect(patched[0]).toBe(rows[0]);
    expect(patched[1]).toMatchObject({ id: "b", status: "assigned", driver: ava });
  });
});

describe("filterTrips", () => {
  const rows = [
    row({ id: "1", status: "assigned", driver: ava }),
    row({ id: "2", status: "assigned", driver: ben }),
    row({ id: "3", status: "offer" }),
    row({ id: "4", status: "completed", driver: ava }),
  ];
  const ids = (filtered: TripRow[]) => filtered.map((trip) => trip.id);

  it("keeps everything without filters", () => {
    expect(ids(filterTrips(rows, { status: null, driverId: null }))).toEqual(["1", "2", "3", "4"]);
  });

  it("filters by status", () => {
    expect(ids(filterTrips(rows, { status: "assigned", driverId: null }))).toEqual(["1", "2"]);
  });

  it("filters by driver", () => {
    expect(ids(filterTrips(rows, { status: null, driverId: ava.id }))).toEqual(["1", "4"]);
  });

  it("combines both", () => {
    expect(ids(filterTrips(rows, { status: "completed", driverId: ava.id }))).toEqual(["4"]);
  });
});

describe("byPickupTime", () => {
  it("orders by pickup, then reference", () => {
    const rows = [
      row({ id: "late", pickupAt: "2026-10-07T18:00:00.000Z", reference: 1 }),
      row({ id: "second", pickupAt: "2026-10-07T09:00:00.000Z", reference: 7 }),
      row({ id: "first", pickupAt: "2026-10-07T09:00:00.000Z", reference: 3 }),
    ];
    expect([...rows].sort(byPickupTime).map((trip) => trip.id)).toEqual(["first", "second", "late"]);
  });
});
