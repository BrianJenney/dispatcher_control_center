import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { trips } from "@/db/schema";
import { centsToDollars } from "@/domain/trip-form";
import { wallTimeOf } from "@/domain/time";
import type { TripStatus } from "@/domain/trip-status";
import { env } from "@/env";

export type TripEditorValues = {
  tripId: string;
  reference: number;
  status: TripStatus;
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  durationMinutes: number;
  passengers: number;
  vehicleClass: (typeof trips.$inferSelect)["vehicleClass"];
  fare: string;
};

export async function getTripForEditing(tripId: string): Promise<TripEditorValues | null> {
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip) return null;
  const { date, time } = wallTimeOf(trip.pickupAt, env.APP_TIMEZONE);
  return {
    tripId: trip.id,
    reference: trip.reference,
    status: trip.status,
    customerName: trip.customerName,
    pickupAddress: trip.pickupAddress,
    dropoffAddress: trip.dropoffAddress,
    pickupDate: date,
    pickupTime: time,
    durationMinutes: trip.durationMinutes,
    passengers: trip.passengers,
    vehicleClass: trip.vehicleClass,
    fare: centsToDollars(trip.fareCents),
  };
}

export function defaultTripValues(): Omit<TripEditorValues, "tripId" | "reference" | "status"> {
  const inAnHour = new Date(Math.ceil((Date.now() + 60 * 60_000) / (15 * 60_000)) * 15 * 60_000);
  const { date, time } = wallTimeOf(inAnHour, env.APP_TIMEZONE);
  return {
    customerName: "",
    pickupAddress: "",
    dropoffAddress: "",
    pickupDate: date,
    pickupTime: time,
    durationMinutes: 60,
    passengers: 1,
    vehicleClass: "luxury_sedan",
    fare: "",
  };
}
