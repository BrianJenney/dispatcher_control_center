import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { tripEvents, trips } from "@/db/schema";
import { applyTransitions, insertOffers } from "@/db/trip-writes";
import { transitionTrip, tripMessages, type TripState } from "@/domain/trip-status";
import { demoUserId, freeSlot, insertDriver } from "./database";

let actorId = "";
let driverId = "";

beforeAll(async () => {
  actorId = await demoUserId();
  driverId = await insertDriver();
});

async function newOffer() {
  const id = crypto.randomUUID();
  await db.transaction((tx) =>
    insertOffers(tx, actorId, [
      {
        id,
        customerName: "Writes Test",
        pickupAddress: "Harborview Hotel",
        dropoffAddress: "Regional Airport, Terminal A",
        pickupAt: freeSlot(),
        passengers: 2,
        vehicleClass: "luxury_sedan",
        fareCents: 12_000,
      },
    ]),
  );
  return id;
}

const offer: TripState = { status: "offer", driverId: null, cancelReason: null };

describe("trip writes", () => {
  it("saves a transition with its event", async () => {
    const tripId = await newOffer();
    const moved = transitionTrip(offer, { to: "assigned", actorId, driverId });
    await db.transaction((tx) => applyTransitions(tx, [{ tripId, ...moved }]));
    const saved = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    expect(saved?.status).toBe("assigned");
    const events = await db.select().from(tripEvents).where(eq(tripEvents.tripId, tripId));
    expect(events.map((event) => [event.fromStatus, event.toStatus])).toEqual([
      [null, "offer"],
      ["offer", "assigned"],
    ]);
  });

  it("refuses a move made from a stale status, as from an old tab", async () => {
    const tripId = await newOffer();
    const assign = transitionTrip(offer, { to: "assigned", actorId, driverId });
    await db.transaction((tx) => applyTransitions(tx, [{ tripId, ...assign }]));
    const staleCancel = transitionTrip(offer, { to: "cancelled", actorId, reason: "Old tab" });
    await expect(db.transaction((tx) => applyTransitions(tx, [{ tripId, ...staleCancel }]))).rejects.toThrow(
      tripMessages.changedElsewhere,
    );
    const saved = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
    expect(saved?.status).toBe("assigned");
  });
});
