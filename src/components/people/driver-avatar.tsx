import Image from "next/image";
import { cn } from "@/components/ui/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function DriverAvatar({
  driver,
  size = 48,
}: {
  driver: { id: string; name: string; photoVersion: string | null };
  size?: number;
}) {
  const style = { width: size, height: size };
  if (driver.photoVersion) {
    return (
      <Image
        unoptimized
        src={`/api/drivers/${driver.id}/photo?v=${driver.photoVersion}`}
        alt={`Photo of ${driver.name}`}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-2 ring-gold/40"
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn("grid shrink-0 place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground", size > 56 ? "text-xl" : "text-sm")}
    >
      {initials(driver.name)}
    </span>
  );
}
