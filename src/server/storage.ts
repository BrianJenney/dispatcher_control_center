import { AwsClient } from "aws4fetch";
import { env } from "@/env";
import { reportError } from "@/observability";

const client = new AwsClient({
  accessKeyId: env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
  retries: 2,
});

const linkLifetimeSeconds = 5 * 60;

function objectUrl(key: string) {
  const base = env.STORAGE_ENDPOINT.replace(/\/$/, "");
  return new URL(`${base}/${env.STORAGE_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`);
}

async function presign(url: URL, init: RequestInit, signHeaders: boolean) {
  url.searchParams.set("X-Amz-Expires", String(linkLifetimeSeconds));
  const signed = await client.sign(new Request(url, init), { aws: { signQuery: true, allHeaders: signHeaders } });
  return signed.url;
}

async function remove(key: string) {
  const response = await client.fetch(objectUrl(key), { method: "DELETE" });
  if (!response.ok) throw new Error(`Storage refused to delete ${key} with status ${response.status}.`);
}

export const storage = {
  linkLifetimeSeconds,

  uploadUrl: (key: string, file: { contentType: string; sizeBytes: number }) =>
    presign(
      objectUrl(key),
      { method: "PUT", headers: { "content-type": file.contentType, "content-length": String(file.sizeBytes) } },
      true,
    ),

  downloadUrl: (key: string, fileName: string) => {
    const url = objectUrl(key);
    url.searchParams.set("response-content-disposition", `inline; filename="${fileName.replace(/["\\\r\n]/g, "")}"`);
    return presign(url, { method: "GET" }, false);
  },

  describe: async (key: string) => {
    const response = await client.fetch(objectUrl(key), { method: "HEAD" });
    if (!response.ok) return null;
    return {
      sizeBytes: Number(response.headers.get("content-length") ?? 0),
      contentType: response.headers.get("content-type") ?? "",
    };
  },

  firstBytes: async (key: string, count: number) => {
    const response = await client.fetch(objectUrl(key), { headers: { range: `bytes=0-${count - 1}` } });
    return response.ok ? new Uint8Array(await response.arrayBuffer()).subarray(0, count) : new Uint8Array();
  },

  discard: async (key: string) => {
    await remove(key).catch(reportError);
  },
};
