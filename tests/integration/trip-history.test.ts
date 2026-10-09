import { asc, eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";
import { db } from "@/db/client";
import { tripEdits, tripEvents, trips } from "@/db/schema";
import { applyTransitions, updateTripDetails } from "@/db/trip-writes";
import type { tripInput } from "@/domain/trip-form";
import { transitionTrip, type TripState, type TripStatus } from "@/domain/trip-status";
import { createTrip, moveTrip, reassignDriver, updateTrip } from "@/server/actions/trips";
import { getActivity } from "@/server/queries/activity";
import { getTripDetail } from "@/server/queries/trip-detail";
import { demoUserId, expectRejectedBy, forceStatus, insertDriver, insertOffer } from "./database";
import { signInAsDemoUser } from "./session";

const form: z.input<typeof tripInput> = {
  customerName: "History Guest",
  pickupAddress: "Harborview Hotel",
  dropoffAddress: "Regional Airport, Terminal A",
  pickupDate: "2032-02-01",
  pickupTime: "09:30",
  durationMinutes: "60",
  passengers: "2",
  vehicleClass: "executive_van",
  fare: "180",
};

let actorId = "";
let vanDrivers: string[] = [];
let nextDay = 0;

async function book() {
  nextDay += 1;
  const pickupDate = `2032-02-${String(nextDay).padStart(2, "0")}`;
  const result = await createTrip({ ...form, pickupDate });
  if (!result.ok) throw new Error(result.message);
  return { ...result.data, pickupDate };
}

async function editsOf(tripId: string) {
  return db.select().from(tripEdits).where(eq(tripEdits.tripId, tripId)).orderBy(asc(tripEdits.field));
}

async function eventsOf(tripId: string) {
  return db.select().from(tripEvents).where(eq(tripEvents.tripId, tripId)).orderBy(asc(tripEvents.createdAt));
}

beforeAll(async () => {
  actorId = await demoUserId();
  vanDrivers = [await insertDriver("executive_van"), await insertDriver("executive_van")];
});

beforeEach(async () => {
  await signInAsDemoUser();
});

describe("editing a trip records what changed", () => {
  it("writes one typed row per changed field, with who and the old and new values", async () => {
    const trip = await book();
    const result = await updateTrip({
      ...form,
      tripId: trip.id,
      pickupDate: trip.pickupDate,
      pickupTime: "10:15",
      passengers: "3",
      fare: "210.50",
    });
    expect(result.ok).toBe(true);
    const edits = await editsOf(trip.id);
    expect(edits.map(({ field, actorId: who, fromInteger, toInteger }) => ({ field, who, fromInteger, toInteger }))).toEqual([
      { field: "pickup_at", who: actorId, fromInteger: null, toInteger: null },
      { field: "passengers", who: actorId, fromInteger: 2, toInteger: 3 },
      { field: "fare_cents", who: actorId, fromInteger: 18_000, toInteger: 21_050 },
    ]);
    const pickup = edits.find((edit) => edit.field === "pickup_at");
    expect((pickup?.toTime?.getTime() ?? 0) - (pickup?.fromTime?.getTime() ?? 0)).toBe(45 * 60_000);
  });

  it("writes nothing when the form is saved unchanged", async () => {
    const trip = await book();
    expect((await updateTrip({ ...form, tripId: trip.id, pickupDate: trip.pickupDate })).ok).toBe(true);
    expect(await editsOf(trip.id)).toEqual([]);
  });

  it("keeps the history and the trip together when the save fails", async () => {
    const trip = await book();
    await expect(
      db.transaction(async (tx) => {
        await updateTripDetails(tx, actorId, trip.id, {
          customerName: "Rolled Back",
          pickupAddress: form.pickupAddress,
          dropoffAddress: form.dropoffAddress,
          pickupAt: new Date("2032-02-28T15:00:00.000Z"),
          durationMinutes: 60,
          passengers: 2,
          vehicleClass: "executive_van",
          fareCents: 18_000,
        });
        throw new Error("Something after the write failed.");
      }),
    ).rejects.toThrow("Something after the write failed.");
    expect(await editsOf(trip.id)).toEqual([]);
    expect((await db.query.trips.findFirst({ where: eq(trips.id, trip.id) }))?.customerName).toBe("History Guest");
  });
});

describe("assigning and reassigning record both drivers", () => {
  it("records the driver on assignment and the old and new driver on reassignment", async () => {
    const trip = await book();
    const [first = "", second = ""] = vanDrivers;
    expect((await moveTrip({ tripId: trip.id, from: "offer", to: "assigned", driverId: first })).ok).toBe(true);
    expect((await reassignDriver({ tripId: trip.id, driverId: second })).ok).toBe(true);
    expect((await moveTrip({ tripId: trip.id, from: "assigned", to: "en_route" })).ok).toBe(true);
    const events = await eventsOf(trip.id);
    expect(events.map((event) => [event.fromStatus, event.toStatus, event.fromDriverId, event.toDriverId, event.actorId])).toEqual([
      [null, "offer", null, null, actorId],
      ["offer", "assigned", null, first, actorId],
      ["assigned", "assigned", first, second, actorId],
      ["assigned", "en_route", second, second, actorId],
    ]);
  });
});

describe("the activity log reads the history in plain words", () => {
  it("lists the reassignment and the fare change newest first", async () => {
    const trip = await book();
    const [first = "", second = ""] = vanDrivers;
    await db.execute(sql`update drivers set name = 'Ana Ruiz' where id = ${first}`);
    await db.execute(sql`update drivers set name = 'Ben Okafor' where id = ${second}`);
    await moveTrip({ tripId: trip.id, from: "offer", to: "assigned", driverId: first });
    await reassignDriver({ tripId: trip.id, driverId: second });
    await updateTrip({ ...form, tripId: trip.id, pickupDate: trip.pickupDate, fare: "210" });
    const { entries } = await getActivity({ show: 25 });
    const mine = entries.filter((entry) => entry.tripId === trip.id);
    expect(mine.map((entry) => (entry.kind === "edit" ? entry.edit : [entry.fromDriverName, entry.toDriverName]))).toEqual([
      { field: "fare_cents", from: 18_000, to: 21_000 },
      ["Ana Ruiz", "Ben Okafor"],
      [null, "Ana Ruiz"],
      [null, null],
    ]);
  });
});

describe("entries written at the same moment stay in the order they happened", () => {
  async function runInOneTransaction(tripId: string, driverId: string, path: readonly TripStatus[]) {
    await db.transaction(async (tx) => {
      let state: TripState = { status: "offer", driverId: null, cancelReason: null };
      for (const to of path) {
        const moved = transitionTrip(state, { to, actorId, driverId });
        state = moved.trip;
        await applyTransitions(tx, [{ tripId, ...moved }]);
      }
    });
  }

  it("shows a trip moved several times in one transaction newest first, on the trip and in the log", async () => {
    const path: readonly TripStatus[] = ["assigned", "en_route", "completed"];
    const tripIds = await Promise.all([1, 2, 3].map(() => insertOffer(actorId)));
    for (const tripId of tripIds) await runInOneTransaction(tripId, await insertDriver(), path);
    const newestFirst = ["completed", "en_route", "assigned", "offer"];
    const { entries } = await getActivity({ show: 100 });
    for (const tripId of tripIds) {
      const detail = await getTripDetail(tripId);
      expect(detail?.history.map((entry) => (entry.kind === "move" ? entry.toStatus : entry.kind))).toEqual(newestFirst);
      const logged = entries.filter((entry) => entry.tripId === tripId);
      expect(logged.map((entry) => (entry.kind === "move" ? entry.toStatus : entry.kind))).toEqual(newestFirst);
    }
  });

  it("keeps quick back-to-back moves and edits newest first", async () => {
    const trip = await book();
    const [first = ""] = vanDrivers;
    await updateTrip({ ...form, tripId: trip.id, pickupDate: trip.pickupDate, passengers: "3" });
    await moveTrip({ tripId: trip.id, from: "offer", to: "assigned", driverId: first });
    await updateTrip({ ...form, tripId: trip.id, pickupDate: trip.pickupDate, passengers: "3", fare: "195" });
    await moveTrip({ tripId: trip.id, from: "assigned", to: "en_route" });
    await moveTrip({ tripId: trip.id, from: "en_route", to: "completed" });
    const detail = await getTripDetail(trip.id);
    expect(detail?.history.map((entry) => (entry.kind === "move" ? entry.toStatus : entry.edit.field))).toEqual([
      "completed",
      "en_route",
      "fare_cents",
      "assigned",
      "passengers",
      "offer",
    ]);
  });
});

describe("the database guards the history", () => {
  it("refuses a detail change with no trip_edits row", async () => {
    const tripId = await insertOffer(actorId);
    await expectRejectedBy(db.execute(sql`update trips set fare_cents = 1 where id = ${tripId}`), "trips_edit_required");
  });

  it("refuses a trip_edits row that does not match the change", async () => {
    const tripId = await insertOffer(actorId);
    await expectRejectedBy(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          insert into trip_edits (trip_id, actor_id, field, from_integer, to_integer)
          values (${tripId}, ${actorId}, 'fare_cents', 12000, 99999)`);
        await tx.execute(sql`update trips set fare_cents = 15000 where id = ${tripId}`);
      }),
      "trips_edit_required",
    );
  });

  it("accepts a detail change written with its matching row", async () => {
    const tripId = await insertOffer(actorId);
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        insert into trip_edits (trip_id, actor_id, field, from_text, to_text)
        values (${tripId}, ${actorId}, 'customer_name', 'Test Customer', 'Renamed Customer')`);
      await tx.execute(sql`update trips set customer_name = 'Renamed Customer' where id = ${tripId}`);
    });
    expect(await editsOf(tripId)).toHaveLength(1);
  });

  it.each([
    ["a value in the wrong column", sql`'fare_cents', null, null, 'luxury_sedan', 'group_suv'`],
    ["a value that did not change", sql`'customer_name', 'Same', 'Same', null, null`],
    ["a missing new value", sql`'customer_name', 'Before', null, null, null`],
  ])("refuses a trip_edits row with %s", async (_label, values) => {
    const tripId = await insertOffer(actorId);
    await expectRejectedBy(
      db.execute(sql`
        insert into trip_edits (trip_id, actor_id, field, from_text, to_text, from_class, to_class)
        values (${tripId}, ${actorId}, ${values})`),
      "trip_edits_values_match_field",
    );
  });

  it("keeps trip_edits append-only", async () => {
    const tripId = await insertOffer(actorId);
    await db.transaction(async (tx) => {
      await tx.execute(sql`
        insert into trip_edits (trip_id, actor_id, field, from_integer, to_integer)
        values (${tripId}, ${actorId}, 'passengers', 2, 3)`);
      await tx.execute(sql`update trips set passengers = 3 where id = ${tripId}`);
    });
    await expectRejectedBy(
      db.execute(sql`update trip_edits set to_integer = 1 where trip_id = ${tripId}`),
      "trip_edits_append_only",
    );
    await expectRejectedBy(db.execute(sql`delete from trip_edits where trip_id = ${tripId}`), "trip_edits_append_only");
  });

  it("refuses a driver change with no matching event", async () => {
    const tripId = await insertOffer(actorId);
    const [first = "", second = ""] = vanDrivers;
    const sedanDriver = await insertDriver("luxury_sedan");
    const otherSedanDriver = await insertDriver("luxury_sedan");
    await forceStatus(tripId, actorId, { from: "offer", to: "assigned", driverId: sedanDriver });
    await expectRejectedBy(
      db.execute(sql`update trips set driver_id = ${otherSedanDriver} where id = ${tripId}`),
      "trips_event_required",
    );
    await expectRejectedBy(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          insert into trip_events (trip_id, actor_id, from_status, to_status, from_driver_id, to_driver_id)
          values (${tripId}, ${actorId}, 'assigned', 'assigned', ${first}, ${second})`);
        await tx.execute(sql`update trips set driver_id = ${otherSedanDriver} where id = ${tripId}`);
      }),
      "trips_event_required",
    );
  });

  it("refuses an assignment event that names the wrong driver", async () => {
    const tripId = await insertOffer(actorId);
    const sedanDriver = await insertDriver("luxury_sedan");
    const [van = ""] = vanDrivers;
    await expectRejectedBy(
      db.transaction(async (tx) => {
        await tx.execute(sql`
          insert into trip_events (trip_id, actor_id, from_status, to_status, to_driver_id)
          values (${tripId}, ${actorId}, 'offer', 'assigned', ${van})`);
        await tx.execute(sql`update trips set status = 'assigned', driver_id = ${sedanDriver} where id = ${tripId}`);
      }),
      "trips_event_required",
    );
  });
});
