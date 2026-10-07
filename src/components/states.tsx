"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type StateProps = { title: string; description?: string; action?: ReactNode };

function StateFrame({ icon, title, description, action, role }: StateProps & { icon: ReactNode; role?: "alert" }) {
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center"
    >
      <div className="rounded-full bg-muted p-3 text-muted-foreground">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateFrame icon={<Inbox className="size-5" aria-hidden />} {...props} />;
}

export function ErrorState({
  title = "Something went wrong",
  description = "This part of the page could not load. Your data is safe.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <StateFrame
      role="alert"
      icon={<AlertTriangle className="size-5" aria-hidden />}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null
      }
    />
  );
}

export function LoadingState({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}
