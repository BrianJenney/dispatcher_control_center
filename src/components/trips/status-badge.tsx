import { cn } from "@/components/ui/utils";
import { statusLabels, type TripStatus } from "@/domain/trip-status";

const tone: Record<TripStatus, string> = {
  offer: "bg-status-offer/12 text-status-offer",
  assigned: "bg-status-assigned/12 text-status-assigned",
  en_route: "bg-status-en-route/12 text-status-en-route",
  completed: "bg-status-completed/12 text-status-completed",
  cancelled: "bg-status-cancelled/12 text-status-cancelled",
};

export function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tone[status],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}
