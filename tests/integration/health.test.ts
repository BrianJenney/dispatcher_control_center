import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as healthDetails } from "@/app/api/health/details/route";
import { GET as uptimeCheck } from "@/app/api/health/route";
import { clearHealthChecks, recordHealthCheck } from "@/server/actions/health";
import { databaseReachable, getHealthSnapshot } from "@/server/queries/health";
import { uptimeRoute } from "@/server/route";
import { signInAsDemoUser, signOut } from "./session";

vi.mock(import("next/server"), async (original) => ({ ...(await original()), connection: () => Promise.resolve() }));

describe("public uptime check", () => {
  it("reaches the database", async () => {
    expect(await databaseReachable()).toBe(true);
  });

  it("tells a signed out monitor only that the database is up", async () => {
    signOut();
    const response = await uptimeCheck();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ database: "ok" });
  });

  it("answers 503 when the database cannot be reached", async () => {
    const response = await uptimeRoute(() => Promise.resolve(false))();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ database: "unreachable" });
  });

  it("keeps monitoring and check history behind sign in", async () => {
    signOut();
    const refused = await healthDetails(new Request("http://localhost/api/health/details"), { params: Promise.resolve({}) });
    expect(refused.status).toBe(401);
    await signInAsDemoUser();
    const allowed = await healthDetails(new Request("http://localhost/api/health/details"), { params: Promise.resolve({}) });
    expect(await allowed.json()).toMatchObject({ database: "ok", errorReporting: false });
  });
});

describe("health check paved path", () => {
  beforeEach(async () => {
    await signInAsDemoUser();
    await clearHealthChecks({});
  });

  it("reads an empty snapshot", async () => {
    expect(await getHealthSnapshot()).toEqual({ database: "ok", errorReporting: false, checkCount: 0, latestCheck: null });
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

  it("lets the uptime monitor read the snapshot without a session", async () => {
    signOut();
    expect((await getHealthSnapshot()).database).toBe("ok");
  });

  it("clears every check", async () => {
    await recordHealthCheck({ label: "One" });
    await recordHealthCheck({ label: "Two" });
    expect(await clearHealthChecks({})).toEqual({ ok: true, data: { cleared: 2 } });
  });
});
