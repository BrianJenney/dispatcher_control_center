import { describe, expect, it } from "vitest";
import { formatCompactMoney, formatMoney } from "@/components/format";

describe("formatMoney", () => {
  it("shows whole dollars without cents and keeps cents when there are some", () => {
    expect(formatMoney(513000)).toBe("$5,130");
    expect(formatMoney(18550)).toBe("$185.50");
  });
});

describe("formatCompactMoney", () => {
  it.each([
    [0, "$0"],
    [18550, "$186"],
    [99900, "$999"],
    [513000, "$5.1K"],
    [1250000, "$13K"],
    [12345600, "$123K"],
    [123456700, "$1.2M"],
  ])("shows %i cents as %s", (cents, label) => {
    expect(formatCompactMoney(cents)).toBe(label);
  });

  it("never needs more than five characters below a billion dollars", () => {
    for (const cents of [99950, 999999, 9999900, 99960000, 99_999_999_900]) {
      expect(formatCompactMoney(cents).length).toBeLessThanOrEqual(5);
    }
  });
});

