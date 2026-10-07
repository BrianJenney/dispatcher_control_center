import { headers } from "next/headers";

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
