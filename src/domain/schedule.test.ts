import { describe, expect, it } from "vitest";
import { groupByHour } from "@/domain/schedule";
import type { TripRow } from "@/domain/trip-row";

const trip = (id: string, pickupAt: string): TripRow => ({
  id,
  reference: 1,
  customerName: "Test",
  pickupAddress: "A",
  dropoffAddress: "B",
  pickupAt,
  durationMinutes: 60,
  passengers: 1,
  vehicleClass: "luxury_sedan",
  fareCents: 100,
  status: "offer",
  driver: null,
  cancelReason: null,
});

describe("groupByHour", () => {
  it("groups consecutive trips that share an hour, keeping their order", () => {
    const hourOf = (iso: string) => iso.slice(11, 13);
    const groups = groupByHour(
      [trip("a", "2026-10-07T09:00:00Z"), trip("b", "2026-10-07T09:30:00Z"), trip("c", "2026-10-07T11:15:00Z")],
      hourOf,
    );
    expect(groups.map((group) => [group.hour, group.trips.map((item) => item.id)])).toEqual([
      ["09", ["a", "b"]],
      ["11", ["c"]],
    ]);
  });

  it("returns no groups for no trips", () => {
    expect(groupByHour([], () => "x")).toEqual([]);
  });
});
