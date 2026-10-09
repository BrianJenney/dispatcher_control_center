import { describe, expect, it } from "vitest";
import { dashboardLists, dashboardSnapshot, isPickedUpToday, summarizeDashboard, type DashboardSnapshot } from "@/domain/dashboard";
import type { TripRow } from "@/domain/trip-row";

const today = { start: "2026-10-07T04:00:00.000Z", end: "2026-10-08T04:00:00.000Z" };
const yesterday = "2026-10-06T15:00:00.000Z";

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
      activeJobs: 2,
      needsDriver: 1,
      enRouteNow: 1,
      driversOnDuty: 1,
      driversTotal: 2,
      fleetReady: 2,
      fleetTotal: 3,
      revenueTodayCents: 12_500,
      completedToday: 1,
    });
  });

  it("counts today's assigned trips and every trip on the road as active", () => {
    const kpis = summarizeDashboard({
      ...snapshot,
      trips: [
        trip({ status: "assigned" }),
        trip({ status: "assigned", pickupAt: yesterday }),
        trip({ status: "en_route", pickupAt: yesterday }),
        trip({ status: "en_route" }),
      ],
    });
    expect(kpis.activeJobs).toBe(3);
    expect(kpis.enRouteNow).toBe(2);
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

describe("dashboardLists", () => {
  const mixedDays: DashboardSnapshot = {
    ...snapshot,
    trips: [
      trip({ id: "00000000-0000-4000-8000-000000000011", status: "offer", driver: null, pickupAt: "2026-10-07T18:00:00.000Z" }),
      trip({ id: "00000000-0000-4000-8000-000000000012", status: "offer", driver: null, pickupAt: "2026-10-07T09:00:00.000Z" }),
      trip({ id: "00000000-0000-4000-8000-000000000013", status: "offer", driver: null, pickupAt: yesterday }),
      trip({ id: "00000000-0000-4000-8000-000000000021", status: "en_route" }),
      trip({ id: "00000000-0000-4000-8000-000000000022", status: "en_route", pickupAt: yesterday }),
      trip({ id: "00000000-0000-4000-8000-000000000031", status: "assigned" }),
      trip({ id: "00000000-0000-4000-8000-000000000032", status: "assigned", pickupAt: yesterday }),
      trip({ id: "00000000-0000-4000-8000-000000000041" }),
    ],
  };
  const lists = dashboardLists(mixedDays);
  const ids =(trips: TripRow[]) => trips.map((trip) => trip.id.slice(-2));

  it("lists only today's offers, in pickup order, as needing a driver", () => {
    expect(ids(lists.needsDriver)).toEqual(["12", "11"]);
  });

  it("lists every trip on the road, whatever its pickup date", () => {
    expect(ids(lists.onTheRoad)).toEqual(["22", "21"]);
  });

  it("lists only today's assigned trips as up next", () => {
    expect(ids(lists.upNext)).toEqual(["31"]);
  });

  it("agrees with the active jobs tile", () => {
    const kpis = summarizeDashboard(mixedDays);
    expect(kpis.activeJobs).toBe(lists.needsDriver.length + lists.onTheRoad.length + lists.upNext.length);
    expect(kpis.needsDriver).toBe(lists.needsDriver.length);
    expect(kpis.enRouteNow).toBe(lists.onTheRoad.length);
  });
});

describe("isPickedUpToday", () => {
  it("marks trips from another day so their cards can show the date", () => {
    expect(isPickedUpToday(trip({}), today)).toBe(true);
    expect(isPickedUpToday(trip({ pickupAt: yesterday }), today)).toBe(false);
    expect(isPickedUpToday(trip({ pickupAt: today.end }), today)).toBe(false);
  });
});
