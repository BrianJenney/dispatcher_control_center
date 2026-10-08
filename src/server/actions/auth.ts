"use server";

import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { signInFailureMessage, signInInput } from "@/domain/auth";
import { failure, type ActionResult } from "@/domain/result";
import { parseInput } from "@/server/action";
import { auth } from "@/server/auth";
import { env } from "@/env";

const forwardedHeaders = ["origin", "user-agent", "x-forwarded-for"];

function signInRequest(credentials: z.output<typeof signInInput>, incoming: Headers) {
  const forwarded = new Headers({ "content-type": "application/json" });
  for (const name of forwardedHeaders) {
    const value = incoming.get(name);
    if (value) forwarded.set(name, value);
  }
  return new Request(`${env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: forwarded,
    body: JSON.stringify(credentials),
  });
}

async function keepSessionCookies(response: Response) {
  const store = await cookies();
  parseSetCookieHeader(response.headers.get("set-cookie") ?? "").forEach((cookie, name) => {
    store.set(name, cookie.value, toCookieOptions(cookie));
  });
}

export async function signIn(input: z.input<typeof signInInput>): Promise<ActionResult<null>> {
  const parsed = parseInput(signInInput, input);
  if (!parsed.ok) return parsed.failure;
  const response = await auth.handler(signInRequest(parsed.data, await headers()));
  if (response.status >= 500) throw new Error(`Sign in failed with status ${String(response.status)}.`);
  if (!response.ok) return failure(signInFailureMessage(response.status));
  await keepSessionCookies(response);
  return { ok: true, data: null };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
