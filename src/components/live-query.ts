"use client";

import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import type { LiveQueryDefinition } from "@/components/queries";

export const POLL_INTERVAL_MS = 5_000;

async function readJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Loading ${url} failed with status ${String(response.status)}`);
  return schema.parse(await response.json());
}

export function useLiveQuery<T extends object>(definition: LiveQueryDefinition<T>, initialData: T) {
  return useQuery({
    queryKey: definition.queryKey,
    queryFn: () => readJson(definition.url, definition.schema),
    initialData,
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useOnDemandQuery<T>(definition: LiveQueryDefinition<T>, enabled: boolean) {
  return useQuery({
    queryKey: definition.queryKey,
    queryFn: () => readJson(definition.url, definition.schema),
    enabled,
    staleTime: 0,
  });
}
