import { describe, expect, it } from "vitest";
import { jobsFilter, jobsSearch, tripReferenceIn } from "@/domain/jobs";
import { maxShown, pageSize } from "@/domain/paging";

describe("jobsFilter", () => {
  it("falls back to sensible defaults for anything odd in the URL", () => {
    expect(jobsFilter.parse({ status: "flying", show: "lots" })).toEqual({ q: "", status: null, show: 25 });
    expect(jobsFilter.parse({})).toEqual({ q: "", status: null, show: 25 });
  });

  it("clamps the page length into range instead of resetting it", () => {
    expect(jobsFilter.parse({ show: "225" }).show).toBe(maxShown);
    expect(jobsFilter.parse({ show: "9999" }).show).toBe(maxShown);
    expect(jobsFilter.parse({ show: "3" }).show).toBe(pageSize);
    expect(jobsFilter.parse({ show: "-50" }).show).toBe(pageSize);
  });

  it("keeps an in-range count and rounds fractions", () => {
    expect(jobsFilter.parse({ show: "26" }).show).toBe(26);
    expect(jobsFilter.parse({ show: "200" }).show).toBe(200);
    expect(jobsFilter.parse({ show: "60.6" }).show).toBe(61);
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

describe("tripReferenceIn", () => {
  it("reads a trip number typed with or without the hash", () => {
    expect(tripReferenceIn("1234")).toBe(1234);
    expect(tripReferenceIn("#1234")).toBe(1234);
    expect(tripReferenceIn(" # 1234 ")).toBe(1234);
    expect(tripReferenceIn("#0042")).toBe(42);
  });

  it("leaves names and mixed text to the customer search", () => {
    expect(tripReferenceIn("")).toBeNull();
    expect(tripReferenceIn("Ashdown")).toBeNull();
    expect(tripReferenceIn("#")).toBeNull();
    expect(tripReferenceIn("##12")).toBeNull();
    expect(tripReferenceIn("12a")).toBeNull();
    expect(tripReferenceIn("a12")).toBeNull();
    expect(tripReferenceIn("1 234")).toBeNull();
    expect(tripReferenceIn("-12")).toBeNull();
    expect(tripReferenceIn("12.5")).toBeNull();
  });

  it("ignores numbers no trip can have", () => {
    expect(tripReferenceIn("0")).toBeNull();
    expect(tripReferenceIn("1")).toBe(1);
    expect(tripReferenceIn("2147483647")).toBe(2_147_483_647);
    expect(tripReferenceIn("2147483648")).toBeNull();
    expect(tripReferenceIn("99999999999999999999")).toBeNull();
  });
});
