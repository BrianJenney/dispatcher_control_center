"use client";

import { ErrorState } from "@/components/states";

export default function HealthError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorState description="The health page could not load." onRetry={retry} />
  );
}
