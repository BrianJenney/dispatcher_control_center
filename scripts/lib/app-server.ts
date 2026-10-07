import { spawn, type ChildProcess } from "node:child_process";

export type AppMode = "dev" | "start";

type LaunchOptions = {
  port: number;
  databaseUrl: string;
  mode: AppMode;
  quiet?: boolean;
  ownProcessGroup?: boolean;
};

export function launchApp(options: LaunchOptions) {
  const baseUrl = `http://localhost:${options.port}`;
  const child = spawn("pnpm", ["exec", "next", options.mode, "-p", String(options.port)], {
    env: { ...process.env, DATABASE_URL: options.databaseUrl, BETTER_AUTH_URL: baseUrl },
    stdio: options.quiet ? "ignore" : "inherit",
    detached: options.ownProcessGroup ?? true,
  });
  return { baseUrl, child };
}

export async function waitForApp(baseUrl: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const healthy = await fetch(`${baseUrl}/api/health`)
      .then((response) => response.ok)
      .catch(() => false);
    if (healthy) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The app at ${baseUrl} did not become healthy within ${timeoutMs / 1000}s.`);
}

export function stopApp(child: ChildProcess) {
  if (child.pid) process.kill(-child.pid, "SIGTERM");
}
