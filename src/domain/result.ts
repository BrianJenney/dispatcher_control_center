export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors: FieldErrors };

export class DomainError extends Error {
  override readonly name = "DomainError";
}
