import { connection } from "next/server";
import { currentUser } from "@/server/session";

type PollingRoute<T> = {
  access: "signed-in" | "public";
  read: () => Promise<T>;
};

export function pollingRoute<T>({ access, read }: PollingRoute<T>) {
  return async function GET() {
    await connection();
    if (access === "signed-in" && !(await currentUser())) {
      return Response.json({ message: "Sign in to see this." }, { status: 401 });
    }
    return Response.json(await read(), { headers: { "Cache-Control": "no-store" } });
  };
}
