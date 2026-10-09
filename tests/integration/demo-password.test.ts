import { verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { account, session } from "@/db/schema";
import { seed } from "@/db/seed";
import { demoUser } from "@/env-demo";
import { seedOptions } from "../../scripts/lib/database";

const rotated = { ...demoUser, password: `${demoUser.password}-rotated` };

async function signsInWith(userId: string, password: string) {
  const credential = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
  });
  if (!credential?.password) throw new Error("The demo user has no password.");
  return verifyPassword({ hash: credential.password, password });
}

async function openSessions(userId: string) {
  return db.$count(session, eq(session.userId, userId));
}

async function openSession(userId: string) {
  await db.insert(session).values({
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 3_600_000),
    userId,
  });
}

afterAll(async () => {
  await seed(db, seedOptions());
});

describe("the demo password on each deploy", () => {
  it("leaves the password and open sessions alone when it has not changed", async () => {
    const { demoUserId } = await seed(db, seedOptions());
    await openSession(demoUserId);
    const before = await openSessions(demoUserId);
    await seed(db, seedOptions());
    expect(await signsInWith(demoUserId, demoUser.password)).toBe(true);
    expect(await openSessions(demoUserId)).toBe(before);
  });

  it("switches to a new password and signs out everyone who used the old one", async () => {
    const { demoUserId } = await seed(db, seedOptions());
    await openSession(demoUserId);
    await seed(db, { ...seedOptions(), demoUser: rotated });
    expect(await signsInWith(demoUserId, rotated.password)).toBe(true);
    expect(await signsInWith(demoUserId, demoUser.password)).toBe(false);
    expect(await openSessions(demoUserId)).toBe(0);
  });
});
