export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors: FieldErrors };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function recordId(value: unknown): string | null {
  return typeof value === "string" && uuid.test(value) ? value : null;
}

export const missingRecord = {
  trip: "That trip no longer exists.",
  driver: "That driver no longer exists.",
  vehicle: "That vehicle no longer exists.",
  file: "That file no longer exists.",
};

export function failure(message: string): ActionResult<never> {
  return { ok: false, message, fieldErrors: {} };
}

export class DomainError extends Error {
  override readonly name = "DomainError";
}
