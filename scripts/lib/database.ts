import { Client } from "pg";
import { createDatabase } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { seed } from "@/db/seed";
import { env } from "@/env";

export function databaseUrlNamed(name: string) {
  const url = new URL(env.DATABASE_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

async function recreate(url: string) {
  const target = new URL(url);
  if (!localHosts.has(target.hostname)) {
    throw new Error(`Refusing to drop a database on ${target.hostname}. Only local databases are recreated.`);
  }
  const name = target.pathname.slice(1);
  target.pathname = "/postgres";
  const admin = new Client({ connectionString: target.toString() });
  await admin.connect();
  try {
    await admin.query(`drop database if exists "${name}" with (force)`);
    await admin.query(`create database "${name}"`);
  } finally {
    await admin.end();
  }
}

export async function freshDatabase(url: string, options: { seed: boolean }) {
  await recreate(url);
  const { db, pool } = createDatabase(url);
  try {
    await runMigrations(db);
    if (options.seed) {
      await seed(db, { demoUser: { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD } });
    }
  } finally {
    await pool.end();
  }
}
