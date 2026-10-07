import { and, asc, count, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, drivers, trips, vehicles } from "@/db/schema";
import { tripsTodayByDriver } from "@/domain/kpis";
import type { DriverRow, VehicleRow } from "@/domain/people";
import { dayRange } from "@/domain/time";
import { uploadIdOf, type DocumentRow } from "@/domain/uploads";
import { env } from "@/env";

async function documentCounts(kind: "driver_license" | "vehicle_registration") {
  const owner = kind === "driver_license" ? documents.driverId : documents.vehicleId;
  const rows = await db.select({ ownerId: owner, total: count() }).from(documents).where(eq(documents.kind, kind)).groupBy(owner);
  return new Map(rows.flatMap((row) => (row.ownerId ? [[row.ownerId, row.total] as const] : [])));
}

export async function getDrivers(): Promise<{ drivers: DriverRow[] }> {
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
}

export async function getFleet(): Promise<{ vehicles: VehicleRow[] }> {
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
      registrations: registrations.get(vehicle.id) ?? 0,
    })),
  };
}

function toDocumentRows(rows: (typeof documents.$inferSelect)[]): DocumentRow[] {
  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.createdAt.toISOString(),
  }));
}

export async function getDriverProfile(driverId: string) {
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
}

export async function getVehicleProfile(vehicleId: string) {
  const vehicle = await db.query.vehicles.findFirst({ where: eq(vehicles.id, vehicleId) });
  if (!vehicle) return null;
  const registrations = await db.query.documents.findMany({
    where: eq(documents.vehicleId, vehicleId),
    orderBy: asc(documents.createdAt),
  });
  return { ...vehicle, documents: toDocumentRows(registrations) };
}

export async function getDocumentFile(documentId: string) {
  const document = await db.query.documents.findFirst({ where: eq(documents.id, documentId) });
  return document ? { key: document.storageKey, fileName: document.fileName } : null;
}

export async function getDriverPhoto(driverId: string) {
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.id, driverId), columns: { photoKey: true, name: true } });
  return driver?.photoKey ? { key: driver.photoKey, fileName: `${driver.name}.jpg` } : null;
}
