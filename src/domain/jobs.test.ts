import { describe, expect, it } from "vitest";
import { jobsFilter, jobsSearch } from "@/domain/jobs";

describe("jobsFilter", () => {
  it("falls back to sensible defaults for anything odd in the URL", () => {
    expect(jobsFilter.parse({ status: "flying", show: "9999" })).toEqual({ q: "", status: null, show: 25 });
  });

  it("keeps valid values", () => {
    expect(jobsFilter.parse({ q: " Ashdown ", status: "offer", show: "50" })).toEqual({ q: "Ashdown", status: "offer", show: 50 });
  });
});

describe("jobsSearch", () => {
  it("writes only what differs from the defaults", () => {
    expect(jobsSearch({ q: "", status: null, show: 25 })).toBe("");
    expect(jobsSearch({ q: "Ash down", status: "assigned", show: 50 })).toBe("q=Ash+down&status=assigned&show=50");
  });

  it("round trips through the URL", () => {
    const filter = { q: "Ashdown", status: "en_route" as const, show: 75 };
    expect(jobsFilter.parse(Object.fromEntries(new URLSearchParams(jobsSearch(filter))))).toEqual(filter);
  });
});
