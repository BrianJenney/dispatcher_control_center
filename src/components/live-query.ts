"use client";

import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

export const POLL_INTERVAL_MS = 5_000;

type LiveQuery<T extends object> = {
  queryKey: readonly unknown[];
  url: string;
  schema: z.ZodType<T>;
  initialData: T;
};

export function useLiveQuery<T extends object>({ queryKey, url, schema, initialData }: LiveQuery<T>) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Loading ${url} failed with status ${response.status}`);
      return schema.parse(await response.json());
    },
    initialData,
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
  });
}
