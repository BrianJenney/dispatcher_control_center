import { connection } from "next/server";
import { currentUser } from "@/server/session";
import { storage } from "@/server/storage";

type RouteParams = Record<string, string | string[] | undefined>;

type RouteInput = { searchParams: URLSearchParams; params: RouteParams };

type PollingRoute<T> = {
  access: "signed-in" | "public";
  read: (input: RouteInput) => Promise<T | null>;
};

export function pollingRoute<T>({ access, read }: PollingRoute<T>) {
  return async function GET(request: Request, context: { params: Promise<RouteParams> }) {
    await connection();
    if (access === "signed-in" && !(await currentUser())) {
      return Response.json({ message: "Sign in to see this." }, { status: 401 });
    }
    const data = await read({ searchParams: new URL(request.url).searchParams, params: await context.params });
    if (data === null) return Response.json({ message: "Not found." }, { status: 404 });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  };
}

type StoredFile = { key: string; fileName: string };

export function fileRoute({ read }: { read: (params: RouteParams) => Promise<StoredFile | null> }) {
  return async function GET(_request: Request, context: { params: Promise<RouteParams> }) {
    await connection();
    if (!(await currentUser())) return Response.json({ message: "Sign in to see this file." }, { status: 401 });
    const file = await read(await context.params);
    if (!file) return Response.json({ message: "That file no longer exists." }, { status: 404 });
    return Response.redirect(await storage.downloadUrl(file.key, file.fileName), 302);
  };
}
