"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { isDark, nextTheme, parseTheme, themeLabels, themeStorageKey, type ThemeChoice } from "@/domain/theme";

const deviceQuery = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();
let unsavedChoice: ThemeChoice = "system";

function readChoice(): ThemeChoice {
  try {
    return parseTheme(localStorage.getItem(themeStorageKey));
  } catch {
    return unsavedChoice;
  }
}

function applyChoice(choice: ThemeChoice) {
  document.documentElement.classList.toggle("dark", isDark(choice, matchMedia(deviceQuery).matches));
}

function subscribe(listener: () => void) {
  const device = matchMedia(deviceQuery);
  const onDeviceChange = () => {
    applyChoice(readChoice());
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", listener);
  device.addEventListener("change", onDeviceChange);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    device.removeEventListener("change", onDeviceChange);
  };
}

function save(choice: ThemeChoice) {
  try {
    localStorage.setItem(themeStorageKey, choice);
  } catch {
    return;
  }
}

function choose(choice: ThemeChoice) {
  unsavedChoice = choice;
  save(choice);
  applyChoice(choice);
  listeners.forEach((listener) => {
    listener();
  });
}

function readResolved(): "light" | "dark" {
  return isDark(readChoice(), matchMedia(deviceQuery).matches) ? "dark" : "light";
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => "system");
}

export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, readResolved, () => "light");
}

const icons = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const choice = useThemeChoice();
  const Icon = icons[choice];
  const upcoming = nextTheme(choice);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${themeLabels[choice]}. Switch to ${themeLabels[upcoming]}`}
      title={`Theme: ${themeLabels[choice]}`}
      className={cn(tone === "light" && "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
      onClick={() => {
        choose(upcoming);
      }}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  );
}
