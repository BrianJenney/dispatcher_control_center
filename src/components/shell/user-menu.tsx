import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme";
import { TourButton } from "@/components/tour";
import { ShortcutsButton } from "@/components/shortcuts";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { signOut } from "@/server/actions/auth";
import type { SignedInUser } from "@/server/session";
import { initials } from "@/components/initials";

export function UserMenu({ user, tone = "dark" }: { user: SignedInUser; tone?: "dark" | "light" }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "hidden size-9 shrink-0 place-items-center rounded-full text-xs font-semibold sm:grid",
          tone === "light" ? "bg-sidebar-accent text-sidebar-foreground" : "bg-secondary text-secondary-foreground",
        )}
      >
        {initials(user.name)}
      </span>
      <span className={cn("min-w-0 flex-1 text-sm leading-tight", tone === "dark" && "sr-only")}>
        <span className="block truncate font-medium">{user.name}</span>
        <span className="block truncate text-xs text-sidebar-foreground/60">{user.email}</span>
      </span>
      <TourButton />
      <ShortcutsButton />
      <ThemeToggle tone={tone} />
      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          className={cn(tone === "light" && "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
        >
          <LogOut className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
