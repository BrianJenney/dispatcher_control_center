import { beforeEach, describe, expect, it } from "vitest";
import { isPickedUpToday, summarizeDashboard } from "@/domain/dashboard";
import { getDashboard } from "@/server/queries/dashboard";
import { demoUserId, insertOffer } from "./database";
import { signInAsDemoUser } from "./session";

beforeEach(async () => {
  await signInAsDemoUser();
});

describe("active jobs tile", () => {
  it("counts today's offers waiting for a driver alongside assigned and en route trips", async () => {
    const pickupAt = new Date(Date.now() + 60_000);
    await insertOffer(await demoUserId(), pickupAt);
    const snapshot = await getDashboard();
    const today = snapshot.trips.filter((trip) => isPickedUpToday(trip, snapshot.today));
    const offers = today.filter((trip) => trip.status === "offer").length;
    const assigned = today.filter((trip) => trip.status === "assigned").length;
    const enRoute = snapshot.trips.filter((trip) => trip.status === "en_route").length;
    const kpis = summarizeDashboard(snapshot);
    expect(offers).toBeGreaterThan(0);
    expect(kpis.needsDriver).toBe(offers);
    expect(kpis.activeJobs).toBe(offers + assigned + enRoute);
  });
});
