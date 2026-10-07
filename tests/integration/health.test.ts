import { beforeEach, describe, expect, it } from "vitest";
import { clearHealthChecks, recordHealthCheck } from "@/server/actions/health";
import { getHealthSnapshot } from "@/server/queries/health";
import { signInAsDemoUser, signOut } from "./session";

describe("health check paved path", () => {
  beforeEach(async () => {
    await signInAsDemoUser();
    await clearHealthChecks({});
  });

  it("reads an empty snapshot", async () => {
    expect(await getHealthSnapshot()).toEqual({ database: "ok", checkCount: 0, latestCheck: null });
  });

  it("writes a check and reads it back", async () => {
    expect(await recordHealthCheck({ label: "  Morning check  " })).toEqual({ ok: true, data: undefined });
    const snapshot = await getHealthSnapshot();
    expect(snapshot.checkCount).toBe(1);
    expect(snapshot.latestCheck?.label).toBe("Morning check");
  });

  it("rejects invalid input in plain language", async () => {
    const result = await recordHealthCheck({ label: " " });
    expect(result).toEqual({
      ok: false,
      message: "Some fields need attention.",
      fieldErrors: { label: ["Give the check a short name."] },
    });
  });

  it("refuses writes without a session", async () => {
    signOut();
    const result = await recordHealthCheck({ label: "Night check" });
    expect(result.ok).toBe(false);
    await signInAsDemoUser();
    expect((await getHealthSnapshot()).checkCount).toBe(0);
  });

  it("clears every check", async () => {
    await recordHealthCheck({ label: "One" });
    await recordHealthCheck({ label: "Two" });
    expect(await clearHealthChecks({})).toEqual({ ok: true, data: { cleared: 2 } });
  });
});
