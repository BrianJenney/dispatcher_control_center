"use client";

import { AlertTriangle, Inbox, MapPinOff } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";

type StateProps = { title: string; description?: string; action?: ReactNode; pageTitle?: boolean };

function StateFrame({ icon, title, description, action, role, pageTitle = false }: StateProps & { icon: ReactNode; role?: "alert" }) {
  const Title = pageTitle ? "h1" : "p";
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center"
    >
      <div className="rounded-full bg-muted p-3 text-muted-foreground">{icon}</div>
      <div className="space-y-1">
        <Title className={pageTitle ? "text-lg font-semibold" : "font-medium"}>{title}</Title>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateFrame icon={<Inbox className="size-5" aria-hidden />} {...props} />;
}

function StateActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-2">{children}</div>;
}

export function ErrorState({
  title = "Something went wrong",
  description = "This part of the page could not load. Your data is safe.",
  onRetry,
  action,
  pageTitle,
}: Partial<StateProps> & { onRetry?: () => void }) {
  return (
    <StateFrame
      role="alert"
      icon={<AlertTriangle className="size-5" aria-hidden />}
      title={title}
      description={description}
      pageTitle={pageTitle}
      action={
        onRetry || action ? (
          <StateActions>
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
            {action}
          </StateActions>
        ) : null
      }
    />
  );
}

export function NotFoundState() {
  return (
    <StateFrame
      pageTitle
      icon={<MapPinOff className="size-5" aria-hidden />}
      title="We could not find that page"
      description="The link may be out of date, or the record may have been removed."
      action={
        <StateActions>
          <Button asChild>
            <Link href="/">Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jobs">Jobs</Link>
          </Button>
        </StateActions>
      }
    />
  );
}

export function LiveUpdatesPaused({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <ErrorState
      title="Live updates paused"
      description={`We could not refresh ${what}. It will update again once the connection is back.`}
      onRetry={onRetry}
    />
  );
}

const placeholderHeights = { row: "h-12", compact: "h-20", card: "h-72 lg:h-52" } as const;

export function LoadingState({
  label,
  rows = 3,
  shape = "row",
}: {
  label: string;
  rows?: number;
  shape?: keyof typeof placeholderHeights;
}) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={cn("w-full rounded-xl", placeholderHeights[shape])} />
      ))}
    </div>
  );
}
