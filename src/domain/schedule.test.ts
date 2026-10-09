import { describe, expect, it } from "vitest";
import {
  axisPosition,
  minimumAxisHours,
  packLanes,
  placeOnAxis,
  timelineAxis,
  timelineRows,
  upcomingIndex,
  type TimelineAxis,
} from "@/domain/schedule";
import type { TripRow } from "@/domain/trip-row";

const today = { start: "2026-10-09T04:00:00.000Z", end: "2026-10-10T04:00:00.000Z" };

const ava = { id: "00000000-0000-4000-8000-00000000000a", name: "Ava Lindqvist" };
const ben = { id: "00000000-0000-4000-8000-00000000000b", name: "Ben Okoro" };
const otherBen = { id: "00000000-0000-4000-8000-000000000001", name: "Ben Okoro" };

function trip(id: string, pickupAt: string, overrides: Partial<TripRow> = {}): TripRow {
  return {
    id,
    reference: 1000,
    customerName: "Arden Ashdown",
    pickupAddress: "Harborview Hotel",
    dropoffAddress: "Regional Airport, Terminal A",
    pickupAt,
    durationMinutes: 60,
    passengers: 1,
    vehicleClass: "luxury_sedan",
    fareCents: 9_500,
    status: "assigned",
    driver: ava,
    cancelReason: null,
    ...overrides,
  };
}

describe("timelineAxis", () => {
  it("runs from the hour before the first pickup to the hour after the last drop off", () => {
    const axis = timelineAxis(
      today,
      [trip("a", "2026-10-09T11:15:00.000Z", { durationMinutes: 45 }), trip("b", "2026-10-09T17:30:00.000Z", { durationMinutes: 75 })],
      "2026-10-09T12:00:00.000Z",
    );
    expect(axis.start).toBe("2026-10-09T11:00:00.000Z");
    expect(axis.end).toBe("2026-10-09T19:00:00.000Z");
    expect(axis.hours).toHaveLength(8);
    expect(axis.hours[0]).toBe(axis.start);
    expect(axis.hours.at(-1)).toBe("2026-10-09T18:00:00.000Z");
  });

  it("stretches to keep the current time on the axis", () => {
    const trips = [trip("a", "2026-10-09T13:00:00.000Z")];
    expect(timelineAxis(today, trips, "2026-10-09T08:20:00.000Z").start).toBe("2026-10-09T08:00:00.000Z");
    expect(timelineAxis(today, trips, "2026-10-09T21:40:00.000Z").end).toBe("2026-10-09T22:00:00.000Z");
  });

  it("counts hours from midnight in the app's time zone, not UTC", () => {
    const halfHourZoneDay = { start: "2026-10-08T18:30:00.000Z", end: "2026-10-09T18:30:00.000Z" };
    const axis = timelineAxis(halfHourZoneDay, [trip("a", "2026-10-09T03:45:00.000Z")], "2026-10-09T03:00:00.000Z");
    expect(axis.start).toBe("2026-10-09T02:30:00.000Z");
  });

  it("shows at least a few hours so one short trip is not stretched across the page", () => {
    const axis = timelineAxis(today, [trip("a", "2026-10-09T13:00:00.000Z", { durationMinutes: 30 })], "2026-10-09T13:10:00.000Z");
    expect(Date.parse(axis.end) - Date.parse(axis.start)).toBe(minimumAxisHours * 3_600_000);
    expect(axis.start).toBe("2026-10-09T13:00:00.000Z");
  });

  it("never runs past the end of today, borrowing the missing hours from earlier instead", () => {
    const axis = timelineAxis(today, [trip("a", "2026-10-10T03:30:00.000Z", { durationMinutes: 90 })], "2026-10-10T03:35:00.000Z");
    expect(axis.end).toBe(today.end);
    expect(axis.start).toBe("2026-10-10T00:00:00.000Z");
  });

  it("still gives an axis around the current time on a day without trips", () => {
    const axis = timelineAxis(today, [], "2026-10-09T15:20:00.000Z");
    expect(axis.start).toBe("2026-10-09T15:00:00.000Z");
    expect(axis.hours).toHaveLength(minimumAxisHours);
  });
});

describe("placeOnAxis", () => {
  const axis: TimelineAxis = {
    start: "2026-10-09T12:00:00.000Z",
    end: "2026-10-09T20:00:00.000Z",
    hours: [],
  };

  it("places a trip by its pickup and sizes it by its duration", () => {
    expect(placeOnAxis(axis, trip("a", "2026-10-09T14:00:00.000Z", { durationMinutes: 120 }))).toEqual({
      left: 0.25,
      width: 0.25,
      runsOver: false,
    });
  });

  it("cuts a trip that runs past the end of the axis and says so", () => {
    expect(placeOnAxis(axis, trip("a", "2026-10-09T19:00:00.000Z", { durationMinutes: 120 }))).toEqual({
      left: 0.875,
      width: 0.125,
      runsOver: true,
    });
  });
});

describe("axisPosition", () => {
  const axis: TimelineAxis = { start: "2026-10-09T12:00:00.000Z", end: "2026-10-09T16:00:00.000Z", hours: [] };

  it("gives how far along the axis an instant falls", () => {
    expect(axisPosition(axis, "2026-10-09T13:00:00.000Z")).toBe(0.25);
    expect(axisPosition(axis, axis.start)).toBe(0);
    expect(axisPosition(axis, axis.end)).toBe(1);
  });

  it("is empty for an instant off the axis, so the now line hides", () => {
    expect(axisPosition(axis, "2026-10-09T11:59:00.000Z")).toBeNull();
    expect(axisPosition(axis, "2026-10-09T16:01:00.000Z")).toBeNull();
  });
});

describe("packLanes", () => {
  it("puts overlapping trips side by side and reuses a lane once it is free", () => {
    const packed = packLanes([
      trip("late", "2026-10-09T15:00:00.000Z"),
      trip("first", "2026-10-09T13:00:00.000Z", { durationMinutes: 90 }),
      trip("overlap", "2026-10-09T14:00:00.000Z"),
      trip("after-first", "2026-10-09T14:30:00.000Z"),
    ]);
    expect(packed.lanes).toBe(2);
    expect(packed.trips.map((item) => [item.trip.id, item.lane])).toEqual([
      ["first", 0],
      ["overlap", 1],
      ["after-first", 0],
      ["late", 1],
    ]);
  });

  it("lets a trip start the minute the previous one ends", () => {
    const packed = packLanes([trip("a", "2026-10-09T13:00:00.000Z"), trip("b", "2026-10-09T14:00:00.000Z")]);
    expect(packed.lanes).toBe(1);
  });

  it("always reserves one lane", () => {
    expect(packLanes([])).toEqual({ lanes: 1, trips: [] });
  });
});

describe("timelineRows", () => {
  it("gives each driver a row, trips needing a driver first, then drivers by name and id", () => {
    const rows = timelineRows([
      trip("ben", "2026-10-09T13:00:00.000Z", { driver: ben }),
      trip("ava", "2026-10-09T13:00:00.000Z"),
      trip("open", "2026-10-09T13:00:00.000Z", { status: "offer", driver: null }),
      trip("other-ben", "2026-10-09T13:00:00.000Z", { driver: otherBen }),
    ]);
    expect(rows.map((row) => row.driver?.id ?? null)).toEqual([null, ava.id, otherBen.id, ben.id]);
  });

  it("packs lanes inside each row so only that driver's overlaps add height", () => {
    const rows = timelineRows([
      trip("ava-1", "2026-10-09T13:00:00.000Z"),
      trip("ava-cancelled", "2026-10-09T13:30:00.000Z", { status: "cancelled" }),
      trip("ben-1", "2026-10-09T13:00:00.000Z", { driver: ben }),
    ]);
    expect(rows.map((row) => [row.driver?.name, row.lanes])).toEqual([
      [ava.name, 2],
      [ben.name, 1],
    ]);
  });
});

describe("upcomingIndex", () => {
  const sorted = [
    trip("a", "2026-10-09T12:00:00.000Z"),
    trip("b", "2026-10-09T13:00:00.000Z"),
    trip("c", "2026-10-09T14:00:00.000Z"),
  ];

  it("points at the first trip whose pickup is now or later", () => {
    expect(upcomingIndex(sorted, "2026-10-09T12:30:00.000Z")).toBe(1);
    expect(upcomingIndex(sorted, "2026-10-09T13:00:00.000Z")).toBe(1);
  });

  it("is the start before the first pickup and the end after the last", () => {
    expect(upcomingIndex(sorted, "2026-10-09T11:00:00.000Z")).toBe(0);
    expect(upcomingIndex(sorted, "2026-10-09T15:00:00.000Z")).toBe(3);
    expect(upcomingIndex([], "2026-10-09T15:00:00.000Z")).toBe(0);
  });
});
