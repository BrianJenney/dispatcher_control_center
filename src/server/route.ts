import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { uptimeAnswer } from "@/domain/health-check";
import { missingRecord } from "@/domain/result";
import { servedFile } from "@/domain/uploads";
import { env } from "@/env";
import { currentUser } from "@/server/session";
import { storage } from "@/server/storage";

type RouteParams = Record<string, string | string[] | undefined>;

type RouteInput = { searchParams: URLSearchParams; params: RouteParams };

async function signedOut(message: string) {
  await connection();
  return (await currentUser()) ? null : Response.json({ message }, { status: 401 });
}

export function pollingRoute<T>({ read }: { read: (input: RouteInput) => Promise<T | null> }) {
  return async function GET(request: Request, context: { params: Promise<RouteParams> }) {
    const refused = await signedOut("Sign in to see this.");
    if (refused) return refused;
    const data = await read({ searchParams: new URL(request.url).searchParams, params: await context.params });
    if (data === null) return Response.json({ message: "Not found." }, { status: 404 });
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  };
}

export function uptimeRoute(databaseReachable: () => Promise<boolean>) {
  return async function GET() {
    await connection();
    const answer = uptimeAnswer(await databaseReachable());
    return Response.json(answer.body, { status: answer.status, headers: { "Cache-Control": "no-store" } });
  };
}

type StoredFile = { key: string; fileName: string; contentType: string | null };

export function fileRoute({ read }: { read: (params: RouteParams) => Promise<StoredFile | null> }) {
  return async function GET(_request: Request, context: { params: Promise<RouteParams> }) {
    const refused = await signedOut("Sign in to see this file.");
    if (refused) return refused;
    const file = await read(await context.params);
    if (!file) return Response.json({ message: missingRecord.file }, { status: 404 });
    const body = await storage.read(file.key);
    if (!body) return Response.json({ message: missingRecord.file }, { status: 404 });
    const served = servedFile(file);
    return new Response(body, {
      headers: {
        "Content-Type": served.contentType,
        "Content-Disposition": served.disposition,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}

type Download = { fileName: string; contentType: string; body: string };

export function downloadRoute({ read }: { read: (searchParams: URLSearchParams) => Promise<Download> }) {
  return async function GET(request: Request) {
    const refused = await signedOut("Sign in to download this.");
    if (refused) return refused;
    const file = await read(new URL(request.url).searchParams);
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  };
}

function fromScheduler(request: Request) {
  if (!env.CRON_SECRET) return false;
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function cronRoute<T>(run: () => Promise<T>) {
  return async function GET(request: Request) {
    await connection();
    if (!fromScheduler(request)) return Response.json({ message: "Only the scheduler can run this." }, { status: 401 });
    return Response.json(await run(), { headers: { "Cache-Control": "no-store" } });
  };
}
