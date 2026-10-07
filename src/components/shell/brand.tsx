import { cn } from "@/components/ui/utils";

export function Brand({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-xl border border-gold/60 bg-gradient-to-br from-gold/25 to-gold/5 text-sm font-semibold tracking-wide text-gold"
      >
        DL
      </span>
      <span className="leading-tight">
        <span className={cn("block font-semibold", tone === "light" ? "text-sidebar-foreground" : "text-foreground")}>
          Dispatch Lite
        </span>
        <span
          className={cn(
            "block text-[11px] tracking-[0.18em] uppercase",
            tone === "light" ? "text-sidebar-foreground/60" : "text-muted-foreground",
          )}
        >
          Chauffeur ops
        </span>
      </span>
    </div>
  );
}
