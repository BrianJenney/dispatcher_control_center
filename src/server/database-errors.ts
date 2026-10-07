const messages: Record<string, string> = {
  trips_no_overlapping_driver_trips: "That driver already has a trip at that time. Choose another driver.",
  trips_status_transition: "Someone else changed this trip first. Refresh to see its latest status.",
  trips_driver_matches_status: "Choose a driver before assigning the trip.",
  trips_cancel_reason_matches_status: "Give a reason for cancelling the trip.",
  vehicles_unit_number_unique: "Another vehicle already uses that unit number.",
  vehicles_plate_unique: "Another vehicle already uses that plate.",
  documents_size_limit: "Files must be 10 MB or smaller.",
  documents_content_type_allowed: "Upload a PDF or an image (JPEG, PNG or WebP).",
};

export function violatedConstraint(error: unknown): string | null {
  for (let current = error; typeof current === "object" && current !== null; ) {
    if ("constraint" in current && typeof current.constraint === "string") return current.constraint;
    current = "cause" in current ? current.cause : null;
  }
  return null;
}

export function friendlyDatabaseError(error: unknown): string | null {
  const constraint = violatedConstraint(error);
  return constraint ? (messages[constraint] ?? null) : null;
}
