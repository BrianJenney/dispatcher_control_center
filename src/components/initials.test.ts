import { describe, expect, it } from "vitest";
import { initials, shortName } from "@/components/initials";

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("adele fairbanks")).toBe("AF");
  });
});

describe("shortName", () => {
  it.each([
    ["Adele Fairbanks", "Adele F."],
    ["Mireille de Santos", "Mireille S."],
    ["  Cher  ", "Cher"],
  ])("shortens %s to %s", (name, short) => {
    expect(shortName(name)).toBe(short);
  });
});
