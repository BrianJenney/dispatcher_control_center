import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { trips } from "@/db/schema";
import { tripMessages } from "@/domain/trip-status";
import { moveTrip } from "@/server/actions/trips";
import { demoUserId, insertDriver, insertOffer } from "./database";
import { signInAsDemoUser, signOut } from "./session";

let driverId = "";

beforeAll(async () => {
  driverId = await insertDriver();
});

beforeEach(async () => {
  await signInAsDemoUser();
});

async function statusOf(tripId: string) {
  return (await db.query.trips.findFirst({ where: eq(trips.id, tripId) }))?.status;
}

describe("moveTrip", () => {
  it("walks a trip from offer to completed", async () => {
    const tripId = await insertOffer(await demoUserId());
    expect(await moveTrip({ tripId, from: "offer", to: "assigned", driverId })).toEqual({
      ok: true,
      data: { status: "assigned" },
    });
    expect((await moveTrip({ tripId, from: "assigned", to: "en_route" })).ok).toBe(true);
    expect((await moveTrip({ tripId, from: "en_route", to: "completed" })).ok).toBe(true);
    expect(await statusOf(tripId)).toBe("completed");
  });

  it("refuses a move from a stale tab", async () => {
    const tripId = await insertOffer(await demoUserId());
    await moveTrip({ tripId, from: "offer", to: "assigned", driverId });
    expect(await moveTrip({ tripId, from: "offer", to: "cancelled", reason: "Old tab" })).toEqual({
      ok: false,
      message: tripMessages.changedElsewhere,
      fieldErrors: {},
    });
    expect(await statusOf(tripId)).toBe("assigned");
  });

  it("explains an illegal move in plain language", async () => {
    const tripId = await insertOffer(await demoUserId());
    expect(await moveTrip({ tripId, from: "offer", to: "completed" })).toEqual({
      ok: false,
      message: "A trip that is still an offer cannot move to completed.",
      fieldErrors: {},
    });
  });

  it("asks for a reason before cancelling", async () => {
    const tripId = await insertOffer(await demoUserId());
    const result = await moveTrip({ tripId, from: "offer", to: "cancelled", reason: "  " });
    expect(result).toMatchObject({ ok: false, message: tripMessages.cancelReasonRequired });
    expect(await statusOf(tripId)).toBe("offer");
  });

  it("refuses to move a trip without a session", async () => {
    const tripId = await insertOffer(await demoUserId());
    signOut();
    expect((await moveTrip({ tripId, from: "offer", to: "cancelled", reason: "Nope" })).ok).toBe(false);
    expect(await statusOf(tripId)).toBe("offer");
  });

  it("reports a trip that does not exist", async () => {
    const result = await moveTrip({ tripId: crypto.randomUUID(), from: "offer", to: "cancelled", reason: "Gone" });
    expect(result).toMatchObject({ ok: false, message: "That trip no longer exists." });
  });
});
