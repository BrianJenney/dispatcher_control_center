import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/server/auth";

export type SignedInUser = { id: string; name: string; email: string };

export const currentUser = cache(async (): Promise<SignedInUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
});
