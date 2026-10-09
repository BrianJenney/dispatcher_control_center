import { describe, expect, it } from "vitest";
import { closeOutPath, daySeed } from "@/domain/demo-day";
import { canTransition, isFinal, tripStatuses } from "@/domain/trip-status";

describe("closeOutPath", () => {
  it("cancels an offer, and finishes assigned and en route trips", () => {
    expect(closeOutPath("offer")).toEqual(["cancelled"]);
    expect(closeOutPath("assigned")).toEqual(["en_route", "completed"]);
    expect(closeOutPath("en_route")).toEqual(["completed"]);
  });

  it("leaves finished trips alone", () => {
    expect(closeOutPath("completed")).toEqual([]);
    expect(closeOutPath("cancelled")).toEqual([]);
  });

  it("only takes allowed steps and always ends on a final status", () => {
    for (const status of tripStatuses) {
      const path = closeOutPath(status);
      let current = status;
      for (const next of path) {
        expect(canTransition(current, next)).toBe(true);
        current = next;
      }
      expect(isFinal(current)).toBe(true);
    }
  });
});

describe("daySeed", () => {
  it("is the same all day and changes the next day", () => {
    expect(daySeed(new Date("2026-10-09T04:00:00Z"))).toBe(daySeed(new Date("2026-10-09T23:59:59Z")));
    expect(daySeed(new Date("2026-10-10T04:00:00Z"))).toBe(daySeed(new Date("2026-10-09T04:00:00Z")) + 1);
  });
});
