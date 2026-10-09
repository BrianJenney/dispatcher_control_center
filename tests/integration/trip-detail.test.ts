import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { moveTrip } from "@/server/actions/trips";
import { getTripDetail } from "@/server/queries/trip-detail";
import { demoUserId, insertDriver, insertOffer } from "./database";
import { signInAsDemoUser } from "./session";

let actorId = "";

beforeAll(async () => {
  actorId = await demoUserId();
});

beforeEach(async () => {
  await signInAsDemoUser();
});

describe("one trip's page", () => {
  it("shows the trip and only its own history, newest first", async () => {
    const driverId = await insertDriver();
    const tripId = await insertOffer(actorId);
    const otherTripId = await insertOffer(actorId);
    expect((await moveTrip({ tripId, from: "offer", to: "assigned", driverId })).ok).toBe(true);
    expect((await moveTrip({ tripId: otherTripId, from: "offer", to: "cancelled", reason: "Guest changed plans" })).ok).toBe(true);

    const detail = await getTripDetail(tripId);
    expect(detail?.trip).toMatchObject({ id: tripId, status: "assigned", driver: { id: driverId } });
    expect(detail?.history.map((entry) => entry.tripId)).toEqual(detail?.history.map(() => tripId));
    expect(detail?.history[0]).toMatchObject({ kind: "move", toStatus: "assigned" });
  });

  it("finds nothing for a missing or malformed id", async () => {
    expect(await getTripDetail("4f1c2b8e-3a6d-4e2f-9b1a-7c5d8e9f0a1b")).toBeNull();
    expect(await getTripDetail("not-a-trip")).toBeNull();
  });
});
