import { describe, expect, it } from "vitest";
import { activityFilter, activityPageSize, describeActivity } from "@/domain/activity";

describe("describeActivity", () => {
  it.each([
    [null, "offer", null, "booked the trip"],
    ["offer", "assigned", null, "assigned a driver to the trip"],
    ["assigned", "assigned", null, "changed the driver on the trip"],
    ["assigned", "en_route", null, "started the trip"],
    ["en_route", "completed", null, "completed the trip"],
    ["offer", "cancelled", null, "cancelled the trip"],
    ["assigned", "cancelled", "Client called", "cancelled the trip: Client called"],
  ] as const)("describes %s to %s", (fromStatus, toStatus, reason, expected) => {
    expect(describeActivity({ fromStatus, toStatus, reason })).toBe(expected);
  });

  it("ignores a reason on moves that are not cancellations", () => {
    expect(describeActivity({ fromStatus: "assigned", toStatus: "en_route", reason: "Stale" })).toBe("started the trip");
  });
});

describe("activityFilter", () => {
  it("defaults to the first page", () => {
    expect(activityFilter.parse({}).show).toBe(activityPageSize);
  });

  it("keeps sensible sizes and falls back on nonsense", () => {
    expect(activityFilter.parse({ show: "50" }).show).toBe(50);
    expect(activityFilter.parse({ show: "5" }).show).toBe(activityPageSize);
    expect(activityFilter.parse({ show: "9999" }).show).toBe(activityPageSize);
    expect(activityFilter.parse({ show: "abc" }).show).toBe(activityPageSize);
  });
});
