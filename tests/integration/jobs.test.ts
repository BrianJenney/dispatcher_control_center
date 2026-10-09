import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";
import { db } from "@/db/client";
import { drivers, trips } from "@/db/schema";
import type { tripInput } from "@/domain/trip-form";
import { getJobs, getTripsForExport } from "@/server/queries/jobs";
import { getSuggestions } from "@/server/queries/suggestions";
import { createTrip, moveTrip, reassignDriver, updateTrip } from "@/server/actions/trips";
import { insertDriver } from "./database";
import { signInAsDemoUser, signOut } from "./session";

const form: z.input<typeof tripInput> = {
  customerName: "Integration Guest",
  pickupAddress: "Harborview Hotel",
  dropoffAddress: "Regional Airport, Terminal A",
  pickupDate: "2031-03-04",
  pickupTime: "09:30",
  durationMinutes: "60",
  passengers: "2",
  vehicleClass: "group_suv",
  fare: "240.50",
};

let nextDay = 10;
async function book(overrides: Partial<typeof form> = {}) {
  nextDay += 1;
  const result = await createTrip({ ...form, pickupDate: `2031-03-${String(nextDay)}`, ...overrides });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

let groupDrivers: string[] = [];

beforeAll(async () => {
  groupDrivers = [await insertDriver("group_suv"), await insertDriver("group_suv"), await insertDriver("group_suv")];
});

beforeEach(async () => {
  await signInAsDemoUser();
});

describe("createTrip", () => {
  it("books an offer with the fare in cents and the pickup in the app's time zone", async () => {
    const created = await book({ pickupDate: "2031-03-04" });
    const saved = await db.query.trips.findFirst({ where: eq(trips.id, created.id) });
    expect(saved).toMatchObject({ status: "offer", fareCents: 24_050, passengers: 2, vehicleClass: "group_suv", driverId: null });
    expect(saved?.pickupAt.toISOString()).toBe("2031-03-04T14:30:00.000Z");
  });

  it("returns field errors in plain language", async () => {
    const result = await createTrip({ ...form, fare: "lots", passengers: "9" });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        fare: ["Enter the fare in dollars, like 185 or 185.50."],
        passengers: ["A Group SUV seats up to 6. Choose a larger class or fewer passengers."],
      },
    });
  });
});

describe("assigning", () => {
  it("assigns an on duty driver in the right class", async () => {
    const created = await book();
    const result = await moveTrip({ tripId: created.id, from: "offer", to: "assigned", driverId: groupDrivers[0] });
    expect(result.ok).toBe(true);
  });

  it("refuses a driver in another class", async () => {
    const created = await book();
    const sedanDriver = await insertDriver("luxury_sedan");
    const result = await moveTrip({ tripId: created.id, from: "offer", to: "assigned", driverId: sedanDriver });
    expect(result).toMatchObject({ ok: false, message: "Test Driver drives a Luxury sedan, but this trip needs a Group SUV." });
  });

  it("refuses an off duty driver", async () => {
    const created = await book();
    const offDuty = await insertDriver("group_suv");
    await db.update(drivers).set({ onDuty: false }).where(eq(drivers.id, offDuty));
    const result = await moveTrip({ tripId: created.id, from: "offer", to: "assigned", driverId: offDuty });
    expect(result).toMatchObject({ ok: false, message: "Test Driver is off duty. Choose a driver who is on duty." });
  });

  it("refuses a driver who is busy then, in plain language", async () => {
    const first = await book({ pickupDate: "2031-05-01" });
    const second = await book({ pickupDate: "2031-05-01", pickupTime: "10:00" });
    await moveTrip({ tripId: first.id, from: "offer", to: "assigned", driverId: groupDrivers[1] });
    const result = await moveTrip({ tripId: second.id, from: "offer", to: "assigned", driverId: groupDrivers[1] });
    expect(result).toMatchObject({ ok: false, message: "That driver already has a trip at that time. Choose another driver." });
  });
});

describe("reassignDriver", () => {
  it("moves an assigned trip to another driver", async () => {
    const created = await book();
    await moveTrip({ tripId: created.id, from: "offer", to: "assigned", driverId: groupDrivers[0] });
    expect((await reassignDriver({ tripId: created.id, driverId: groupDrivers[2] ?? "" })).ok).toBe(true);
    const saved = await db.query.trips.findFirst({ where: eq(trips.id, created.id) });
    expect(saved?.driverId).toBe(groupDrivers[2]);
  });

  it("refuses an offer", async () => {
    const created = await book();
    expect(await reassignDriver({ tripId: created.id, driverId: groupDrivers[0] ?? "" })).toMatchObject({
      ok: false,
      message: "Only an assigned trip can move to another driver.",
    });
  });
});

describe("updateTrip", () => {
  it("edits an offer", async () => {
    const created = await book();
    const result = await updateTrip({ ...form, pickupDate: "2031-06-01", tripId: created.id, fare: "99" });
    expect(result.ok).toBe(true);
    expect((await db.query.trips.findFirst({ where: eq(trips.id, created.id) }))?.fareCents).toBe(9_900);
  });

  it("refuses a class the assigned driver cannot drive", async () => {
    const created = await book();
    await moveTrip({ tripId: created.id, from: "offer", to: "assigned", driverId: groupDrivers[2] });
    const result = await updateTrip({ ...form, pickupDate: "2031-06-02", tripId: created.id, vehicleClass: "luxury_sedan", passengers: "1" });
    expect(result).toMatchObject({ ok: false, message: "Test Driver drives a Group SUV. Reassign the trip before changing its class." });
  });

  it("refuses a trip that is under way", async () => {
    const created = await book();
    await moveTrip({ tripId: created.id, from: "offer", to: "assigned", driverId: groupDrivers[0] });
    await moveTrip({ tripId: created.id, from: "assigned", to: "en_route" });
    const result = await updateTrip({ ...form, tripId: created.id });
    expect(result).toMatchObject({ ok: false, message: "This trip is already under way or finished, so it can no longer be edited." });
  });
});

describe("getSuggestions", () => {
  it("offers only free, on duty drivers in the class, fewest trips first", async () => {
    const busy = await book({ pickupDate: "2031-07-01", pickupTime: "09:00" });
    await moveTrip({ tripId: busy.id, from: "offer", to: "assigned", driverId: groupDrivers[0] });
    const open = await book({ pickupDate: "2031-07-01", pickupTime: "09:30" });
    const result = await getSuggestions(open.id);
    const names = result?.suggestions.map((driver) => driver.id) ?? [];
    expect(names).not.toContain(groupDrivers[0]);
    expect(names.length).toBeLessThanOrEqual(3);
    expect(result?.vehicleClass).toBe("group_suv");
  });

  it("returns nothing for a trip that does not exist", async () => {
    expect(await getSuggestions(crypto.randomUUID())).toBeNull();
  });
});

describe("getJobs", () => {
  it("searches customers without treating % as a wildcard", async () => {
    await book({ customerName: "Percent 100% Guest" });
    const found = await getJobs({ q: "100%", status: null, show: 25 });
    expect(found.trips.map((trip) => trip.customerName)).toEqual(["Percent 100% Guest"]);
    expect((await getJobs({ q: "%", status: null, show: 25 })).trips.every((trip) => trip.customerName.includes("%"))).toBe(true);
  });

  it("finds a trip by its number, typed with or without the hash", async () => {
    const booked = await book({ customerName: "Reference Search Guest" });
    const ids = async (q: string, status: "offer" | "completed" | null = null) =>
      (await getJobs({ q, status, show: 25 })).trips.map((trip) => trip.id);
    expect(await ids(`#${String(booked.reference)}`)).toEqual([booked.id]);
    expect(await ids(String(booked.reference))).toEqual([booked.id]);
    expect(await ids(`#${String(booked.reference)}`, "offer")).toEqual([booked.id]);
    expect(await ids(`#${String(booked.reference)}`, "completed")).toEqual([]);
    expect(await ids(String(booked.reference).slice(0, -1))).not.toContain(booked.id);
    expect((await getTripsForExport({ q: `#${String(booked.reference)}`, status: null })).map((trip) => trip.id)).toEqual([booked.id]);
  });

  it("filters by status and pages", async () => {
    const page = await getJobs({ q: "", status: "completed", show: 25 });
    expect(page.trips.every((trip) => trip.status === "completed")).toBe(true);
    expect(page.trips.length).toBe(25);
    expect(page.hasMore).toBe(true);
  });

  it("refuses to read anything without a signed in session", async () => {
    signOut();
    await expect(getJobs({ q: "", status: null, show: 25 })).rejects.toThrow("NEXT_REDIRECT");
    await expect(getSuggestions(crypto.randomUUID())).rejects.toThrow("NEXT_REDIRECT");
  });
});
