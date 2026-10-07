import { AwsClient } from "aws4fetch";
import { env } from "@/env";

const client = new AwsClient({
  accessKeyId: env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
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

  remove: async (key: string) => {
    await client.fetch(objectUrl(key), { method: "DELETE" });
  },
};
