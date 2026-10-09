"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

export function useAddressFilter<F>(filter: F, href: (filter: F) => Route) {
  const router = useRouter();
  const [pending, startNavigation] = useTransition();
  const [shown, showNow] = useOptimistic(filter);

  function show(next: F) {
    startNavigation(() => {
      showNow(next);
      router.replace(href(next), { scroll: false });
    });
  }

  return { shown, show, pending };
}
