import { describe, expect, it } from "vitest";
import { dashboardSnapshot, summarizeDashboard, type DashboardSnapshot } from "@/domain/dashboard";
import type { TripRow } from "@/domain/trip-row";

const today = { start: "2026-10-07T04:00:00.000Z", end: "2026-10-08T04:00:00.000Z" };

function trip(overrides: Partial<TripRow>): TripRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    reference: 1001,
    customerName: "Arden Ashdown",
    pickupAddress: "A",
    dropoffAddress: "B",
    pickupAt: "2026-10-07T15:00:00.000Z",
    durationMinutes: 60,
    passengers: 1,
    vehicleClass: "luxury_sedan",
    fareCents: 10_000,
    status: "completed",
    driver: { id: "00000000-0000-4000-8000-00000000000d", name: "Ava" },
    cancelReason: null,
    ...overrides,
  };
}

const snapshot: DashboardSnapshot = {
  today,
  trips: [
    trip({ fareCents: 12_500 }),
    trip({ status: "en_route", fareCents: 9_000 }),
    trip({ status: "offer", driver: null }),
    trip({ fareCents: 7_000, pickupAt: "2026-10-06T15:00:00.000Z" }),
  ],
  drivers: [{ onDuty: true }, { onDuty: false }],
  vehicles: [{ status: "ready" }, { status: "in_service" }, { status: "ready" }],
};

describe("summarizeDashboard", () => {
  it("turns the polled snapshot into the four tiles", () => {
    expect(summarizeDashboard(snapshot)).toEqual({
      activeJobs: 1,
      driversOnDuty: 1,
      driversTotal: 2,
      fleetReady: 2,
      fleetTotal: 3,
      revenueTodayCents: 12_500,
      completedToday: 1,
    });
  });

  it("is what the server sends, as the client reads it", () => {
    expect(dashboardSnapshot.parse(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  });

  it("refuses a snapshot missing its parts", () => {
    expect(dashboardSnapshot.safeParse({ ...snapshot, today: {} }).success).toBe(false);
    expect(dashboardSnapshot.safeParse({ ...snapshot, drivers: [{}] }).success).toBe(false);
    expect(dashboardSnapshot.safeParse({ ...snapshot, vehicles: [{}] }).success).toBe(false);
  });
});
