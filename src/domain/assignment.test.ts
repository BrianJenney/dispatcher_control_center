import { describe, expect, it } from "vitest";
import { assignmentProblem, classChangeProblem, isEditable, reassignTrip, type AssignableDriver } from "@/domain/assignment";
import { tripStatuses } from "@/domain/trip-status";

const ines: AssignableDriver = { id: "d1", name: "Ines Varga", onDuty: true, vehicleClass: "executive_suv" };

describe("assignmentProblem", () => {
  it("accepts an on duty driver in the right class", () => {
    expect(assignmentProblem({ vehicleClass: "executive_suv" }, ines)).toBeNull();
  });

  it("refuses an off duty driver", () => {
    expect(assignmentProblem({ vehicleClass: "executive_suv" }, { ...ines, onDuty: false })).toBe(
      "Ines Varga is off duty. Choose a driver who is on duty.",
    );
  });

  it("refuses the wrong vehicle class, with the right article", () => {
    expect(assignmentProblem({ vehicleClass: "luxury_sedan" }, ines)).toBe(
      "Ines Varga drives an Executive SUV, but this trip needs a Luxury sedan.",
    );
  });
});

describe("classChangeProblem", () => {
  it("allows a new class when the driver holds no active trips", () => {
    expect(classChangeProblem(ines, "luxury_sedan", [])).toBeNull();
  });

  it("allows keeping the class the active trips need", () => {
    expect(classChangeProblem(ines, "executive_suv", ["executive_suv", "executive_suv"])).toBeNull();
  });

  it("refuses to change the class under one active trip", () => {
    expect(classChangeProblem(ines, "luxury_sedan", ["executive_suv"])).toBe(
      "Ines Varga has 1 trip in an Executive SUV that is assigned or under way. Reassign or finish it before changing the class.",
    );
  });

  it("counts every active trip in the old class", () => {
    expect(classChangeProblem({ name: "Bastian Roe" }, "executive_suv", ["luxury_sedan", "luxury_sedan"])).toBe(
      "Bastian Roe has 2 trips in a Luxury sedan that are assigned or under way. Reassign or finish them before changing the class.",
    );
  });

  it("ignores active trips already in the new class", () => {
    expect(classChangeProblem(ines, "luxury_sedan", ["luxury_sedan", "executive_suv"])).toBe(
      "Ines Varga has 1 trip in an Executive SUV that is assigned or under way. Reassign or finish it before changing the class.",
    );
  });
});

describe("isEditable", () => {
  it("allows editing offers and assigned trips only", () => {
    expect(tripStatuses.filter(isEditable)).toEqual(["offer", "assigned"]);
  });
});

describe("reassignTrip", () => {
  const assigned = { status: "assigned" as const, driverId: "d1", cancelReason: null };

  it("moves an assigned trip to another driver and records it", () => {
    expect(reassignTrip(assigned, { driverId: "d2", actorId: "u1" })).toEqual({
      trip: { status: "assigned", driverId: "d2", cancelReason: null },
      event: { fromStatus: "assigned", toStatus: "assigned", fromDriverId: "d1", toDriverId: "d2", actorId: "u1", reason: null },
    });
  });

  it("refuses the driver who already has it", () => {
    expect(() => reassignTrip(assigned, { driverId: "d1", actorId: "u1" })).toThrow("That driver already has this trip.");
  });

  it.each(["offer", "en_route", "completed", "cancelled"] as const)("refuses a trip that is %s", (status) => {
    expect(() => reassignTrip({ ...assigned, status }, { driverId: "d2", actorId: "u1" })).toThrow(
      "Only an assigned trip can move to another driver.",
    );
  });
});
