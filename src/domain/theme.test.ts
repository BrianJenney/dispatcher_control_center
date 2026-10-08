import { describe, expect, it } from "vitest";
import { nextTheme, parseTheme, resolveTheme, themeChoices } from "@/domain/theme";

describe("parseTheme", () => {
  it.each(themeChoices)("keeps a stored %s choice", (choice) => {
    expect(parseTheme(choice)).toBe(choice);
  });

  it("treats nothing stored as no choice", () => {
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme("")).toBeNull();
  });

  it("treats the legacy system value as no choice", () => {
    expect(parseTheme("system")).toBeNull();
  });

  it.each(["sepia", "Dark", "LIGHT", " dark", "undefined"])("treats %j as no choice", (junk) => {
    expect(parseTheme(junk)).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("honours a stored choice whatever the device prefers", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });

  it("follows the device when nothing is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it.each(["system", "", "sepia"])("follows the device when %j is stored", (junk) => {
    expect(resolveTheme(junk, true)).toBe("dark");
    expect(resolveTheme(junk, false)).toBe("light");
  });
});

describe("nextTheme", () => {
  it("flips between light and dark", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  it("returns to where it started after two flips", () => {
    expect(nextTheme(nextTheme("light"))).toBe("light");
    expect(nextTheme(nextTheme("dark"))).toBe("dark");
  });
});
