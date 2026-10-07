import { z } from "zod";
import { db, type Transaction } from "@/db/client";
import { DomainError, failure, type ActionResult } from "@/domain/result";
import { friendlyDatabaseError } from "@/server/database-errors";
import { currentUser } from "@/server/session";

type ActionContext = { tx: Transaction; userId: string };

export function parseInput<S extends z.ZodType>(schema: S, input: unknown) {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  const invalid: ActionResult<never> = {
    ok: false,
    message: "Some fields need attention.",
    fieldErrors: z.flattenError(parsed.error).fieldErrors,
  };
  return { ok: false as const, failure: invalid };
}

export function defineAction<S extends z.ZodType, R>(
  schema: S,
  run: (input: z.output<S>, context: ActionContext) => Promise<R>,
) {
  return async (input: z.input<S>): Promise<ActionResult<R>> => {
    const user = await currentUser();
    if (!user) return failure("Your session has ended. Sign in again to continue.");

    const parsed = parseInput(schema, input);
    if (!parsed.ok) return parsed.failure;

    try {
      const data = await db.transaction((tx) => run(parsed.data, { tx, userId: user.id }));
      return { ok: true, data };
    } catch (error) {
      if (error instanceof DomainError) return failure(error.message);
      const message = friendlyDatabaseError(error);
      if (message) return failure(message);
      throw error;
    }
  };
}
