import { LogOut } from "lucide-react";
import { initials } from "@/components/initials";
import { ShortcutsButton } from "@/components/shortcuts";
import { ThemeToggle } from "@/components/theme";
import { TourButton } from "@/components/tour";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { signOut } from "@/server/actions/auth";
import type { SignedInUser } from "@/server/session";

export function UserMenu({ user, tone = "dark" }: { user: SignedInUser; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <div className={cn("flex", light ? "flex-col gap-3" : "items-center gap-1.5")}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "size-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
            light ? "grid bg-sidebar-accent text-sidebar-foreground" : "hidden bg-secondary text-secondary-foreground sm:grid",
          )}
        >
          {initials(user.name)}
        </span>
        <span className={cn("min-w-0 flex-1 text-sm leading-tight", !light && "sr-only")}>
          <span className="block break-words font-medium">{user.name}</span>
          <span className="block break-all text-xs text-sidebar-foreground/60">{user.email}</span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        <TourButton />
        <ShortcutsButton />
        <ThemeToggle tone={tone} />
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            className={cn(light && "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
          >
            <LogOut className="size-4" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}

export function SidebarUserMenuSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full bg-sidebar-accent" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24 bg-sidebar-accent" />
          <Skeleton className="h-3 w-32 bg-sidebar-accent" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="size-10 rounded-lg bg-sidebar-accent" />
        ))}
      </div>
    </div>
  );
}

export function HeaderUserMenuSkeleton() {
  return (
    <div aria-hidden className="flex items-center gap-1.5">
      <Skeleton className="hidden size-9 shrink-0 rounded-full sm:block" />
      <div className="flex items-center gap-1">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="size-10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
