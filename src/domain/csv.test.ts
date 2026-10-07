import { describe, expect, it } from "vitest";
import { csvCell, tripsToCsv } from "@/domain/csv";
import type { TripRow } from "@/domain/trip-row";

function trip(overrides: Partial<TripRow>): TripRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    reference: 1201,
    customerName: "Parker Jessop",
    pickupAddress: "709 Brookside Way",
    dropoffAddress: "Regional Airport, Terminal B",
    pickupAt: "2026-10-07T19:15:00.000Z",
    durationMinutes: 60,
    passengers: 2,
    vehicleClass: "luxury_sedan",
    fareCents: 10_500,
    status: "assigned",
    driver: { id: "11111111-1111-4111-8111-111111111111", name: "Desmond Whitlock" },
    cancelReason: null,
    ...overrides,
  };
}

describe("csvCell", () => {
  it("leaves plain text alone", () => {
    expect(csvCell("Parker Jessop")).toBe("Parker Jessop");
  });

  it("quotes cells with commas, quotes and line breaks, doubling inner quotes", () => {
    expect(csvCell("Terminal B, Gate 4")).toBe('"Terminal B, Gate 4"');
    expect(csvCell('The "Grand" Hotel')).toBe('"The ""Grand"" Hotel"');
    expect(csvCell("Line one\nLine two")).toBe('"Line one\nLine two"');
    expect(csvCell("Line one\rLine two")).toBe('"Line one\rLine two"');
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tcmd", "\rcmd"])("neutralises a spreadsheet formula starting %j", (value) => {
    expect(csvCell(value).replaceAll('"', "")).toContain(`'${value}`);
  });

  it("does not touch an equals sign that is not at the start", () => {
    expect(csvCell("a=b")).toBe("a=b");
  });
});

describe("tripsToCsv", () => {
  it("starts with a header row and ends with a line break", () => {
    const csv = tripsToCsv([], "America/New_York");
    expect(csv).toBe(
      "Reference,Status,Pickup date,Pickup time,Customer,Pickup address,Dropoff address,Passengers,Vehicle class,Driver,Fare (USD),Cancel reason\r\n",
    );
  });

  it("writes one row per trip using local time, labels and dollars", () => {
    const [, row] = tripsToCsv([trip({})], "America/New_York").trimEnd().split("\r\n");
    expect(row).toBe(
      '1201,Assigned,2026-10-07,15:15,Parker Jessop,709 Brookside Way,"Regional Airport, Terminal B",2,Luxury sedan,Desmond Whitlock,105,',
    );
  });

  it("shows cents, an empty driver and the cancel reason", () => {
    const [, row] = tripsToCsv(
      [trip({ status: "cancelled", driver: null, fareCents: 12_550, cancelReason: "Client called, then texted" })],
      "America/New_York",
    )
      .trimEnd()
      .split("\r\n");
    expect(row).toBe(
      '1201,Cancelled,2026-10-07,15:15,Parker Jessop,709 Brookside Way,"Regional Airport, Terminal B",2,Luxury sedan,,125.50,"Client called, then texted"',
    );
  });

  it("follows the time zone it is given", () => {
    const [, row] = tripsToCsv([trip({ pickupAt: "2026-10-08T03:30:00.000Z" })], "America/Los_Angeles").split("\r\n");
    expect(row?.startsWith("1201,Assigned,2026-10-07,20:30,")).toBe(true);
  });
});
