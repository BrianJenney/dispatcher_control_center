import { connection } from "next/server";

export function pollingRoute<T>(read: () => Promise<T>) {
  return async function GET() {
    await connection();
    return Response.json(await read(), { headers: { "Cache-Control": "no-store" } });
  };
}
