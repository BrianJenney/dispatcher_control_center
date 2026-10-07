import { eq } from "drizzle-orm";
import { vi } from "vitest";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { env } from "@/env";
import { currentUser } from "@/server/session";

export async function signInAsDemoUser() {
  const demo = await db.query.user.findFirst({ where: eq(user.email, env.DEMO_USER_EMAIL) });
  if (!demo) throw new Error("The seed did not create the demo user.");
  vi.mocked(currentUser).mockResolvedValue(demo);
  return demo;
}

export function signOut() {
  vi.mocked(currentUser).mockResolvedValue(null);
}
