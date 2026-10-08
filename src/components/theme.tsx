"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { nextTheme, resolveTheme, themeLabels, themeStorageKey, type ThemeChoice } from "@/domain/theme";

const deviceQuery = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();
let unsavedChoice: ThemeChoice | null = null;

function readStored(): string | null {
  try {
    return localStorage.getItem(themeStorageKey);
  } catch {
    return unsavedChoice;
  }
}

function readTheme(): ThemeChoice {
  return resolveTheme(readStored(), matchMedia(deviceQuery).matches);
}

function applyTheme(theme: ThemeChoice) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function subscribe(listener: () => void) {
  const device = matchMedia(deviceQuery);
  const onDeviceChange = () => {
    applyTheme(readTheme());
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

function save(theme: ThemeChoice) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    return;
  }
}

function choose(theme: ThemeChoice) {
  unsavedChoice = theme;
  save(theme);
  applyTheme(theme);
  listeners.forEach((listener) => {
    listener();
  });
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}

const icons = { light: Sun, dark: Moon };

export function ThemeToggle({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const theme = useTheme();
  const Icon = icons[theme];
  const upcoming = nextTheme(theme);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${themeLabels[theme]}. Switch to ${themeLabels[upcoming]}`}
      title={`Theme: ${themeLabels[theme]}`}
      className={cn(tone === "light" && "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}
      onClick={() => {
        choose(upcoming);
      }}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  );
}
