import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { documents, drivers, vehicles } from "@/db/schema";
import { createVehicle, setDriverDuty, setVehicleStatus, updateDriver } from "@/server/actions/people";
import { deleteDocument, prepareUpload, saveUpload } from "@/server/actions/uploads";
import { storage } from "@/server/storage";
import { demoUserId, forceStatus, insertDriver, insertOffer } from "./database";
import { signInAsDemoUser } from "./session";

beforeEach(async () => {
  await signInAsDemoUser();
});

const pdf = Buffer.from("%PDF-1.4 test license");

async function uploadLicense(driverId: string, body: Buffer = pdf, declaredSize = pdf.length) {
  const request = {
    purpose: "driver_license" as const,
    ownerId: driverId,
    fileName: "license.pdf",
    contentType: "application/pdf",
    sizeBytes: declaredSize,
  };
  const prepared = await prepareUpload(request);
  if (!prepared.ok) throw new Error(prepared.message);
  await fetch(prepared.data.url, { method: "PUT", body: new Uint8Array(body), headers: { "content-type": "application/pdf" } });
  return { request, key: prepared.data.key, saved: await saveUpload({ ...request, key: prepared.data.key }) };
}

describe("uploads", () => {
  it("stores a license and records it", async () => {
    const driverId = await insertDriver();
    const { saved, key } = await uploadLicense(driverId);
    expect(saved.ok).toBe(true);
    const row = await db.query.documents.findFirst({ where: eq(documents.storageKey, key) });
    expect(row).toMatchObject({ kind: "driver_license", driverId, vehicleId: null, sizeBytes: pdf.length });
    expect(await storage.describe(key)).toMatchObject({ sizeBytes: pdf.length });
  });

  it("refuses files over 10 MB before signing anything", async () => {
    const driverId = await insertDriver();
    const result = await prepareUpload({
      purpose: "driver_license",
      ownerId: driverId,
      fileName: "big.pdf",
      contentType: "application/pdf",
      sizeBytes: 10 * 1024 * 1024 + 1,
    });
    expect(result).toMatchObject({ ok: false, fieldErrors: { sizeBytes: ["Files must be 10 MB or smaller."] } });
  });

  it("rejects a file whose stored size differs from what was declared, and removes it", async () => {
    const driverId = await insertDriver();
    const { saved, key } = await uploadLicense(driverId, Buffer.concat([pdf, Buffer.from("extra")]));
    expect(saved).toMatchObject({ ok: false, message: "The file changed while uploading. Try again." });
    expect(await storage.describe(key)).toBeNull();
  });

  it("refuses to record someone else's upload", async () => {
    const owner = await insertDriver();
    const other = await insertDriver();
    const { request, key } = await uploadLicense(owner);
    const result = await saveUpload({ ...request, ownerId: other, key });
    expect(result).toMatchObject({ ok: false, message: "That upload does not belong here." });
  });

  it("reports an upload that never arrived", async () => {
    const driverId = await insertDriver();
    const request = { purpose: "driver_license" as const, ownerId: driverId, fileName: "x.pdf", contentType: "application/pdf", sizeBytes: 10 };
    const prepared = await prepareUpload(request);
    if (!prepared.ok) throw new Error(prepared.message);
    expect(await saveUpload({ ...request, key: prepared.data.key })).toMatchObject({
      ok: false,
      message: "The upload did not finish. Try again.",
    });
  });

  it("deletes the row and the stored file", async () => {
    const driverId = await insertDriver();
    const { key } = await uploadLicense(driverId);
    const row = await db.query.documents.findFirst({ where: eq(documents.storageKey, key) });
    expect(await deleteDocument({ documentId: row?.id ?? "" })).toEqual({ ok: true, data: { fileName: "license.pdf" } });
    expect(await storage.describe(key)).toBeNull();
    expect(await deleteDocument({ documentId: row?.id ?? "" })).toMatchObject({ ok: false, message: "That document was already deleted." });
  });
});

describe("drivers and vehicles", () => {
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
