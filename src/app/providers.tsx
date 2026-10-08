"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { TimeZoneProvider } from "@/components/format";
import { useTheme } from "@/components/theme";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ timeZone, children }: { timeZone: string; children: ReactNode }) {
  const theme = useTheme();
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <TimeZoneProvider timeZone={timeZone}>
        {children}
        <Toaster theme={theme} position="top-center" closeButton />
      </TimeZoneProvider>
    </QueryClientProvider>
  );
}
