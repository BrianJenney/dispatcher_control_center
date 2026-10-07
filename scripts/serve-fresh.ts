import { databaseUrlNamed, freshDatabase } from "./lib/database";
import { launchApp, type AppMode } from "./lib/app-server";
import { startLocalStorage } from "./lib/storage-server";

const port = Number(process.argv[2] ?? 3100);
const mode: AppMode = process.argv[3] === "start" ? "start" : "dev";
const databaseUrl = databaseUrlNamed("dispatch_e2e");

await freshDatabase(databaseUrl, { seed: true });
await startLocalStorage(".storage/e2e");
const { child } = launchApp({ port, databaseUrl, mode, ownProcessGroup: false });
child.on("exit", (code) => process.exit(code ?? 0));
