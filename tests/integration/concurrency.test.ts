import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { db } from "@/db/client";
import { trips } from "@/db/schema";
import { tripMessages } from "@/domain/trip-status";
import { defineAction } from "@/server/action";
import { moveTrip } from "@/server/actions/trips";
import { demoUserId, freeSlot, insertDriver, insertOffer } from "./database";
import { signInAsDemoUser } from "./session";

let actorId = "";

beforeAll(async () => {
  actorId = await demoUserId();
});

beforeEach(async () => {
  await signInAsDemoUser();
});

describe("two dispatchers at once", () => {
  it("assigning one driver to two overlapping trips at the same moment lets exactly one through", async () => {
    const driverId = await insertDriver();
    const pickupAt = freeSlot();
    const [first, second] = await Promise.all([insertOffer(actorId, pickupAt), insertOffer(actorId, pickupAt)]);
    const results = await Promise.all([
      moveTrip({ tripId: first, from: "offer", to: "assigned", driverId }),
      moveTrip({ tripId: second, from: "offer", to: "assigned", driverId }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({
      message: "That driver already has a trip at that time. Choose another driver.",
    });
  });

  it("assigning the same trip to two drivers at the same moment keeps the first and explains the second", async () => {
    const [ava, ben] = await Promise.all([insertDriver(), insertDriver()]);
    const tripId = await insertOffer(actorId);
    const results = await Promise.all([
      moveTrip({ tripId, from: "offer", to: "assigned", driverId: ava }),
      moveTrip({ tripId, from: "offer", to: "assigned", driverId: ben }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ message: tripMessages.changedElsewhere });
    const saved = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    expect([ava, ben]).toContain(saved?.driverId);
  });

  it("starting and cancelling the same trip at once leaves it in one consistent state", async () => {
    const driverId = await insertDriver();
    const tripId = await insertOffer(actorId);
    await moveTrip({ tripId, from: "offer", to: "assigned", driverId });
    const results = await Promise.all([
      moveTrip({ tripId, from: "assigned", to: "en_route" }),
      moveTrip({ tripId, from: "assigned", to: "cancelled", reason: "Client called" }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const saved = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    expect(["en_route", "cancelled"]).toContain(saved?.status);
  });
});

describe("a deadlock between two writes", () => {
  it("runs the losing write again instead of failing it", async () => {
    let attempts = 0;
    const save = defineAction(z.object({}), () => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(Object.assign(new Error("deadlock detected"), { code: "40P01" }));
      return Promise.resolve("saved");
    });
    expect(await save({})).toEqual({ ok: true, data: "saved" });
    expect(attempts).toBe(2);
  });
});
