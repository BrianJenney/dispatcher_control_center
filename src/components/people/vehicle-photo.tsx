import { CarFront } from "lucide-react";
import Image from "next/image";
import { cn } from "@/components/ui/utils";
import type { VehicleStatus } from "@/domain/fleet";

export function VehiclePhoto({
  vehicle,
  width = 48,
  height = 48,
}: {
  vehicle: { id: string; model: string; status: VehicleStatus; photoVersion: string | null };
  width?: number;
  height?: number;
}) {
  const style = { width, height };
  if (vehicle.photoVersion) {
    return (
      <Image
        unoptimized
        src={`/api/vehicles/${vehicle.id}/photo?v=${vehicle.photoVersion}`}
        alt={`Photo of the ${vehicle.model}`}
        width={width}
        height={height}
        className="shrink-0 rounded-xl object-cover ring-2 ring-gold/40"
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        vehicle.status === "ready" ? "bg-status-completed/12 text-status-completed" : "bg-muted text-muted-foreground",
      )}
    >
      <CarFront className={height > 56 ? "size-10" : "size-6"} />
    </span>
  );
}
