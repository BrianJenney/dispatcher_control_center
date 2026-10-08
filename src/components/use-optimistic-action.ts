"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { unreachableMessage } from "@/components/form";
import type { ActionResult } from "@/domain/result";

type OptimisticAction<V, D> = {
  queryKey: readonly unknown[];
  action: (request: V) => Promise<ActionResult<unknown>>;
  update: (data: D, request: V) => D;
  done: (request: V) => string;
  alsoRefresh?: readonly (readonly unknown[])[];
  settled?: (request: V) => void;
};

export function useOptimisticAction<V, D>({ queryKey, action, update, done, alsoRefresh = [], settled }: OptimisticAction<V, D>) {
  const queryClient = useQueryClient();

  function restore(previous: [readonly unknown[], D | undefined][] | undefined) {
    for (const [key, data] of previous ?? []) queryClient.setQueryData(key, data);
  }

  return useMutation({
    mutationFn: action,
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueriesData<D>({ queryKey });
      queryClient.setQueriesData<D>({ queryKey }, (data) => (data ? update(data, request) : data));
      return { previous };
    },
    onSuccess: (result, request, context) => {
      if (!result.ok) {
        restore(context.previous);
        toast.error(result.message);
        return;
      }
      toast.success(done(request));
    },
    onError: (_error, _request, context) => {
      restore(context?.previous);
      toast.error(unreachableMessage);
    },
    onSettled: async (_result, _error, request) => {
      await Promise.all([queryKey, ...alsoRefresh].map((key) => queryClient.invalidateQueries({ queryKey: key })));
      settled?.(request);
    },
  });
}
