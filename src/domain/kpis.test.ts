import { describe, expect, it } from "vitest";
import { dashboardKpis, isOnTheRoad, isUpNext, revenueCents, tripsTodayByDriver, type TripFigures } from "@/domain/kpis";

const today = { start: new Date("2026-10-07T04:00:00Z"), end: new Date("2026-10-08T04:00:00Z") };
const during = new Date("2026-10-07T15:00:00Z");
const yesterday = new Date("2026-10-06T15:00:00Z");

function trip(overrides: Partial<TripFigures>): TripFigures {
  return { status: "completed", fareCents: 10_000, pickupAt: during, driverId: "d1", ...overrides };
}

describe("revenueCents", () => {
  it("counts completed trips only", () => {
    const trips = [
      trip({ fareCents: 12_550 }),
      trip({ status: "en_route", fareCents: 99_999 }),
      trip({ status: "cancelled", fareCents: 99_999 }),
      trip({ status: "offer", fareCents: 99_999 }),
      trip({ status: "assigned", fareCents: 99_999 }),
      trip({ fareCents: 7_450 }),
    ];
    expect(revenueCents(trips)).toBe(20_000);
  });

  it("is zero with no trips", () => {
    expect(revenueCents([])).toBe(0);
  });
});

describe("tripsTodayByDriver", () => {
  it("counts each driver's non-cancelled trips picked up today", () => {
    const counts = tripsTodayByDriver(
      [
        trip({ driverId: "d1" }),
        trip({ driverId: "d1", status: "assigned" }),
        trip({ driverId: "d1", status: "cancelled" }),
        trip({ driverId: "d1", pickupAt: yesterday }),
        trip({ driverId: "d2", pickupAt: today.start }),
        trip({ driverId: "d3", pickupAt: today.end }),
        trip({ driverId: null, status: "offer" }),
      ],
      today,
    );
    expect(Object.fromEntries(counts)).toEqual({ d1: 2, d2: 1 });
  });
});

describe("active jobs", () => {
  it("counts assigned trips only when they are picked up today", () => {
    expect(isUpNext(trip({ status: "assigned" }), today)).toBe(true);
    expect(isUpNext(trip({ status: "assigned", pickupAt: yesterday }), today)).toBe(false);
    expect(isUpNext(trip({ status: "assigned", pickupAt: today.end }), today)).toBe(false);
    expect(isUpNext(trip({ status: "offer" }), today)).toBe(false);
  });

  it("counts every trip on the road, whatever its pickup date", () => {
    expect(isOnTheRoad(trip({ status: "en_route" }))).toBe(true);
    expect(isOnTheRoad(trip({ status: "en_route", pickupAt: yesterday }))).toBe(true);
    expect(isOnTheRoad(trip({ status: "assigned" }))).toBe(false);
  });
});

describe("dashboardKpis", () => {
  it("computes the four tiles", () => {
    const kpis = dashboardKpis({
      trips: [
        trip({ status: "assigned" }),
        trip({ status: "assigned", pickupAt: yesterday }),
        trip({ status: "en_route", pickupAt: yesterday }),
        trip({ status: "offer", driverId: null }),
        trip({ fareCents: 15_000 }),
        trip({ fareCents: 5_000, pickupAt: yesterday }),
        trip({ status: "cancelled", fareCents: 4_000 }),
      ],
      drivers: [{ onDuty: true }, { onDuty: false }, { onDuty: true }],
      vehicles: [{ status: "ready" }, { status: "in_service" }, { status: "ready" }, { status: "ready" }],
      today,
    });
    expect(kpis).toEqual({
      activeJobs: 2,
      enRouteNow: 1,
      driversOnDuty: 2,
      driversTotal: 3,
      fleetReady: 3,
      fleetTotal: 4,
      revenueTodayCents: 15_000,
      completedToday: 1,
    });
  });
});
