import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type KpiTileProps = { label: string; value: string; detail: string; icon: LucideIcon };

export function KpiTile({ label, value, detail, icon: Icon }: KpiTileProps) {
  return (
    <div role="group" aria-label={label} className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
        <Icon className="size-4 text-gold" aria-hidden />
      </div>
      <p data-testid="kpi-value" className="mt-3 text-3xl font-semibold tabular-nums sm:text-4xl" aria-live="polite">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function KpiTileSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-9 w-16 sm:h-10" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}
