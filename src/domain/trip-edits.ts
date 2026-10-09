import { z } from "zod";
import { vehicleClasses, vehicleClassLabels, type VehicleClass } from "@/domain/fleet";
import { durationLabel } from "@/domain/trip-form";

export const textDetailFields = ["customer_name", "pickup_address", "dropoff_address"] as const;
export const integerDetailFields = ["duration_minutes", "passengers", "fare_cents"] as const;

export const tripDetailFields = [
  "customer_name",
  "pickup_address",
  "dropoff_address",
  "pickup_at",
  "duration_minutes",
  "passengers",
  "vehicle_class",
  "fare_cents",
] as const;

export type TripDetailField = (typeof tripDetailFields)[number];

export type TripDetails = {
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date;
  durationMinutes: number;
  passengers: number;
  vehicleClass: VehicleClass;
  fareCents: number;
};

export const tripEdit = z.discriminatedUnion("field", [
  z.object({ field: z.enum(textDetailFields), from: z.string(), to: z.string() }),
  z.object({ field: z.enum(integerDetailFields), from: z.number().int(), to: z.number().int() }),
  z.object({
    field: z.literal("pickup_at"),
    from: z.iso.datetime({ offset: true }),
    to: z.iso.datetime({ offset: true }),
  }),
  z.object({ field: z.literal("vehicle_class"), from: z.enum(vehicleClasses), to: z.enum(vehicleClasses) }),
]);

export type TripEdit = z.infer<typeof tripEdit>;

export function diffTripDetails(before: TripDetails, after: TripDetails): TripEdit[] {
  const candidates: TripEdit[] = [
    { field: "customer_name", from: before.customerName, to: after.customerName },
    { field: "pickup_address", from: before.pickupAddress, to: after.pickupAddress },
    { field: "dropoff_address", from: before.dropoffAddress, to: after.dropoffAddress },
    { field: "pickup_at", from: before.pickupAt.toISOString(), to: after.pickupAt.toISOString() },
    { field: "duration_minutes", from: before.durationMinutes, to: after.durationMinutes },
    { field: "passengers", from: before.passengers, to: after.passengers },
    { field: "vehicle_class", from: before.vehicleClass, to: after.vehicleClass },
    { field: "fare_cents", from: before.fareCents, to: after.fareCents },
  ];
  return candidates.filter((edit) => edit.from !== edit.to);
}

export type HistoryFormat = { money: (cents: number) => string; moment: (iso: string) => string };

const fieldNames: Record<TripDetailField, string> = {
  customer_name: "the customer",
  pickup_address: "the pickup address",
  dropoff_address: "the drop off address",
  pickup_at: "the pickup time",
  duration_minutes: "the duration",
  passengers: "the passenger count",
  vehicle_class: "the vehicle class",
  fare_cents: "the fare",
};

function shownValues(edit: TripEdit, format: HistoryFormat): [string, string] {
  switch (edit.field) {
    case "pickup_at":
      return [format.moment(edit.from), format.moment(edit.to)];
    case "fare_cents":
      return [format.money(edit.from), format.money(edit.to)];
    case "duration_minutes":
      return [durationLabel(edit.from), durationLabel(edit.to)];
    case "passengers":
      return [String(edit.from), String(edit.to)];
    case "vehicle_class":
      return [vehicleClassLabels[edit.from], vehicleClassLabels[edit.to]];
    case "customer_name":
    case "pickup_address":
    case "dropoff_address":
      return [`“${edit.from}”`, `“${edit.to}”`];
  }
}

export function describeTripEdit(edit: TripEdit, trip: string, format: HistoryFormat): string {
  const [from, to] = shownValues(edit, format);
  return `changed ${fieldNames[edit.field]} on ${trip} from ${from} to ${to}`;
}
