import { freshDatabase } from "../../scripts/lib/database";
import { startLocalStorage } from "../../scripts/lib/storage-server";
import { testDatabaseUrl } from "./database-url";

export default async function setup() {
  await freshDatabase(testDatabaseUrl(), { seed: true });
  const storage = await startLocalStorage(".storage/test");
  return () => storage.stop();
}
