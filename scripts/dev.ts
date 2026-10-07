import { spawn } from "node:child_process";
import { startLocalStorage } from "./lib/storage-server";

const storage = await startLocalStorage().catch((error: unknown) => {
  console.warn(`Local file storage did not start: ${error instanceof Error ? error.message : String(error)}`);
  return null;
});
const next = spawn("pnpm", ["exec", "next", "dev"], { stdio: "inherit" });
next.on("exit", (code) => {
  void storage?.stop();
  process.exit(code ?? 0);
});
