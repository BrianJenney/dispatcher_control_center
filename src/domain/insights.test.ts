import { describe, expect, it } from "vitest";
import { buildInsights, insightsWindow, lateMinutes, reasonLimit, soonMinutes } from "@/domain/insights";
import type { TripRow } from "@/domain/trip-row";

const zone = "America/New_York";
const now = new Date("2026-10-07T16:00:00Z");
const minute = 60_000;
const driverOne = { id: "11111111-1111-4111-8111-111111111111", name: "Adele Fairbanks", onDuty: true };
const driverTwo = { id: "22222222-2222-4222-8222-222222222222", name: "Bastian Okoro", onDuty: true };
const offDuty = { id: "33333333-3333-4333-8333-333333333333", name: "Camille Duarte", onDuty: false };

let counter = 0;

function trip(overrides: Partial<TripRow> & { minutesFromNow?: number }): TripRow {
  counter += 1;
  const { minutesFromNow, ...rest } = overrides;
  const pickupAt = new Date(now.getTime() + (minutesFromNow ?? 0) * minute).toISOString();
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    reference: 1000 + counter,
    customerName: `Guest ${String(counter)}`,
    pickupAddress: "A",
    dropoffAddress: "B",
    pickupAt,
    durationMinutes: 60,
    passengers: 2,
    vehicleClass: "luxury_sedan",
    fareCents: 10_000,
    status: "completed",
    driver: { id: driverOne.id, name: driverOne.name },
    cancelReason: null,
    ...rest,
  };
}

function build(trips: TripRow[], drivers = [driverOne, driverTwo, offDuty]) {
  return buildInsights({ trips, drivers, now, timeZone: zone });
}

describe("insightsWindow", () => {
  it("runs from the start of six days ago to the end of tomorrow", () => {
    const window = insightsWindow(now, zone);
    expect(window.start.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-10-09T04:00:00.000Z");
  });
});

describe("buildInsights days", () => {
  it("returns seven days ending today, oldest first", () => {
    const { days } = build([]);
    expect(days).toHaveLength(7);
    expect(days[0]?.start).toBe("2026-10-01T04:00:00.000Z");
    expect(days[6]?.start).toBe("2026-10-07T04:00:00.000Z");
  });

  it("counts completed, cancelled and open trips on the day they were picked up", () => {
    const { days } = build([
      trip({ status: "completed", minutesFromNow: -60 }),
      trip({ status: "completed", minutesFromNow: -120 }),
      trip({ status: "cancelled", minutesFromNow: -30, cancelReason: "Client called" }),
      trip({ status: "en_route", minutesFromNow: -10 }),
      trip({ status: "assigned", minutesFromNow: 60 }),
      trip({ status: "offer", driver: null, minutesFromNow: 90 }),
      trip({ status: "completed", minutesFromNow: -24 * 60 }),
    ]);
    expect(days[6]).toMatchObject({ completed: 2, cancelled: 1, open: 3 });
    expect(days[5]).toMatchObject({ completed: 1, cancelled: 0, open: 0 });
  });

  it("sums revenue from completed trips only", () => {
    const { days, weekRevenueCents } = build([
      trip({ fareCents: 12_500, minutesFromNow: -60 }),
      trip({ fareCents: 7_500, minutesFromNow: -90 }),
      trip({ status: "cancelled", fareCents: 99_900, minutesFromNow: -30, cancelReason: "Late" }),
      trip({ status: "en_route", fareCents: 88_800, minutesFromNow: -10 }),
      trip({ fareCents: 5_000, minutesFromNow: -2 * 24 * 60 }),
    ]);
    expect(days[6]?.revenueCents).toBe(20_000);
    expect(days[4]?.revenueCents).toBe(5_000);
    expect(weekRevenueCents).toBe(25_000);
  });

  it("leaves out trips older than the window", () => {
    const { weekTrips } = build([trip({ minutesFromNow: -8 * 24 * 60 }), trip({ minutesFromNow: -60 })]);
    expect(weekTrips).toBe(1);
  });

  it("keeps tomorrow out of the week totals", () => {
    const result = build([trip({ minutesFromNow: 20 * 60, status: "assigned" }), trip({ minutesFromNow: -60 })]);
    expect(result.weekTrips).toBe(1);
  });
});

describe("buildInsights week totals", () => {
  it("counts the week's trips, completions and cancellations", () => {
    const result = build([
      trip({ minutesFromNow: -60 }),
      trip({ minutesFromNow: -5 * 24 * 60 }),
      trip({ status: "cancelled", cancelReason: "Plans changed", minutesFromNow: -120 }),
      trip({ status: "assigned", minutesFromNow: 30 }),
    ]);
    expect(result).toMatchObject({ weekTrips: 4, weekCompleted: 2, weekCancelled: 1 });
  });
});

describe("buildInsights cancel reasons", () => {
  it("groups reasons ignoring case and spacing, most common first", () => {
    const { cancelReasons } = build([
      trip({ status: "cancelled", cancelReason: "Client called", minutesFromNow: -60 }),
      trip({ status: "cancelled", cancelReason: "  client called ", minutesFromNow: -70 }),
      trip({ status: "cancelled", cancelReason: "Flight cancelled", minutesFromNow: -80 }),
      trip({ status: "cancelled", cancelReason: "Client called", minutesFromNow: -90 }),
    ]);
    expect(cancelReasons).toEqual([
      { reason: "Client called", count: 3 },
      { reason: "Flight cancelled", count: 1 },
    ]);
  });

  it("breaks ties alphabetically and shows at most five", () => {
    const reasons = ["Echo", "Delta", "Charlie", "Bravo", "Alpha", "Foxtrot"];
    const { cancelReasons } = build(
      reasons.map((reason, index) => trip({ status: "cancelled", cancelReason: reason, minutesFromNow: -60 - index })),
    );
    expect(cancelReasons.map((entry) => entry.reason)).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
    expect(cancelReasons).toHaveLength(reasonLimit);
  });

  it("skips blank reasons and trips that are not cancelled", () => {
    const { cancelReasons } = build([
      trip({ status: "cancelled", cancelReason: "   ", minutesFromNow: -60 }),
      trip({ status: "cancelled", cancelReason: null, minutesFromNow: -70 }),
      trip({ status: "completed", cancelReason: "Stale text", minutesFromNow: -80 }),
    ]);
    expect(cancelReasons).toEqual([]);
  });
});

describe("buildInsights attention", () => {
  it("flags an offer due within the next two hours", () => {
    const { attention } = build([
      trip({ status: "offer", driver: null, minutesFromNow: soonMinutes, customerName: "Edge" }),
      trip({ status: "offer", driver: null, minutesFromNow: soonMinutes + 1, customerName: "Later" }),
    ]);
    expect(attention.map((item) => [item.kind, item.customerName])).toEqual([["needs-driver-soon", "Edge"]]);
  });

  it("flags an offer whose pickup time has passed", () => {
    const { attention } = build([trip({ status: "offer", driver: null, minutesFromNow: -1 })]);
    expect(attention.map((item) => item.kind)).toEqual(["missed-pickup"]);
  });

  it("flags an assigned trip that has not started a quarter hour after pickup", () => {
    const { attention } = build([
      trip({ status: "assigned", minutesFromNow: -lateMinutes - 1, customerName: "Late" }),
      trip({ status: "assigned", minutesFromNow: -lateMinutes, customerName: "OnTheEdge" }),
      trip({ status: "assigned", minutesFromNow: 10, customerName: "Upcoming" }),
    ]);
    expect(attention.map((item) => [item.kind, item.customerName])).toEqual([["late-to-start", "Late"]]);
  });

  it("never flags trips that are under way or finished", () => {
    const { attention } = build([
      trip({ status: "en_route", minutesFromNow: -120 }),
      trip({ status: "completed", minutesFromNow: -120 }),
      trip({ status: "cancelled", cancelReason: "x", minutesFromNow: -120 }),
    ]);
    expect(attention).toEqual([]);
  });

  it("lists the earliest pickup first and carries the details a dispatcher needs", () => {
    const later = trip({ status: "offer", driver: null, minutesFromNow: 90, customerName: "Later" });
    const earlier = trip({ status: "assigned", minutesFromNow: -45, customerName: "Earlier" });
    const { attention } = build([later, earlier]);
    expect(attention.map((item) => item.customerName)).toEqual(["Earlier", "Later"]);
    expect(attention[0]).toEqual({
      kind: "late-to-start",
      tripId: earlier.id,
      reference: earlier.reference,
      customerName: "Earlier",
      pickupAt: earlier.pickupAt,
    });
  });
});

describe("buildInsights driver load", () => {
  it("counts today's non-cancelled trips for on duty drivers, busiest first", () => {
    const { driverLoad } = build([
      trip({ driver: { id: driverTwo.id, name: driverTwo.name }, minutesFromNow: -60 }),
      trip({ driver: { id: driverTwo.id, name: driverTwo.name }, status: "assigned", minutesFromNow: 30 }),
      trip({ driver: { id: driverTwo.id, name: driverTwo.name }, status: "cancelled", cancelReason: "x", minutesFromNow: -30 }),
      trip({ minutesFromNow: -90 }),
      trip({ minutesFromNow: -24 * 60 }),
      trip({ driver: { id: offDuty.id, name: offDuty.name }, minutesFromNow: -45 }),
    ]);
    expect(driverLoad).toEqual([
      { driverId: driverTwo.id, name: driverTwo.name, trips: 2 },
      { driverId: driverOne.id, name: driverOne.name, trips: 1 },
    ]);
  });

  it("lists on duty drivers with no trips and breaks ties by name", () => {
    const { driverLoad } = build([]);
    expect(driverLoad.map((entry) => [entry.name, entry.trips])).toEqual([
      ["Adele Fairbanks", 0],
      ["Bastian Okoro", 0],
    ]);
  });
});
