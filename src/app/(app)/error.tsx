"use client";

import Link from "next/link";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";

export default function SignedInError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorState
      pageTitle
      description="This page could not load. Your data is safe."
      onRetry={retry}
      action={
        <Button asChild variant="ghost" className="h-11 sm:h-10">
          <Link href="/">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
