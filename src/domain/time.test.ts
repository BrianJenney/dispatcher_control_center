import { describe, expect, it } from "vitest";
import { dayRange, isWithin, rangesOverlap, shiftDays, tripWindow, wallTimeOf, zonedWallTime } from "@/domain/time";

const iso = (range: { start: Date; end: Date }) => [range.start.toISOString(), range.end.toISOString()];

describe("dayRange", () => {
  it("finds today in New York during daylight time", () => {
    expect(iso(dayRange(new Date("2026-10-07T16:00:00Z"), "America/New_York"))).toEqual([
      "2026-10-07T04:00:00.000Z",
      "2026-10-08T04:00:00.000Z",
    ]);
  });

  it("uses the local date, not the UTC date, late in the evening", () => {
    expect(iso(dayRange(new Date("2026-10-08T02:30:00Z"), "America/New_York"))).toEqual([
      "2026-10-07T04:00:00.000Z",
      "2026-10-08T04:00:00.000Z",
    ]);
  });

  it("is 23 hours long when clocks spring forward", () => {
    expect(iso(dayRange(new Date("2026-03-08T12:00:00Z"), "America/Los_Angeles"))).toEqual([
      "2026-03-08T08:00:00.000Z",
      "2026-03-09T07:00:00.000Z",
    ]);
  });

  it("is 25 hours long when clocks fall back", () => {
    expect(iso(dayRange(new Date("2026-11-01T12:00:00Z"), "America/New_York"))).toEqual([
      "2026-11-01T04:00:00.000Z",
      "2026-11-02T05:00:00.000Z",
    ]);
  });

  it("finds midnight east of UTC on the day clocks spring forward", () => {
    expect(iso(dayRange(new Date("2026-09-27T00:00:00Z"), "Pacific/Auckland"))).toEqual([
      "2026-09-26T12:00:00.000Z",
      "2026-09-27T11:00:00.000Z",
    ]);
  });

  it("starts exactly at local midnight", () => {
    const range = dayRange(new Date("2026-10-07T04:00:00Z"), "America/New_York");
    expect(range.start.toISOString()).toBe("2026-10-07T04:00:00.000Z");
  });
});

describe("shiftDays", () => {
  it("steps back over a 23 hour day", () => {
    const dayAfter = dayRange(new Date("2026-03-09T12:00:00Z"), "America/Los_Angeles");
    expect(iso(shiftDays(dayAfter, -1, "America/Los_Angeles"))).toEqual([
      "2026-03-08T08:00:00.000Z",
      "2026-03-09T07:00:00.000Z",
    ]);
  });

  it("moves whole local days across a clock change", () => {
    const today = dayRange(new Date("2026-11-02T15:00:00Z"), "America/New_York");
    expect(iso(shiftDays(today, -1, "America/New_York"))).toEqual([
      "2026-11-01T04:00:00.000Z",
      "2026-11-02T05:00:00.000Z",
    ]);
    expect(iso(shiftDays(today, 1, "America/New_York"))).toEqual([
      "2026-11-03T05:00:00.000Z",
      "2026-11-04T05:00:00.000Z",
    ]);
  });
});

describe("ranges", () => {
  const range = { start: new Date("2026-10-07T10:00:00Z"), end: new Date("2026-10-07T11:00:00Z") };

  it("includes the start and excludes the end", () => {
    expect(isWithin(range.start, range)).toBe(true);
    expect(isWithin(range.end, range)).toBe(false);
    expect(isWithin(new Date("2026-10-07T09:59:59Z"), range)).toBe(false);
  });

  it("builds a trip window from pickup and duration", () => {
    expect(iso(tripWindow(range.start, 90))).toEqual(["2026-10-07T10:00:00.000Z", "2026-10-07T11:30:00.000Z"]);
  });

  it("treats touching windows as not overlapping", () => {
    expect(rangesOverlap(range, tripWindow(range.end, 30))).toBe(false);
    expect(rangesOverlap(range, tripWindow(new Date("2026-10-07T10:59:00Z"), 30))).toBe(true);
    expect(rangesOverlap(tripWindow(new Date("2026-10-07T09:30:00Z"), 30), range)).toBe(false);
    expect(rangesOverlap(tripWindow(new Date("2026-10-07T09:30:00Z"), 31), range)).toBe(true);
  });
});

describe("zonedWallTime", () => {
  it("reads a New York wall clock time in daylight time", () => {
    expect(zonedWallTime("2026-10-07", "15:30", "America/New_York").toISOString()).toBe("2026-10-07T19:30:00.000Z");
  });

  it("reads a New York wall clock time in standard time", () => {
    expect(zonedWallTime("2026-12-01", "09:05", "America/New_York").toISOString()).toBe("2026-12-01T14:05:00.000Z");
  });

  it("handles the morning after clocks spring forward", () => {
    expect(zonedWallTime("2026-03-08", "08:00", "America/Los_Angeles").toISOString()).toBe("2026-03-08T15:00:00.000Z");
  });

  it("handles a zone east of UTC across its clock change", () => {
    expect(zonedWallTime("2026-09-27", "00:30", "Pacific/Auckland").toISOString()).toBe("2026-09-26T12:30:00.000Z");
  });

  it("refuses text that is not a time", () => {
    expect(() => zonedWallTime("tomorrow", "noon", "America/New_York")).toThrow("Not a wall clock time");
  });
});

describe("wallTimeOf", () => {
  it("is the inverse of zonedWallTime", () => {
    const instant = zonedWallTime("2026-11-01", "01:30", "America/New_York");
    expect(wallTimeOf(instant, "America/New_York")).toEqual({ date: "2026-11-01", time: "01:30" });
  });

  it("pads single digits", () => {
    expect(wallTimeOf(new Date("2026-01-05T14:05:00Z"), "UTC")).toEqual({ date: "2026-01-05", time: "14:05" });
  });
});
