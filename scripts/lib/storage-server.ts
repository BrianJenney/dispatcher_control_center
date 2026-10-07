import S3rver from "s3rver";
import { env } from "@/env";

const cors = `<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
  </CORSRule>
</CORSConfiguration>`;

export async function startLocalStorage(directory = ".storage") {
  const endpoint = new URL(env.STORAGE_ENDPOINT);
  const server = new S3rver({
    port: Number(endpoint.port),
    address: endpoint.hostname,
    silent: true,
    directory,
    configureBuckets: [{ name: env.STORAGE_BUCKET, configs: [cors] }],
  });
  try {
    await server.run();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EADDRINUSE") {
      return { stop: () => Promise.resolve() };
    }
    throw error;
  }
  return { stop: () => server.close() };
}
