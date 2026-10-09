import { redirect } from "next/navigation";
import { currentUser, type SignedInUser } from "@/server/session";

export async function requireUser(): Promise<SignedInUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export type QueryAccess = "signed-in" | "public";

export function defineQuery<Args extends unknown[], Result>(
  access: QueryAccess,
  read: (...args: Args) => Result | Promise<Result>,
) {
  return async (...args: Args): Promise<Result> => {
    if (access === "signed-in") await requireUser();
    return read(...args);
  };
}
