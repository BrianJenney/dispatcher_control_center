import { describe, expect, it } from "vitest";
import { driverInput, vehicleInput } from "@/domain/people";

describe("driverInput", () => {
  it("accepts a driver", () => {
    expect(driverInput.parse({ name: " Ines Varga ", phone: "(212) 555-0142", vehicleClass: "executive_suv" })).toEqual({
      name: "Ines Varga",
      phone: "(212) 555-0142",
      vehicleClass: "executive_suv",
    });
  });

  it.each([
    [{ name: "" }, "Enter the driver's name."],
    [{ phone: "call me" }, "Enter a phone number, like (212) 555-0142."],
    [{ vehicleClass: "bike" }, "Choose the class this driver drives."],
  ])("explains %o", (overrides, message) => {
    const result = driverInput.safeParse({ name: "A", phone: "212 555 0142", vehicleClass: "luxury_sedan", ...overrides });
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe("vehicleInput", () => {
  it("upper cases plates and parses twice to the same result", () => {
    const once = vehicleInput.parse({ model: "BMW 740i", unitNumber: "DL-120", plate: "dsp 4200", vehicleClass: "luxury_sedan" });
    expect(once.plate).toBe("DSP 4200");
    expect(vehicleInput.parse(once)).toEqual(once);
  });

  it("keeps a colour trimmed and stores a blank or missing one as nothing", () => {
    const vehicle = { model: "BMW", unitNumber: "DL-1", plate: "AB 12", vehicleClass: "luxury_sedan" };
    expect(vehicleInput.parse({ ...vehicle, color: "  Midnight blue " }).color).toBe("Midnight blue");
    expect(vehicleInput.parse({ ...vehicle, color: "   " }).color).toBeNull();
    expect(vehicleInput.parse({ ...vehicle, color: "" }).color).toBeNull();
    expect(vehicleInput.parse(vehicle).color).toBeNull();
  });

  it("refuses a colour over 40 characters in plain language", () => {
    const vehicle = { model: "BMW", unitNumber: "DL-1", plate: "AB 12", vehicleClass: "luxury_sedan" };
    const result = vehicleInput.safeParse({ ...vehicle, color: "x".repeat(41) });
    expect(result.error?.issues[0]?.message).toBe("Keep the colour to 40 characters.");
  });

  it("asks for a fleet number", () => {
    const result = vehicleInput.safeParse({ model: "BMW", unitNumber: "", plate: "AB 12", vehicleClass: "luxury_sedan" });
    expect(result.error?.issues[0]?.message).toBe("Enter the fleet number, like DL-112.");
  });
});

describe("anchored and trimmed fields", () => {
  const base = { name: "A", vehicleClass: "luxury_sedan" };

  it.each(["call 212 555 0142", "212 555 0142 later", "+1 (212) 555-0142 x"])("refuses the phone %j", (phone) => {
    expect(driverInput.safeParse({ ...base, phone }).success).toBe(false);
  });

  it("accepts an international number", () => {
    expect(driverInput.safeParse({ ...base, phone: "+1 (212) 555-0142" }).success).toBe(true);
  });

  it("refuses a model, fleet number or plate that is only spaces", () => {
    const vehicle = { model: "BMW", unitNumber: "DL-1", plate: "AB 12", vehicleClass: "luxury_sedan" };
    expect(vehicleInput.safeParse({ ...vehicle, model: "   " }).success).toBe(false);
    expect(vehicleInput.safeParse({ ...vehicle, unitNumber: "   " }).success).toBe(false);
    expect(vehicleInput.safeParse({ ...vehicle, plate: "    " }).success).toBe(false);
    expect(vehicleInput.parse({ ...vehicle, unitNumber: " DL-1 " }).unitNumber).toBe("DL-1");
  });
});
