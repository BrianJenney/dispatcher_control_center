import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents, tripInput } from "@/domain/trip-form";

const valid = {
  customerName: " Arden Ashdown ",
  pickupAddress: "Harborview Hotel",
  dropoffAddress: "Regional Airport, Terminal A",
  pickupDate: "2026-10-08",
  pickupTime: "15:30",
  durationMinutes: "60",
  passengers: "2",
  vehicleClass: "luxury_sedan",
  fare: "185.50",
};

function messageFor(field: string, overrides: Record<string, string>) {
  const result = tripInput.safeParse({ ...valid, ...overrides });
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("tripInput", () => {
  it("accepts form values as typed", () => {
    expect(tripInput.parse(valid)).toEqual({ ...valid, customerName: "Arden Ashdown", durationMinutes: 60, passengers: 2 });
  });

  it("gives the same result when parsed twice, as the client and server both do", () => {
    const once = tripInput.parse(valid);
    expect(tripInput.parse(once)).toEqual(once);
  });

  it.each([
    ["customerName", { customerName: "  " }, "Enter the customer's name."],
    ["pickupAddress", { pickupAddress: "" }, "Enter where to pick the customer up."],
    ["dropoffAddress", { dropoffAddress: "" }, "Enter where the trip ends."],
    ["pickupDate", { pickupDate: "" }, "Choose the pickup date."],
    ["pickupTime", { pickupTime: "25:00" }, "Choose the pickup time."],
    ["durationMinutes", { durationMinutes: "50" }, "Choose how long the trip takes."],
    ["passengers", { passengers: "0" }, "At least one passenger rides."],
    ["passengers", { passengers: "1.5" }, "Enter a whole number of passengers."],
    ["vehicleClass", { vehicleClass: "bus" }, "Choose a vehicle class."],
    ["fare", { fare: "$185" }, "Enter the fare in dollars, like 185 or 185.50."],
    ["fare", { fare: "185.555" }, "Enter the fare in dollars, like 185 or 185.50."],
  ])("explains a bad %s in plain language", (field, overrides, message) => {
    expect(messageFor(field, overrides)).toBe(message);
  });

  it("checks passengers against the vehicle's seats", () => {
    expect(messageFor("passengers", { passengers: "4" })).toBe(
      "A Luxury sedan seats up to 3. Choose a larger class or fewer passengers.",
    );
    expect(messageFor("passengers", { passengers: "12", vehicleClass: "executive_van" })).toBeUndefined();
  });
});

describe("money", () => {
  it.each([
    ["185", 18_500],
    ["185.5", 18_550],
    ["185.05", 18_505],
    ["0", 0],
  ])("reads $%s as %i cents", (amount, cents) => {
    expect(dollarsToCents(amount)).toBe(cents);
  });

  it.each([
    [18_500, "185"],
    [18_550, "185.50"],
    [18_505, "185.05"],
  ])("writes %i cents back as %s", (cents, amount) => {
    expect(centsToDollars(cents)).toBe(amount);
  });
});
