import { describe, expect, it } from "vitest";
import { maxShown, nextShownCount, pageSize, shownCount } from "@/domain/paging";

describe("shownCount", () => {
  it("starts at one page", () => {
    expect(shownCount.parse(undefined)).toBe(pageSize);
  });

  it("clamps out of range values instead of starting over", () => {
    expect(shownCount.parse("225")).toBe(maxShown);
    expect(shownCount.parse("9999")).toBe(maxShown);
    expect(shownCount.parse("3")).toBe(pageSize);
    expect(shownCount.parse("-50")).toBe(pageSize);
  });

  it("keeps sensible values and rounds fractions", () => {
    expect(shownCount.parse("50")).toBe(50);
    expect(shownCount.parse("60.6")).toBe(61);
  });

  it("falls back to one page for anything that is not a number", () => {
    expect(shownCount.parse("abc")).toBe(pageSize);
  });
});

describe("nextShownCount", () => {
  it("adds a page at a time", () => {
    expect(nextShownCount(pageSize)).toBe(pageSize * 2);
  });

  it("stops at the maximum", () => {
    expect(nextShownCount(maxShown - 10)).toBe(maxShown);
    expect(nextShownCount(maxShown)).toBeNull();
  });
});
