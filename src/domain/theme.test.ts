import { describe, expect, it } from "vitest";
import { isDark, nextTheme, parseTheme, themeChoices } from "@/domain/theme";

describe("parseTheme", () => {
  it.each(themeChoices)("keeps a stored %s choice", (choice) => {
    expect(parseTheme(choice)).toBe(choice);
  });

  it("falls back to following the device when nothing valid is stored", () => {
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("")).toBe("system");
    expect(parseTheme("sepia")).toBe("system");
  });
});

describe("isDark", () => {
  it("honours an explicit choice whatever the device prefers", () => {
    expect(isDark("dark", false)).toBe(true);
    expect(isDark("light", true)).toBe(false);
  });

  it("follows the device when the choice is system", () => {
    expect(isDark("system", true)).toBe(true);
    expect(isDark("system", false)).toBe(false);
  });
});

describe("nextTheme", () => {
  it("cycles light, dark, device and back", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
    expect(nextTheme("system")).toBe("light");
  });
});
