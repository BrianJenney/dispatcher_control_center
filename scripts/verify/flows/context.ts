import type { Page } from "@playwright/test";
import { Pool } from "pg";
import type { FlowContext } from "./types";

export function flowDatabase(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  return {
    contextFor(page: Page): FlowContext {
      return {
        page,
        number: async (query, params = []) => {
          const result = await pool.query<{ value: string | number | null }>(query, params);
          return Number(result.rows[0]?.value ?? 0);
        },
        text: async (query, params = []) => {
          const result = await pool.query<{ value: string | null }>(query, params);
          return result.rows[0]?.value ?? null;
        },
        execute: async (query, params = []) => {
          await pool.query(query, params);
        },
      };
    },
    close: () => pool.end(),
  };
}
