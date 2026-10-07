import { vehicleClassLabels } from "@/domain/fleet";
import { wallTimeOf } from "@/domain/time";
import { centsToDollars } from "@/domain/trip-form";
import type { TripRow } from "@/domain/trip-row";
import { statusLabels } from "@/domain/trip-status";

export const exportLimit = 10_000;

const formulaStarts = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function csvCell(value: string): string {
  const safe = formulaStarts.has(value.charAt(0)) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const header = [
  "Reference",
  "Status",
  "Pickup date",
  "Pickup time",
  "Customer",
  "Pickup address",
  "Dropoff address",
  "Passengers",
  "Vehicle class",
  "Driver",
  "Fare (USD)",
  "Cancel reason",
];

export function tripsToCsv(trips: readonly TripRow[], timeZone: string): string {
  const rows = trips.map((trip) => {
    const pickup = wallTimeOf(new Date(trip.pickupAt), timeZone);
    return [
      String(trip.reference),
      statusLabels[trip.status],
      pickup.date,
      pickup.time,
      trip.customerName,
      trip.pickupAddress,
      trip.dropoffAddress,
      String(trip.passengers),
      vehicleClassLabels[trip.vehicleClass],
      trip.driver?.name ?? "",
      centsToDollars(trip.fareCents),
      trip.cancelReason ?? "",
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
