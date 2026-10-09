import { z } from "zod";
import { withArticle } from "@/domain/assignment";
import { maxPassengers, mostSeatsInAnyClass, vehicleClasses, vehicleClassLabels } from "@/domain/fleet";

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const dollars = /^\d{1,5}(\.\d{1,2})?$/;

export const durationOptions = [30, 45, 60, 90, 120, 180, 240, 360, 480] as const;

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${String(minutes)} minutes`;
  return `${String(minutes / 60)} ${minutes === 60 ? "hour" : "hours"}`;
}

const tripFields = z.object({
    customerName: z.string().trim().min(1, "Enter the customer's name.").max(120, "Keep the name to 120 characters."),
    pickupAddress: z.string().trim().min(1, "Enter where to pick the customer up.").max(200, "Keep the address to 200 characters."),
    dropoffAddress: z.string().trim().min(1, "Enter where the trip ends.").max(200, "Keep the address to 200 characters."),
    pickupDate: z.iso.date("Choose the pickup date."),
    pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose the pickup time."),
    durationMinutes: z.coerce
      .number()
      .int()
      .refine((minutes) => durationOptions.some((option) => option === minutes), "Choose how long the trip takes."),
    passengers: z.coerce
      .number("Enter how many passengers are riding.")
      .int("Enter a whole number of passengers.")
      .min(1, "At least one passenger rides.")
      .max(mostSeatsInAnyClass, `No vehicle seats more than ${String(mostSeatsInAnyClass)} passengers.`),
    vehicleClass: z.enum(vehicleClasses, "Choose a vehicle class."),
    fare: z.string().trim().regex(dollars, "Enter the fare in dollars, like 185 or 185.50."),
});

type TripFields = z.output<typeof tripFields>;

function seatsCheck(trip: TripFields, context: z.RefinementCtx) {
  const seats = maxPassengers[trip.vehicleClass];
  if (trip.passengers > seats) {
    context.addIssue({
      code: "custom",
      path: ["passengers"],
      message: `${capitalized(withArticle(vehicleClassLabels[trip.vehicleClass]))} seats up to ${String(seats)}. Choose a larger class or fewer passengers.`,
    });
  }
}

export const tripInput = tripFields.superRefine(seatsCheck);

export const updateTripInput = tripFields.extend({ tripId: z.uuid() }).superRefine(seatsCheck);

export type TripInput = z.output<typeof tripInput>;

export function dollarsToCents(amount: string): number {
  const [whole = "0", fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function centsToDollars(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = cents % 100;
  return fraction === 0 ? String(whole) : `${String(whole)}.${String(fraction).padStart(2, "0")}`;
}
