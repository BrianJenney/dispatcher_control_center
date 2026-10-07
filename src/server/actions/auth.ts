"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { signInInput } from "@/domain/auth";
import { failure, type ActionResult } from "@/domain/result";
import { parseInput } from "@/server/action";
import { auth } from "@/server/auth";

export async function signIn(input: z.input<typeof signInInput>): Promise<ActionResult<null>> {
  const parsed = parseInput(signInInput, input);
  if (!parsed.ok) return parsed.failure;
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError) {
      return failure("That email and password do not match. Check them and try again.");
    }
    throw error;
  }
  return { ok: true, data: null };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
