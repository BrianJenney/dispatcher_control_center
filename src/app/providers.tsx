"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { TimeZoneProvider } from "@/components/format";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ timeZone, children }: { timeZone: string; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <TimeZoneProvider timeZone={timeZone}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </TimeZoneProvider>
    </QueryClientProvider>
  );
}
