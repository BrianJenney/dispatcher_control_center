import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "@/db/client";
import { trips } from "@/db/schema";
import { rollDemoDayForward, seed } from "@/db/seed";
import { unassignedAtPickup } from "@/domain/demo-day";
import { dayRange } from "@/domain/time";
import { tripStatuses } from "@/domain/trip-status";
import { env } from "@/env";
import { databaseUrlNamed, freshDatabase, seedOptions } from "../../scripts/lib/database";

const url = databaseUrlNamed("dispatch_demo_day_test");
const today = dayRange(new Date(), env.APP_TIMEZONE);
let connection: ReturnType<typeof createDatabase>;
let db: Database;
let actorId: string;

beforeAll(async () => {
  await freshDatabase(url, { seed: false });
  connection = createDatabase(url);
  db = connection.db;
  const seeded = await seed(db, { ...seedOptions(), now: new Date(Date.now() - 3 * 86_400_000) });
  actorId = seeded.demoUserId;
});

afterAll(async () => {
  await connection.pool.end();
});

function roll() {
  return rollDemoDayForward(db, { actorId, now: new Date(), timeZone: env.APP_TIMEZONE });
}

describe("rolling the demo day forward", () => {
  it("finishes or cancels every trip left open on an earlier day, and fills today", async () => {
    const result = await roll();
    expect(result.closed).toBeGreaterThan(0);
    expect(result.added).toBeGreaterThan(0);
    const stillOpen = await db.$count(
      trips,
      and(lt(trips.pickupAt, today.start), inArray(trips.status, ["offer", "assigned", "en_route"])),
    );
    expect(stillOpen).toBe(0);
    const unassigned = await db.$count(trips, and(eq(trips.status, "cancelled"), eq(trips.cancelReason, unassignedAtPickup)));
    expect(unassigned).toBeGreaterThan(0);
  });

  it("puts trips in every status today", async () => {
    const rows = await db
      .selectDistinct({ status: trips.status })
      .from(trips)
      .where(and(gte(trips.pickupAt, today.start), lt(trips.pickupAt, today.end)));
    expect(rows.map((row) => row.status).sort()).toEqual([...tripStatuses].sort());
  });

  it("changes nothing when run again the same day", async () => {
    expect(await roll()).toEqual({ closed: 0, added: 0 });
  });
});
