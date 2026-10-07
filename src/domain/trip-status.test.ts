import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/result";
import {
  canTransition,
  isActive,
  isFinal,
  transitionTrip,
  tripMessages,
  tripStatuses,
  type TripState,
  type TripStatus,
} from "@/domain/trip-status";

const legal: [TripStatus, TripStatus][] = [
  ["offer", "assigned"],
  ["offer", "cancelled"],
  ["assigned", "en_route"],
  ["assigned", "cancelled"],
  ["en_route", "completed"],
  ["en_route", "cancelled"],
];

const isLegal = (from: TripStatus, to: TripStatus) => legal.some(([a, b]) => a === from && b === to);

const allPairs = tripStatuses.flatMap((from) => tripStatuses.map((to) => [from, to] as const));
const illegal = allPairs.filter(([from, to]) => !isLegal(from, to));

function tripIn(status: TripStatus): TripState {
  return {
    status,
    driverId: status === "offer" ? null : "driver-1",
    cancelReason: status === "cancelled" ? "Client changed plans" : null,
  };
}

describe("transition table", () => {
  it("has exactly the six moves in the brief", () => {
    expect(allPairs.filter(([from, to]) => canTransition(from, to))).toEqual(legal);
  });

  it.each(legal)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each(illegal)("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("treats completed and cancelled as final", () => {
    expect(tripStatuses.filter(isFinal)).toEqual(["completed", "cancelled"]);
  });

  it("treats assigned and en route as active", () => {
    expect(tripStatuses.filter(isActive)).toEqual(["assigned", "en_route"]);
  });
});

describe("transitionTrip", () => {
  it("assigns a driver and records who did it", () => {
    expect(transitionTrip(tripIn("offer"), { to: "assigned", actorId: "user-1", driverId: "driver-9" })).toEqual({
      trip: { status: "assigned", driverId: "driver-9", cancelReason: null },
      event: { fromStatus: "offer", toStatus: "assigned", actorId: "user-1", reason: null },
    });
  });

  it("refuses to assign without a driver", () => {
    expect(() => transitionTrip(tripIn("offer"), { to: "assigned", actorId: "user-1" })).toThrow(
      "Choose a driver before assigning the trip.",
    );
  });

  it("keeps the driver through en route and completed", () => {
    const enRoute = transitionTrip(tripIn("assigned"), { to: "en_route", actorId: "user-1", driverId: "other" });
    expect(enRoute.trip.driverId).toBe("driver-1");
    const completed = transitionTrip(enRoute.trip, { to: "completed", actorId: "user-1" });
    expect(completed.trip).toEqual({ status: "completed", driverId: "driver-1", cancelReason: null });
  });

  it.each(["offer", "assigned", "en_route"] as const)("cancels from %s with a trimmed reason", (from) => {
    const result = transitionTrip(tripIn(from), { to: "cancelled", actorId: "user-1", reason: "  No show  " });
    expect(result.trip.status).toBe("cancelled");
    expect(result.trip.cancelReason).toBe("No show");
    expect(result.trip.driverId).toBe(tripIn(from).driverId);
    expect(result.event).toEqual({ fromStatus: from, toStatus: "cancelled", actorId: "user-1", reason: "No show" });
  });

  it.each([undefined, "", "   "])("refuses to cancel with reason %j", (reason) => {
    expect(() => transitionTrip(tripIn("offer"), { to: "cancelled", actorId: "user-1", reason })).toThrow(
      "Give a reason for cancelling the trip.",
    );
  });

  it("ignores a reason on moves other than cancel", () => {
    const result = transitionTrip(tripIn("assigned"), { to: "en_route", actorId: "user-1", reason: "Running" });
    expect(result.trip.cancelReason).toBeNull();
    expect(result.event.reason).toBeNull();
  });

  it.each(illegal)("throws a plain-language DomainError for %s -> %s", (from, to) => {
    const attempt = () =>
      transitionTrip(tripIn(from), { to, actorId: "user-1", driverId: "driver-2", reason: "Because" });
    expect(attempt).toThrow(DomainError);
    expect(attempt).toThrow(/^A trip that is [a-z ]+ cannot move to [a-z ]+\.$/);
  });

  it.each(Object.entries(tripMessages))("words the %s message as a plain sentence", (_key, message) => {
    expect(message).toMatch(/^[A-Z][^_]{10,}\.$/);
  });

  it("labels its errors as domain errors", () => {
    expect(new DomainError("Nope").name).toBe("DomainError");
  });

  it("names both statuses in the error", () => {
    expect(() => transitionTrip(tripIn("completed"), { to: "en_route", actorId: "user-1" })).toThrow(
      "A trip that is completed cannot move to en route.",
    );
  });
});
