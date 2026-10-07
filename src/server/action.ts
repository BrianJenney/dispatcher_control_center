import { z } from "zod";
import { db, type Transaction } from "@/db/client";
import { DomainError, type ActionResult } from "@/domain/result";
import { currentUser } from "@/server/session";

type ActionContext = { tx: Transaction; userId: string };

function failure(message: string): ActionResult<never> {
  return { ok: false, message, fieldErrors: {} };
}

export function defineAction<S extends z.ZodType, R>(
  schema: S,
  run: (input: z.output<S>, context: ActionContext) => Promise<R>,
) {
  return async (input: z.input<S>): Promise<ActionResult<R>> => {
    const user = await currentUser();
    if (!user) return failure("Your session has ended. Sign in again to continue.");

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Some fields need attention.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    }

    try {
      const data = await db.transaction((tx) => run(parsed.data, { tx, userId: user.id }));
      return { ok: true, data };
    } catch (error) {
      if (error instanceof DomainError) return failure(error.message);
      throw error;
    }
  };
}
