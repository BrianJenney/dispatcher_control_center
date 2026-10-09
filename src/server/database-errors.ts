import { tripMessages } from "@/domain/trip-status";
import { uploadMessages } from "@/domain/uploads";

const messages: Record<string, string> = {
  trips_no_overlapping_driver_trips: "That driver already has a trip at that time. Choose another driver.",
  trips_status_transition: tripMessages.changedElsewhere,
  trips_driver_matches_status: tripMessages.driverRequired,
  trips_cancel_reason_matches_status: tripMessages.cancelReasonRequired,
  trips_driver_class_matches: "That driver drives a different vehicle class than this trip needs. Choose a driver in the right class.",
  drivers_class_matches_active_trips: "This driver still has trips in the current class that are assigned or under way. Reassign or finish them before changing the class.",
  vehicles_unit_number_unique: "Another vehicle already uses that unit number.",
  vehicles_plate_unique: "Another vehicle already uses that plate.",
  documents_size_limit: uploadMessages.tooBig,
  documents_content_type_allowed: uploadMessages.notADocument,
};

function errorField(error: unknown, field: "constraint" | "code"): string | null {
  for (let current = error; typeof current === "object" && current !== null; ) {
    const value: unknown = Reflect.get(current, field);
    if (typeof value === "string") return value;
    current = "cause" in current ? current.cause : null;
  }
  return null;
}

export function violatedConstraint(error: unknown): string | null {
  return errorField(error, "constraint");
}

export function isDeadlock(error: unknown): boolean {
  return errorField(error, "code") === "40P01";
}

export function friendlyDatabaseError(error: unknown): string | null {
  const constraint = violatedConstraint(error);
  return constraint ? (messages[constraint] ?? null) : null;
}
