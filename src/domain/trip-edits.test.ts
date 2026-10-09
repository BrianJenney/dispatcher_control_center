import { describe, expect, it } from "vitest";
import { describeTripEdit, diffTripDetails, tripDetailFields, tripEdit, type TripDetails, type TripEdit } from "@/domain/trip-edits";

const before: TripDetails = {
  customerName: "Arden Ashdown",
  pickupAddress: "Harborview Hotel",
  dropoffAddress: "Regional Airport, Terminal A",
  pickupAt: new Date("2026-10-09T15:30:00.000Z"),
  durationMinutes: 60,
  passengers: 2,
  vehicleClass: "luxury_sedan",
  fareCents: 18_000,
};

const format = { money: (cents: number) => `$${(cents / 100).toFixed(2)}`, moment: (iso: string) => `at ${iso}` };

describe("diffTripDetails", () => {
  it("records nothing when nothing changed", () => {
    expect(diffTripDetails(before, { ...before, pickupAt: new Date(before.pickupAt) })).toEqual([]);
  });

  it("records each changed field with its old and new value", () => {
    const after: TripDetails = {
      customerName: "Bo Brightwater",
      pickupAddress: "1 Alder Court",
      dropoffAddress: "Grand Station",
      pickupAt: new Date("2026-10-09T16:00:00.000Z"),
      durationMinutes: 90,
      passengers: 3,
      vehicleClass: "executive_suv",
      fareCents: 21_000,
    };
    expect(diffTripDetails(before, after)).toEqual([
      { field: "customer_name", from: "Arden Ashdown", to: "Bo Brightwater" },
      { field: "pickup_address", from: "Harborview Hotel", to: "1 Alder Court" },
      { field: "dropoff_address", from: "Regional Airport, Terminal A", to: "Grand Station" },
      { field: "pickup_at", from: "2026-10-09T15:30:00.000Z", to: "2026-10-09T16:00:00.000Z" },
      { field: "duration_minutes", from: 60, to: 90 },
      { field: "passengers", from: 2, to: 3 },
      { field: "vehicle_class", from: "luxury_sedan", to: "executive_suv" },
      { field: "fare_cents", from: 18_000, to: 21_000 },
    ]);
  });

  it("covers every field the database knows", () => {
    const everything = diffTripDetails(before, {
      customerName: "x",
      pickupAddress: "x",
      dropoffAddress: "x",
      pickupAt: new Date(0),
      durationMinutes: 1,
      passengers: 1,
      vehicleClass: "group_suv",
      fareCents: 1,
    });
    expect(everything.map((edit) => edit.field)).toEqual(tripDetailFields);
  });

  it("records only the fare when only the fare changed", () => {
    expect(diffTripDetails(before, { ...before, fareCents: 21_000 })).toEqual([
      { field: "fare_cents", from: 18_000, to: 21_000 },
    ]);
  });

  it("produces edits that survive the trip to the browser and back", () => {
    const edits = diffTripDetails(before, { ...before, pickupAt: new Date("2026-10-10T09:00:00.000Z"), passengers: 1 });
    expect(edits.map((edit) => tripEdit.parse(JSON.parse(JSON.stringify(edit))))).toEqual(edits);
  });
});

describe("tripEdit", () => {
  it.each([
    { field: "fare_cents", from: "180", to: "210" },
    { field: "customer_name", from: 1, to: 2 },
    { field: "pickup_at", from: "yesterday", to: "today" },
    { field: "vehicle_class", from: "luxury_sedan", to: "bus" },
    { field: "colour", from: "red", to: "blue" },
  ])("refuses a value of the wrong kind for $field", (edit) => {
    expect(tripEdit.safeParse(edit).success).toBe(false);
  });
});

describe("describeTripEdit", () => {
  it.each<[TripEdit, string]>([
    [{ field: "fare_cents", from: 18_000, to: 21_000 }, "changed the fare on trip #1042 from $180.00 to $210.00"],
    [{ field: "passengers", from: 2, to: 3 }, "changed the passenger count on trip #1042 from 2 to 3"],
    [{ field: "duration_minutes", from: 45, to: 90 }, "changed the duration on trip #1042 from 45 minutes to 1.5 hours"],
    [
      { field: "vehicle_class", from: "luxury_sedan", to: "executive_suv" },
      "changed the vehicle class on trip #1042 from Luxury sedan to Executive SUV",
    ],
    [
      { field: "pickup_at", from: "2026-10-09T15:30:00.000Z", to: "2026-10-09T16:00:00.000Z" },
      "changed the pickup time on trip #1042 from at 2026-10-09T15:30:00.000Z to at 2026-10-09T16:00:00.000Z",
    ],
    [{ field: "customer_name", from: "Arden", to: "Bo" }, "changed the customer on trip #1042 from “Arden” to “Bo”"],
    [
      { field: "pickup_address", from: "Harborview Hotel", to: "1 Alder Court" },
      "changed the pickup address on trip #1042 from “Harborview Hotel” to “1 Alder Court”",
    ],
    [
      { field: "dropoff_address", from: "Terminal A", to: "Terminal B" },
      "changed the drop off address on trip #1042 from “Terminal A” to “Terminal B”",
    ],
  ])("describes %j", (edit, expected) => {
    expect(describeTripEdit(edit, "trip #1042", format)).toBe(expected);
  });
});
