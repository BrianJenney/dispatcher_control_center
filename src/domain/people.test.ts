import { describe, expect, it } from "vitest";
import {
  driverInput,
  vehicleInput,
  withDriverOnDuty,
  withVehicleStatus,
  type DriverProfile,
  type DriverRow,
  type VehicleProfile,
  type VehicleRow,
} from "@/domain/people";

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

describe("optimistic patches reach both the list and the detail page", () => {
  const first = "00000000-0000-4000-8000-000000000001";
  const second = "00000000-0000-4000-8000-000000000002";
  const driver: DriverRow = {
    id: first,
    name: "Ava",
    phone: "1",
    vehicleClass: "luxury_sedan",
    onDuty: false,
    photoVersion: null,
    tripsToday: 2,
    licenses: 1,
  };
  const profile: DriverProfile = { id: first, name: "Ava", phone: "1", vehicleClass: "luxury_sedan", onDuty: false, photoVersion: null, documents: [] };

  it("puts one driver on duty in the list and leaves the others alone", () => {
    const list = { drivers: [driver, { ...driver, id: second, name: "Ben" }] };
    expect(withDriverOnDuty(list, first, true)).toEqual({ drivers: [{ ...driver, onDuty: true }, { ...driver, id: second, name: "Ben" }] });
  });

  it("puts the driver on duty on their own profile and ignores other profiles", () => {
    expect(withDriverOnDuty(profile, first, true)).toEqual({ ...profile, onDuty: true });
    expect(withDriverOnDuty(profile, second, true)).toBe(profile);
  });

  const vehicle: VehicleRow = { id: first, model: "BMW", unitNumber: "DL-1", plate: "A", vehicleClass: "luxury_sedan", status: "ready", photoVersion: null, registrations: 0 };
  const details: VehicleProfile = { id: first, model: "BMW", unitNumber: "DL-1", plate: "A", vehicleClass: "luxury_sedan", status: "ready", photoVersion: null, documents: [] };

  it("sends one vehicle to service in the list and leaves the others alone", () => {
    const list = { vehicles: [vehicle, { ...vehicle, id: second }] };
    expect(withVehicleStatus(list, first, "in_service")).toEqual({ vehicles: [{ ...vehicle, status: "in_service" }, { ...vehicle, id: second }] });
  });

  it("sends the vehicle to service on its own page and ignores other vehicles", () => {
    expect(withVehicleStatus(details, first, "in_service")).toEqual({ ...details, status: "in_service" });
    expect(withVehicleStatus(details, second, "in_service")).toBe(details);
  });
});
