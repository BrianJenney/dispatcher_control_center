import { freshDatabase } from "../../scripts/lib/database";
import { testDatabaseUrl } from "./database-url";

export default async function setup() {
  await freshDatabase(testDatabaseUrl(), { seed: true });
}
