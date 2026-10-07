import { describe, expect, it } from "vitest";
import { createRandom, fakePhone, seedDrivers, seedVehicles } from "@/db/seed-data";

describe("seed data is fake", () => {
  it("uses only phone numbers reserved for fiction", () => {
    for (let index = 0; index < 200; index++) {
      expect(fakePhone(index)).toMatch(/^\(\d{3}\) 555-01\d{2}$/);
    }
  });

  it("covers every vehicle class with drivers and vehicles", () => {
    const driverClasses = new Set(seedDrivers.map((driver) => driver.vehicleClass));
    const vehicleClasses = new Set(seedVehicles.map((vehicle) => vehicle.vehicleClass));
    expect(driverClasses).toEqual(vehicleClasses);
    expect(driverClasses.size).toBe(4);
  });

  it("is repeatable from the same seed", () => {
    const first = createRandom(7);
    const second = createRandom(7);
    expect(Array.from({ length: 5 }, first.next)).toEqual(Array.from({ length: 5 }, second.next));
  });
});
