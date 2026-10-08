import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInMessages } from "@/domain/auth";
import { env } from "@/env";
import { signIn } from "@/server/actions/auth";

const request = vi.hoisted(() => ({ headers: new Headers(), setCookie: vi.fn() }));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(request.headers),
  cookies: () => Promise.resolve({ set: request.setCookie }),
}));

function arriveFrom(address: string) {
  request.headers = new Headers({ origin: env.BETTER_AUTH_URL, "x-forwarded-for": address });
}

const wrongPassword = { email: env.DEMO_USER_EMAIL, password: `${env.DEMO_USER_PASSWORD}-wrong` };
const demoAccount = { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD };

async function attempts(count: number) {
  const results = [];
  for (let attempt = 0; attempt < count; attempt += 1) results.push(await signIn(wrongPassword));
  return results;
}

beforeEach(() => {
  request.setCookie.mockReset();
});

describe("signing in", () => {
  it("signs in with the demo account and keeps the session cookie", async () => {
    arriveFrom("203.0.113.10");
    expect(await signIn(demoAccount)).toEqual({ ok: true, data: null });
    expect(request.setCookie).toHaveBeenCalledWith("better-auth.session_token", expect.any(String), expect.objectContaining({ httpOnly: true }));
  });

  it("refuses the 11th attempt from one address inside a minute, even with the right password", async () => {
    arriveFrom("203.0.113.11");
    const firstTen = await attempts(10);
    expect(firstTen.map((result) => (result.ok ? "signed in" : result.message))).toEqual(Array(10).fill(signInMessages.wrongPassword));
    expect(await signIn(demoAccount)).toMatchObject({ ok: false, message: signInMessages.tooManyAttempts });
    expect(request.setCookie).not.toHaveBeenCalled();
  });

  it("counts each address on its own", async () => {
    arriveFrom("203.0.113.12");
    await attempts(10);
    arriveFrom("203.0.113.13");
    expect(await signIn(demoAccount)).toEqual({ ok: true, data: null });
  });
});
