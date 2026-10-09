import { describe, expect, it } from "vitest";
import { byPickupTime, patchTrips, type TripRow } from "@/domain/trip-row";

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

describe("patchTrips", () => {
  it("changes only the matching trip", () => {
    const rows = [row({ id: "a" }), row({ id: "b" })];
    const patched = patchTrips(rows, { id: "b", status: "assigned", driver: ava });
    expect(patched[0]).toBe(rows[0]);
    expect(patched[1]).toMatchObject({ id: "b", status: "assigned", driver: ava });
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
