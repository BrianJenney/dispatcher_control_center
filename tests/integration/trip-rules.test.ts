import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { canTransition, tripStatuses, type TripStatus } from "@/domain/trip-status";
import { friendlyDatabaseError } from "@/server/database-errors";
import { demoUserId, expectRejectedBy, forceStatus, freeSlot, insertDriver, insertOffer } from "./database";

const pathTo: Record<TripStatus, TripStatus[]> = {
  offer: [],
  assigned: ["assigned"],
  en_route: ["assigned", "en_route"],
  completed: ["assigned", "en_route", "completed"],
  cancelled: ["cancelled"],
};

let actorId = "";
let driverId = "";

beforeAll(async () => {
  actorId = await demoUserId();
  driverId = await insertDriver();
});

async function tripIn(status: TripStatus, pickupAt = freeSlot()) {
  const tripId = await insertOffer(actorId, pickupAt);
  let current: TripStatus = "offer";
  for (const to of pathTo[status]) {
    await forceStatus(tripId, actorId, { from: current, to, driverId: to === "cancelled" ? null : driverId, reason: to === "cancelled" ? "Test" : null });
    current = to;
  }
  return tripId;
}

async function statusOf(tripId: string) {
  const rows = await db.execute<{ status: TripStatus }>(sql`select status from trips where id = ${tripId}`);
  return rows.rows[0]?.status;
}

const pairs = tripStatuses.flatMap((from) => tripStatuses.filter((to) => to !== from).map((to) => ({ from, to })));

describe("the database enforces the status flow with the app bypassed", () => {
  it.each(pairs.filter(({ from, to }) => canTransition(from, to)))("accepts $from -> $to", async ({ from, to }) => {
    const tripId = await tripIn(from);
    await forceStatus(tripId, actorId, { from, to, driverId, reason: to === "cancelled" ? "Client changed plans" : null });
    expect(await statusOf(tripId)).toBe(to);
  });

  it.each(pairs.filter(({ from, to }) => !canTransition(from, to)))("rejects $from -> $to", async ({ from, to }) => {
    const tripId = await tripIn(from);
    await expectRejectedBy(
      forceStatus(tripId, actorId, { from, to, driverId, reason: to === "cancelled" ? "Client changed plans" : null }),
      "trips_status_transition",
    );
    expect(await statusOf(tripId)).toBe(from);
  });

  it("rejects a trip inserted in any status but offer", async () => {
    await expectRejectedBy(
      db.execute(sql`
        insert into trips (customer_name, pickup_address, dropoff_address, pickup_at, passengers, vehicle_class, fare_cents, status, driver_id)
        values ('Test', 'A', 'B', now(), 1, 'luxury_sedan', 100, 'completed', ${driverId})`),
      "trips_status_transition",
    );
  });

  it("rejects a status change with no trip_events row", async () => {
    const tripId = await tripIn("offer");
    await expectRejectedBy(
      db.transaction(async (tx) => {
        await tx.execute(sql`update trips set status = 'assigned', driver_id = ${driverId} where id = ${tripId}`);
      }),
      "trips_event_required",
    );
    expect(await statusOf(tripId)).toBe("offer");
  });

  it("rejects a new trip with no creation event", async () => {
    await expectRejectedBy(
      db.execute(sql`
        insert into trips (customer_name, pickup_address, dropoff_address, pickup_at, passengers, vehicle_class, fare_cents)
        values ('Test', 'A', 'B', now(), 1, 'luxury_sedan', 100)`),
      "trips_event_required",
    );
  });

  it("rejects an event that does not match the move", async () => {
    const tripId = await tripIn("offer");
    await expectRejectedBy(
      db.transaction(async (tx) => {
        await tx.execute(sql`update trips set status = 'assigned', driver_id = ${driverId} where id = ${tripId}`);
        await tx.execute(sql`
          insert into trip_events (trip_id, actor_id, from_status, to_status)
          values (${tripId}, ${actorId}, 'offer', 'cancelled')`);
      }),
      "trips_event_required",
    );
  });

  it("rejects cancelling without a reason", async () => {
    const tripId = await tripIn("assigned");
    await expectRejectedBy(
      forceStatus(tripId, actorId, { from: "assigned", to: "cancelled", driverId, reason: "   " }),
      "trips_cancel_reason_matches_status",
    );
  });

  it("rejects a cancel reason on a trip that is not cancelled", async () => {
    const tripId = await tripIn("offer");
    await expectRejectedBy(
      db.execute(sql`update trips set cancel_reason = 'Stray' where id = ${tripId}`),
      "trips_cancel_reason_matches_status",
    );
  });

  it.each(["assigned", "en_route", "completed"] as const)("requires a driver once %s", async (status) => {
    const tripId = await tripIn(status);
    await expectRejectedBy(
      db.execute(sql`update trips set driver_id = null where id = ${tripId}`),
      "trips_driver_matches_status",
    );
  });

  it("rejects a driver on an offer", async () => {
    const tripId = await tripIn("offer");
    await expectRejectedBy(
      db.execute(sql`update trips set driver_id = ${driverId} where id = ${tripId}`),
      "trips_driver_matches_status",
    );
  });

  it("keeps trip_events append-only", async () => {
    const tripId = await tripIn("offer");
    await expectRejectedBy(
      db.execute(sql`update trip_events set reason = 'edited' where trip_id = ${tripId}`),
      "trip_events_append_only",
    );
    await expectRejectedBy(db.execute(sql`delete from trip_events where trip_id = ${tripId}`), "trip_events_append_only");
  });
});

describe("the database refuses overlapping active trips for one driver", () => {
  async function assign(tripId: string, driver: string) {
    await forceStatus(tripId, actorId, { from: "offer", to: "assigned", driverId: driver });
  }

  it("rejects a second trip that overlaps an assigned one", async () => {
    const pickupAt = freeSlot();
    await assign(await insertOffer(actorId, pickupAt, 60), driverId);
    const second = await insertOffer(actorId, new Date(pickupAt.getTime() + 30 * 60_000), 60);
    await expectRejectedBy(assign(second, driverId), "trips_no_overlapping_driver_trips");
  });

  it("rejects overlap with a trip that is en route", async () => {
    const pickupAt = freeSlot();
    const first = await tripIn("en_route", pickupAt);
    expect(await statusOf(first)).toBe("en_route");
    await expectRejectedBy(assign(await insertOffer(actorId, pickupAt, 15), driverId), "trips_no_overlapping_driver_trips");
  });

  it("allows back to back trips that only touch", async () => {
    const pickupAt = freeSlot();
    await assign(await insertOffer(actorId, pickupAt, 60), driverId);
    const next = await insertOffer(actorId, new Date(pickupAt.getTime() + 60 * 60_000), 60);
    await assign(next, driverId);
    expect(await statusOf(next)).toBe("assigned");
  });

  it("ignores completed and cancelled trips", async () => {
    const pickupAt = freeSlot();
    await tripIn("completed", pickupAt);
    const cancelled = await insertOffer(actorId, pickupAt);
    await assign(cancelled, driverId);
    await forceStatus(cancelled, actorId, { from: "assigned", to: "cancelled", driverId, reason: "Test" });
    const fresh = await insertOffer(actorId, pickupAt);
    await assign(fresh, driverId);
    expect(await statusOf(fresh)).toBe("assigned");
  });

  it("allows the same time for different drivers", async () => {
    const pickupAt = freeSlot();
    await assign(await insertOffer(actorId, pickupAt), driverId);
    const other = await insertOffer(actorId, pickupAt);
    await assign(other, await insertDriver());
    expect(await statusOf(other)).toBe("assigned");
  });

  it("explains the clash in plain language", async () => {
    const pickupAt = freeSlot();
    await assign(await insertOffer(actorId, pickupAt), driverId);
    const second = await insertOffer(actorId, pickupAt);
    const error: unknown = await assign(second, driverId).catch((failure: unknown) => failure);
    expect(friendlyDatabaseError(error)).toBe("That driver already has a trip at that time. Choose another driver.");
  });
});

describe("the database keeps a driver and their active trips in one vehicle class", () => {
  async function driverWith(status: TripStatus) {
    const driver = await insertDriver("luxury_sedan");
    const tripId = await insertOffer(actorId);
    let current: TripStatus = "offer";
    for (const to of pathTo[status]) {
      await forceStatus(tripId, actorId, { from: current, to, driverId: to === "cancelled" ? null : driver, reason: to === "cancelled" ? "Test" : null });
      current = to;
    }
    return { driver, tripId };
  }

  function changeClass(driver: string) {
    return db.execute(sql`update drivers set vehicle_class = 'executive_suv' where id = ${driver}`);
  }

  it("rejects assigning a trip to a driver of another class", async () => {
    const tripId = await insertOffer(actorId);
    const suvDriver = await insertDriver("executive_suv");
    await expectRejectedBy(
      forceStatus(tripId, actorId, { from: "offer", to: "assigned", driverId: suvDriver }),
      "trips_driver_class_matches",
    );
    expect(await statusOf(tripId)).toBe("offer");
  });

  it("rejects moving an assigned trip to a driver of another class", async () => {
    const { tripId } = await driverWith("assigned");
    const suvDriver = await insertDriver("executive_suv");
    await expectRejectedBy(
      db.execute(sql`update trips set driver_id = ${suvDriver} where id = ${tripId}`),
      "trips_driver_class_matches",
    );
  });

  it("rejects changing the class of an assigned trip away from its driver's", async () => {
    const { tripId } = await driverWith("assigned");
    await expectRejectedBy(
      db.execute(sql`update trips set vehicle_class = 'executive_suv' where id = ${tripId}`),
      "trips_driver_class_matches",
    );
  });

  it.each(["assigned", "en_route"] as const)("rejects changing a driver's class while a trip is %s", async (status) => {
    const { driver } = await driverWith(status);
    await expectRejectedBy(changeClass(driver), "drivers_class_matches_active_trips");
  });

  it.each(["offer", "completed", "cancelled"] as const)("allows changing a driver's class once their trip is %s", async (status) => {
    const { driver } = await driverWith(status);
    await changeClass(driver);
    const rows = await db.execute<{ vehicle_class: string }>(sql`select vehicle_class from drivers where id = ${driver}`);
    expect(rows.rows[0]?.vehicle_class).toBe("executive_suv");
  });

  it("explains both refusals in plain language", async () => {
    const { driver } = await driverWith("assigned");
    const classChange: unknown = await changeClass(driver).catch((failure: unknown) => failure);
    expect(friendlyDatabaseError(classChange)).toBe(
      "This driver still has trips in the current class that are assigned or under way. Reassign or finish them before changing the class.",
    );
    const tripId = await insertOffer(actorId);
    const assignment: unknown = await forceStatus(tripId, actorId, { from: "offer", to: "assigned", driverId: await insertDriver("executive_van") }).catch(
      (failure: unknown) => failure,
    );
    expect(friendlyDatabaseError(assignment)).toBe("That driver drives a different vehicle class than this trip needs. Choose a driver in the right class.");
  });
});

describe("documents", () => {
  async function insertDocument(values: { kind: string; driverId: string | null; contentType: string; sizeBytes: number }) {
    await db.execute(sql`
      insert into documents (kind, driver_id, storage_key, file_name, content_type, size_bytes, uploaded_by)
      values (${values.kind}, ${values.driverId}, ${crypto.randomUUID()}, 'licence.pdf', ${values.contentType}, ${values.sizeBytes}, ${actorId})`);
  }

  it("accepts a driver license PDF under 10 MB", async () => {
    await insertDocument({ kind: "driver_license", driverId, contentType: "application/pdf", sizeBytes: 10 * 1024 * 1024 });
  });

  it("rejects files over 10 MB", async () => {
    await expectRejectedBy(
      insertDocument({ kind: "driver_license", driverId, contentType: "application/pdf", sizeBytes: 10 * 1024 * 1024 + 1 }),
      "documents_size_limit",
    );
  });

  it("rejects file types other than PDF and images", async () => {
    await expectRejectedBy(
      insertDocument({ kind: "driver_license", driverId, contentType: "application/zip", sizeBytes: 100 }),
      "documents_content_type_allowed",
    );
  });

  it("rejects a vehicle registration attached to a driver", async () => {
    await expectRejectedBy(
      insertDocument({ kind: "vehicle_registration", driverId, contentType: "image/png", sizeBytes: 100 }),
      "documents_owner_matches_kind",
    );
  });
});
