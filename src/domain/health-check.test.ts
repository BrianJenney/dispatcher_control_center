import { describe, expect, it } from "vitest";
import { uptimeAnswer } from "@/domain/health-check";

describe("uptimeAnswer", () => {
  it("answers 200 with only the database state when it is reachable", () => {
    expect(uptimeAnswer(true)).toEqual({ status: 200, body: { database: "ok" } });
  });

  it("answers 503 when the database cannot be reached, so the uptime monitor alerts", () => {
    expect(uptimeAnswer(false)).toEqual({ status: 503, body: { database: "unreachable" } });
  });
});
