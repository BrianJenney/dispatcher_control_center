import { describe, expect, it } from "vitest";
import { assignmentProblem, isEditable, reassignTrip, type AssignableDriver } from "@/domain/assignment";
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
      event: { fromStatus: "assigned", toStatus: "assigned", actorId: "u1", reason: "Reassigned to another driver" },
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
