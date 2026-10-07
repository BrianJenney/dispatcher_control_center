import { describe, expect, it } from "vitest";
import { tourSteps } from "@/domain/tour";

describe("tourSteps", () => {
  it("has a short run of steps that each say something", () => {
    expect(tourSteps.length).toBeGreaterThanOrEqual(3);
    expect(tourSteps.length).toBeLessThanOrEqual(6);
    for (const step of tourSteps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(20);
    }
  });

  it("uses a different title for every step", () => {
    expect(new Set(tourSteps.map((step) => step.title)).size).toBe(tourSteps.length);
  });

  it("only links to pages inside the app", () => {
    for (const step of tourSteps) {
      if (step.link) expect(step.link.href.startsWith("/")).toBe(true);
    }
  });
});
