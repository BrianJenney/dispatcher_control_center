import { z } from "zod";
import { vehicleClasses } from "@/domain/fleet";
import { tripStatuses } from "@/domain/trip-status";

export const tripRow = z.object({
  id: z.uuid(),
  reference: z.number().int(),
  customerName: z.string(),
  pickupAddress: z.string(),
  dropoffAddress: z.string(),
  pickupAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.number().int(),
  passengers: z.number().int(),
  vehicleClass: z.enum(vehicleClasses),
  fareCents: z.number().int(),
  status: z.enum(tripStatuses),
  driver: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  cancelReason: z.string().nullable(),
});

export type TripRow = z.infer<typeof tripRow>;

export type TripPatch = Pick<TripRow, "id" | "status"> & Partial<Pick<TripRow, "driver" | "cancelReason">>;

export function patchTrip(row: TripRow, patch: TripPatch): TripRow {
  return row.id === patch.id ? { ...row, ...patch } : row;
}

export function patchTrips(rows: readonly TripRow[], patch: TripPatch): TripRow[] {
  return rows.map((row) => patchTrip(row, patch));
}

export function byPickupTime(a: TripRow, b: TripRow): number {
  return a.pickupAt.localeCompare(b.pickupAt) || a.reference - b.reference;
}
