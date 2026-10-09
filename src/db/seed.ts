import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import type { Database } from "@/db/client";
import { account, drivers, session, trips, user, vehicles } from "@/db/schema";
import {
  cancelReasons,
  createRandom,
  fakeAddress,
  fakeCustomer,
  fakeLoadDriverName,
  fakePhone,
  fareBaseCents,
  inTurn,
  seedDrivers,
  seedVehicles,
  type Random,
} from "@/db/seed-data";
import { applyTransitions, insertOffers, type NewTrip } from "@/db/trip-writes";
import { closeOutPath, daySeed, unassignedAtPickup } from "@/domain/demo-day";
import { maxPassengers, type VehicleClass } from "@/domain/fleet";
import { dayRange, hourMs, shiftDays, tripWindow, type TimeRange } from "@/domain/time";
import { activeStatuses, transitionTrip, tripStatuses, type TripState, type TripStatus } from "@/domain/trip-status";

export type SeedOptions = {
  demoUser: { email: string; password: string };
  now: Date;
  timeZone: string;
  loadTrips?: number;
};

type SeedDriver = { id: string; vehicleClass: VehicleClass; onDuty: boolean };

type PlannedTrip = {
  values: NewTrip & { durationMinutes: number };
  driverId: string;
  target: TripStatus;
  cancelAfterSteps: number;
};

const slotHours = [7, 9, 11, 13, 15, 17, 19, 21] as const;
const durations = [45, 60, 75, 90] as const;
const forwardPath: readonly TripStatus[] = ["assigned", "en_route", "completed"];
const batchSize = 1_000;

async function keepDemoPasswordCurrent(db: Database, userId: string, password: string) {
  const isCredential = and(eq(account.userId, userId), eq(account.providerId, "credential"));
  const credential = await db.query.account.findFirst({ where: isCredential });
  if (credential?.password && (await verifyPassword({ hash: credential.password, password }))) return;
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(account).set({ password: hash }).where(isCredential);
    await tx.delete(session).where(eq(session.userId, userId));
  });
}

async function seedDemoUser(db: Database, demo: SeedOptions["demoUser"]) {
  const existing = await db.query.user.findFirst({ where: eq(user.email, demo.email) });
  if (existing) {
    await keepDemoPasswordCurrent(db, existing.id, demo.password);
    return existing.id;
  }
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, name: "Demo Dispatcher", email: demo.email, emailVerified: true });
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(demo.password),
    });
  });
  return id;
}

function planTrip(random: Random, driver: SeedDriver, day: TimeRange, slotHour: number, target: TripStatus): PlannedTrip {
  const vehicleClass = driver.vehicleClass;
  const fareCents = fareBaseCents[vehicleClass] + Math.floor(random.next() * 24) * 500;
  return {
    values: {
      id: crypto.randomUUID(),
      customerName: fakeCustomer(random),
      pickupAddress: fakeAddress(random),
      dropoffAddress: fakeAddress(random),
      pickupAt: new Date(day.start.getTime() + slotHour * hourMs + Math.floor(random.next() * 2) * 15 * 60_000),
      durationMinutes: random.pick(durations),
      passengers: 1 + Math.floor(random.next() * maxPassengers[vehicleClass]),
      vehicleClass,
      fareCents,
    },
    driverId: driver.id,
    target,
    cancelAfterSteps: Math.floor(random.next() * 3),
  };
}

function pastStatus(random: Random): TripStatus {
  return random.next() < 0.88 ? "completed" : "cancelled";
}

function todayStatus(random: Random, window: TimeRange, now: Date): TripStatus {
  const roll = random.next();
  if (window.end <= now) return roll < 0.9 ? "completed" : "cancelled";
  if (window.start <= now) return "en_route";
  if (roll < 0.3) return "offer";
  return roll < 0.9 ? "assigned" : "cancelled";
}

const minimumPerStatusToday = 3;

function ensureEveryStatus(plans: PlannedTrip[]) {
  for (const status of tripStatuses) {
    let shortBy = minimumPerStatusToday - plans.filter((plan) => plan.target === status).length;
    for (const plan of plans) {
      if (shortBy <= 0) break;
      const donorCount = plans.filter((candidate) => candidate.target === plan.target).length;
      if (plan.target === status || donorCount <= minimumPerStatusToday) continue;
      plan.target = status;
      shortBy -= 1;
    }
  }
}

function planRecentTrips(random: Random, seeded: SeedDriver[], now: Date, timeZone: string): PlannedTrip[] {
  const today = dayRange(now, timeZone);
  const plans: PlannedTrip[] = [];
  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const day = shiftDays(today, -daysAgo, timeZone);
    for (const driver of seeded) {
      for (const hour of slotHours) {
        if (random.next() < 0.28) plans.push(planTrip(random, driver, day, hour, pastStatus(random)));
      }
    }
  }
  return [...plans, ...planDay(random, seeded.filter((driver) => driver.onDuty), today, now)];
}

function planDay(random: Random, seeded: SeedDriver[], day: TimeRange, now: Date): PlannedTrip[] {
  const plans: PlannedTrip[] = [];
  for (const driver of seeded) {
    for (const hour of slotHours) {
      if (random.next() >= 0.45) continue;
      const plan = planTrip(random, driver, day, hour, "offer");
      plan.target = todayStatus(random, tripWindow(plan.values.pickupAt, plan.values.durationMinutes), now);
      plans.push(plan);
    }
  }
  ensureEveryStatus(plans);
  return plans;
}

function planLoadTrips(random: Random, seeded: SeedDriver[], count: number, now: Date, timeZone: string) {
  const today = dayRange(now, timeZone);
  const plans: PlannedTrip[] = [];
  for (let daysAgo = 1; plans.length < count; daysAgo++) {
    const day = shiftDays(today, -daysAgo, timeZone);
    for (const driver of seeded) {
      for (const hour of slotHours) {
        if (plans.length < count) plans.push(planTrip(random, driver, day, hour, pastStatus(random)));
      }
    }
  }
  return plans;
}

function pathTo(plan: PlannedTrip): readonly TripStatus[] {
  if (plan.target === "cancelled") return [...forwardPath.slice(0, plan.cancelAfterSteps), "cancelled"];
  return forwardPath.slice(0, forwardPath.indexOf(plan.target) + 1);
}

async function writeTrips(db: Database, plans: PlannedTrip[], actorId: string, random: Random) {
  for (let offset = 0; offset < plans.length; offset += batchSize) {
    const batch = plans.slice(offset, offset + batchSize);
    await db.transaction(async (tx) => {
      await insertOffers(tx, actorId, batch.map((plan) => plan.values));
      const states = new Map<string, TripState>(
        batch.map((plan) => [plan.values.id, { status: "offer", driverId: null, cancelReason: null }]),
      );
      for (let step = 0; step < forwardPath.length; step++) {
        const moves = batch.flatMap((plan) => {
          const to = pathTo(plan)[step];
          const state = states.get(plan.values.id);
          if (!to || !state) return [];
          const moved = transitionTrip(state, { to, actorId, driverId: plan.driverId, reason: random.pick(cancelReasons) });
          states.set(plan.values.id, moved.trip);
          return [{ tripId: plan.values.id, ...moved }];
        });
        await applyTransitions(tx, moves);
      }
    });
  }
}

const stillOpen: readonly TripStatus[] = ["offer", ...activeStatuses];

async function closeOutBefore(db: Database, start: Date, actorId: string) {
  const stale = await db
    .select({ id: trips.id, status: trips.status, driverId: trips.driverId, cancelReason: trips.cancelReason })
    .from(trips)
    .where(and(lt(trips.pickupAt, start), inArray(trips.status, [...stillOpen])));
  await db.transaction(async (tx) => {
    const states = new Map<string, TripState>(stale.map(({ id, ...state }) => [id, state]));
    for (let step = 0; ; step++) {
      const moves = stale.flatMap((trip) => {
        const to = closeOutPath(trip.status)[step];
        const state = states.get(trip.id);
        if (!to || !state) return [];
        const moved = transitionTrip(state, { to, actorId, reason: unassignedAtPickup });
        states.set(trip.id, moved.trip);
        return [{ tripId: trip.id, ...moved }];
      });
      if (moves.length === 0) break;
      await applyTransitions(tx, moves);
    }
  });
  return stale.length;
}

export async function rollDemoDayForward(db: Database, options: { actorId: string; now: Date; timeZone: string }) {
  const today = dayRange(options.now, options.timeZone);
  const closed = await closeOutBefore(db, today.start, options.actorId);
  if ((await db.$count(trips, and(gte(trips.pickupAt, today.start), lt(trips.pickupAt, today.end)))) > 0) {
    return { closed, added: 0 };
  }
  const onDuty = await db
    .select({ id: drivers.id, vehicleClass: drivers.vehicleClass, onDuty: drivers.onDuty })
    .from(drivers)
    .where(eq(drivers.onDuty, true))
    .orderBy(asc(drivers.name));
  const random = createRandom(daySeed(today.start));
  const plans = planDay(random, onDuty, today, options.now);
  await writeTrips(db, plans, options.actorId, random);
  return { closed, added: plans.length };
}

export async function seed(db: Database, options: SeedOptions) {
  const random = createRandom(20261011);
  const demoUserId = await seedDemoUser(db, options.demoUser);
  if ((await db.$count(drivers)) > 0) {
    const rolled = await rollDemoDayForward(db, { actorId: demoUserId, now: options.now, timeZone: options.timeZone });
    return { demoUserId, trips: rolled.added };
  }

  const insertedDrivers = await db
    .insert(drivers)
    .values(seedDrivers.map((driver, index) => ({ ...driver, phone: fakePhone(index) })))
    .returning({ id: drivers.id, vehicleClass: drivers.vehicleClass, onDuty: drivers.onDuty });
  await db.insert(vehicles).values(
    seedVehicles.map((vehicle, index) => ({
      ...vehicle,
      unitNumber: `DL-${String(101 + index)}`,
      plate: `DSP ${String(4100 + index * 7)}`,
    })),
  );

  const plans = planRecentTrips(random, insertedDrivers, options.now, options.timeZone);
  await writeTrips(db, plans, demoUserId, random);

  const loadTrips = options.loadTrips ?? 0;
  if (loadTrips > 0) {
    const loadDrivers = await db
      .insert(drivers)
      .values(
        Array.from({ length: 60 }, (_, index) => ({
          name: fakeLoadDriverName(index),
          phone: fakePhone(index + seedDrivers.length),
          vehicleClass: inTurn(seedDrivers, index).vehicleClass,
          onDuty: false,
        })),
      )
      .returning({ id: drivers.id, vehicleClass: drivers.vehicleClass, onDuty: drivers.onDuty });
    await writeTrips(db, planLoadTrips(random, loadDrivers, loadTrips, options.now, options.timeZone), demoUserId, random);
  }

  return { demoUserId, trips: plans.length + loadTrips };
}
