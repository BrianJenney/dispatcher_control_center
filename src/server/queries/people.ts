import { and, asc, count, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, drivers, trips, vehicles } from "@/db/schema";
import { tripsTodayByDriver } from "@/domain/kpis";
import type { DriverProfile, DriverRow, VehicleProfile, VehicleRow } from "@/domain/people";
import { dayRange } from "@/domain/time";
import { recordId } from "@/domain/result";
import { contentTypeOfKey, uploadIdOf, type DocumentRow } from "@/domain/uploads";
import { env } from "@/env";
import { defineQuery } from "@/server/query";

async function documentCounts(kind: "driver_license" | "vehicle_registration") {
  const owner = kind === "driver_license" ? documents.driverId : documents.vehicleId;
  const rows = await db.select({ ownerId: owner, total: count() }).from(documents).where(eq(documents.kind, kind)).groupBy(owner);
  return new Map(rows.flatMap((row) => (row.ownerId ? [[row.ownerId, row.total] as const] : [])));
}

export const getDrivers = defineQuery("signed-in", async (): Promise<{ drivers: DriverRow[] }> => {
  const today = dayRange(new Date(), env.APP_TIMEZONE);
  const [driverRows, todaysTrips, licenses] = await Promise.all([
    db.select().from(drivers).orderBy(asc(drivers.name)),
    db
      .select({ status: trips.status, fareCents: trips.fareCents, pickupAt: trips.pickupAt, driverId: trips.driverId })
      .from(trips)
      .where(and(gte(trips.pickupAt, today.start), lt(trips.pickupAt, today.end))),
    documentCounts("driver_license"),
  ]);
  const tripCounts = tripsTodayByDriver(todaysTrips, today);
  return {
    drivers: driverRows.map((driver) => ({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicleClass: driver.vehicleClass,
      onDuty: driver.onDuty,
      photoVersion: uploadIdOf(driver.photoKey),
      tripsToday: tripCounts.get(driver.id) ?? 0,
      licenses: licenses.get(driver.id) ?? 0,
    })),
  };
});

export const getFleet = defineQuery("signed-in", async (): Promise<{ vehicles: VehicleRow[] }> => {
  const [vehicleRows, registrations] = await Promise.all([
    db.select().from(vehicles).orderBy(asc(vehicles.unitNumber)),
    documentCounts("vehicle_registration"),
  ]);
  return {
    vehicles: vehicleRows.map((vehicle) => ({
      id: vehicle.id,
      model: vehicle.model,
      unitNumber: vehicle.unitNumber,
      plate: vehicle.plate,
      vehicleClass: vehicle.vehicleClass,
      status: vehicle.status,
      photoVersion: uploadIdOf(vehicle.photoKey),
      registrations: registrations.get(vehicle.id) ?? 0,
    })),
  };
});

function toDocumentRows(rows: (typeof documents.$inferSelect)[]): DocumentRow[] {
  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.createdAt.toISOString(),
  }));
}

export const getDriverProfile = defineQuery("signed-in", async (id: unknown): Promise<DriverProfile | null> => {
  const driverId = recordId(id);
  if (!driverId) return null;
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.id, driverId) });
  if (!driver) return null;
  const licenses = await db.query.documents.findMany({
    where: eq(documents.driverId, driverId),
    orderBy: asc(documents.createdAt),
  });
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    vehicleClass: driver.vehicleClass,
    onDuty: driver.onDuty,
    photoVersion: uploadIdOf(driver.photoKey),
    documents: toDocumentRows(licenses),
  };
});

export const getVehicleProfile = defineQuery("signed-in", async (id: unknown): Promise<VehicleProfile | null> => {
  const vehicleId = recordId(id);
  if (!vehicleId) return null;
  const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId) });
  if (!vehicle) return null;
  const registrations = await db.query.documents.findMany({
    where: eq(documents.vehicleId, vehicleId),
    orderBy: asc(documents.createdAt),
  });
  return {
    id: vehicle.id,
    model: vehicle.model,
    unitNumber: vehicle.unitNumber,
    plate: vehicle.plate,
    vehicleClass: vehicle.vehicleClass,
    status: vehicle.status,
    photoVersion: uploadIdOf(vehicle.photoKey),
    documents: toDocumentRows(registrations),
  };
});

export const getDocumentFile = defineQuery("signed-in", async (id: unknown) => {
  const documentId = recordId(id);
  if (!documentId) return null;
  const document = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
  return document ? { key: document.storageKey, fileName: document.fileName, contentType: document.contentType } : null;
});

function photoFile(photoKey: string | null | undefined, fallbackName: string) {
  if (!photoKey) return null;
  return { key: photoKey, fileName: photoKey.split("/").at(-1) ?? fallbackName, contentType: contentTypeOfKey(photoKey) };
}

export const getDriverPhoto = defineQuery("signed-in", async (id: unknown) => {
  const driverId = recordId(id);
  if (!driverId) return null;
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.id, driverId), columns: { photoKey: true, name: true } });
  return driver ? photoFile(driver.photoKey, driver.name) : null;
});

export const getVehiclePhoto = defineQuery("signed-in", async (id: unknown) => {
  const vehicleId = recordId(id);
  if (!vehicleId) return null;
  const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId), columns: { photoKey: true, unitNumber: true } });
  return vehicle ? photoFile(vehicle.photoKey, vehicle.unitNumber) : null;
});
