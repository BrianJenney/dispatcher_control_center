import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { drivers, vehicles } from "@/db/schema";
import { createDriver, createVehicle, setDriverDuty, setVehicleStatus, updateDriver } from "@/server/actions/people";
import { demoUserId, forceStatus, insertDriver, insertOffer } from "./database";
import { signInAsDemoUser } from "./session";

beforeEach(async () => {
  await signInAsDemoUser();
});

describe("drivers and vehicles", () => {
  it("adds a driver on duty when the switch is on, and off duty otherwise", async () => {
    const details = { name: "Fresh Driver", phone: "(555) 555-0177", vehicleClass: "luxury_sedan" } as const;
    const onDuty = await createDriver({ ...details, onDuty: "on" });
    const offDuty = await createDriver(details);
    if (!onDuty.ok || !offDuty.ok) throw new Error("Adding a driver failed.");
    expect((await db.query.drivers.findFirst({ where: eq(drivers.id, onDuty.data.id) }))?.onDuty).toBe(true);
    expect((await db.query.drivers.findFirst({ where: eq(drivers.id, offDuty.data.id) }))?.onDuty).toBe(false);
  });

  it("toggles a driver's duty", async () => {
    const driverId = await insertDriver();
    expect(await setDriverDuty({ driverId, onDuty: false })).toEqual({ ok: true, data: { onDuty: false } });
    expect((await db.query.drivers.findFirst({ where: eq(drivers.id, driverId) }))?.onDuty).toBe(false);
  });

  it("refuses to change the class of a driver holding an assigned trip", async () => {
    const driverId = await insertDriver("luxury_sedan");
    const actorId = await demoUserId();
    await forceStatus(await insertOffer(actorId), actorId, { from: "offer", to: "assigned", driverId });
    const result = await updateDriver({ driverId, name: "Test Driver", phone: "(555) 555-0100", vehicleClass: "executive_suv" });
    expect(result).toMatchObject({
      ok: false,
      message: "Test Driver has 1 trip in a Luxury sedan that is assigned or under way. Reassign or finish it before changing the class.",
    });
    expect((await db.query.drivers.findFirst({ where: eq(drivers.id, driverId) }))?.vehicleClass).toBe("luxury_sedan");
  });

  it("still edits a driver holding an assigned trip when the class stays the same", async () => {
    const driverId = await insertDriver("luxury_sedan");
    const actorId = await demoUserId();
    await forceStatus(await insertOffer(actorId), actorId, { from: "offer", to: "assigned", driverId });
    expect(await updateDriver({ driverId, name: "Renamed Driver", phone: "(555) 555-0100", vehicleClass: "luxury_sedan" })).toEqual({
      ok: true,
      data: { id: driverId, name: "Renamed Driver" },
    });
  });

  it("changes the class of a driver with no active trips", async () => {
    const driverId = await insertDriver("luxury_sedan");
    expect((await updateDriver({ driverId, name: "Test Driver", phone: "(555) 555-0100", vehicleClass: "executive_van" })).ok).toBe(true);
    expect((await db.query.drivers.findFirst({ where: eq(drivers.id, driverId) }))?.vehicleClass).toBe("executive_van");
  });

  it("explains a duplicate fleet number", async () => {
    const first = await createVehicle({ model: "BMW 740i", unitNumber: "IT-1", plate: "IT 0001", vehicleClass: "luxury_sedan" });
    expect(first.ok).toBe(true);
    const second = await createVehicle({ model: "BMW 740i", unitNumber: "IT-1", plate: "IT 0002", vehicleClass: "luxury_sedan" });
    expect(second).toMatchObject({ ok: false, message: "Another vehicle already uses that unit number." });
  });

  it("puts a vehicle in service and back", async () => {
    const created = await createVehicle({ model: "Lincoln Navigator", unitNumber: "IT-2", plate: "IT 0003", vehicleClass: "executive_suv" });
    if (!created.ok) throw new Error(created.message);
    await setVehicleStatus({ vehicleId: created.data.id, status: "in_service" });
    expect((await db.query.vehicles.findFirst({ where: eq(vehicles.id, created.data.id) }))?.status).toBe("in_service");
  });
});
