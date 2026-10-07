import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export type SignedInUser = { id: string; name: string; email: string };

export async function currentUser(): Promise<SignedInUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
}

export async function requireUser(): Promise<SignedInUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
