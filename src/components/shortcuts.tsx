"use client";

import { Keyboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useSyncExternalStore } from "react";
import { moveToTripCard } from "@/components/trips/trip-focus";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { jobsSearchId } from "@/domain/jobs";
import {
  idleChord,
  parseShortcutsEnabled,
  pressKey,
  shortcutGroups,
  shortcutsStorageKey,
  type ShortcutAction,
} from "@/domain/shortcuts";

const listeners = new Set<() => void>();
let helpRequested = false;
let unsavedEnabled = true;

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify() {
  listeners.forEach((listener) => {
    listener();
  });
}

function readEnabled(): boolean {
  try {
    return parseShortcutsEnabled(localStorage.getItem(shortcutsStorageKey));
  } catch {
    return unsavedEnabled;
  }
}

function save(enabled: boolean) {
  try {
    localStorage.setItem(shortcutsStorageKey, enabled ? "on" : "off");
  } catch {
    return;
  }
}

function setEnabled(enabled: boolean) {
  unsavedEnabled = enabled;
  save(enabled);
  notify();
}

function setHelpOpen(open: boolean) {
  helpRequested = open;
  notify();
}

function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(subscribe, readEnabled, () => true);
}

function useHelpOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => helpRequested,
    () => false,
  );
}

const typingSelector =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='combobox']";
const overlaySelector = "[role='dialog'], [role='alertdialog'], [role='listbox'], [role='menu']";

function shouldStayQuiet(event: KeyboardEvent): boolean {
  const typing = event.target instanceof Element && event.target.closest(typingSelector) !== null;
  return event.repeat || event.defaultPrevented || typing || document.querySelector(overlaySelector) !== null || !readEnabled();
}

type Router = ReturnType<typeof useRouter>;

function run(action: ShortcutAction, router: Router) {
  switch (action.kind) {
    case "go":
      router.push(action.href);
      return;
    case "search": {
      const box = document.getElementById(jobsSearchId);
      if (box) box.focus();
      else router.push("/jobs");
      return;
    }
    case "help":
      setHelpOpen(true);
      return;
    case "trip":
      moveToTripCard(action.step);
      return;
  }
}

export function ShortcutsButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts"
      onClick={() => {
        setHelpOpen(true);
      }}
    >
      <Keyboard className="size-4" aria-hidden />
    </Button>
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const open = useHelpOpen();

  useEffect(() => {
    let chord = idleChord;
    function onKeyDown(event: KeyboardEvent) {
      if (shouldStayQuiet(event)) {
        chord = idleChord;
        return;
      }
      const result = pressKey(chord, event, event.timeStamp);
      chord = result.state;
      if (!result.match) return;
      event.preventDefault();
      run(result.match.action, router);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={setHelpOpen}>
      {open ? <ShortcutsHelp /> : null}
    </Dialog>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="min-w-6 rounded-md border bg-muted px-1.5 py-0.5 text-center font-mono text-xs font-medium text-foreground">
      {children}
    </kbd>
  );
}

function ShortcutsHelp() {
  const enabled = useShortcutsEnabled();
  const switchId = useId();
  return (
    <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          Press one key, or two in a row, like g then d. They wait while you type in a field.
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 p-3">
        <Label htmlFor={switchId} className="text-sm leading-snug">
          Use keyboard shortcuts
        </Label>
        <Switch id={switchId} checked={enabled} onCheckedChange={setEnabled} />
      </div>
      {shortcutGroups().map((group) => (
        <section key={group.title} aria-label={group.title} className="space-y-2">
          <h3 className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{group.title}</h3>
          <dl className="divide-y rounded-lg border">
            {group.rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2">
                <dt>{row.label}</dt>
                <dd className="flex shrink-0 items-center gap-1.5">
                  {row.keys.map((key, index) => (
                    <Fragment key={key}>
                      {index > 0 ? <span className="text-xs text-muted-foreground">then</span> : null}
                      <Kbd>{key}</Kbd>
                    </Fragment>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </DialogContent>
  );
}
