"use client";

import { ErrorState } from "@/components/states";

export default function HealthError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <ErrorState description="The health page could not load." onRetry={retry} />
    </main>
  );
}
