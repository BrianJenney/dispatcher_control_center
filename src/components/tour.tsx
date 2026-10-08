"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { TourHighlight } from "@/components/tour-highlight";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tourStorageKey, tourSteps } from "@/domain/tour";

const listeners = new Set<() => void>();
let requested = false;
let finishedInMemory = false;

function finishedBefore(): boolean {
  try {
    return finishedInMemory || localStorage.getItem(tourStorageKey) !== null;
  } catch {
    return finishedInMemory;
  }
}

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

function remember() {
  finishedInMemory = true;
  try {
    localStorage.setItem(tourStorageKey, "done");
  } catch {
    return;
  }
}

function useTourOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => requested || !finishedBefore(),
    () => false,
  );
}

function closeTour() {
  requested = false;
  remember();
  notify();
}

export function TourButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Take the tour"
      title="Take the tour"
      onClick={() => {
        requested = true;
        notify();
      }}
    >
      <CircleHelp className="size-4" aria-hidden />
    </Button>
  );
}

export function GuidedTour() {
  const open = useTourOpen();
  return (
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(next) => {
        if (!next) closeTour();
      }}
    >
      {open ? <TourSteps /> : null}
    </Dialog>
  );
}

function TourSteps() {
  const [index, setIndex] = useState(0);
  const step = tourSteps[index];
  if (!step) return null;
  const last = index === tourSteps.length - 1;
  return (
    <>
      {step.target ? <TourHighlight target={step.target} /> : null}
      <DialogContent
        className="top-auto bottom-[calc(4.5rem+env(safe-area-inset-bottom))] translate-y-0 sm:max-w-md lg:right-6 lg:bottom-6 lg:left-auto lg:translate-x-0"
        showCloseButton={false}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <DialogHeader>
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Step {index + 1} of {tourSteps.length}
          </p>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.body}</DialogDescription>
        </DialogHeader>
        <div aria-hidden className="flex gap-1.5">
          {tourSteps.map((entry, position) => (
            <span key={entry.title} className={position <= index ? "h-1 flex-1 rounded-full bg-primary" : "h-1 flex-1 rounded-full bg-muted"} />
          ))}
        </div>
        {step.link ? (
          <Button asChild variant="outline" className="h-11 sm:h-10">
            <Link href={step.link.href} onClick={closeTour}>
              {step.link.label}
            </Link>
          </Button>
        ) : null}
        <DialogFooter className="flex-row justify-between gap-2">
          <Button variant="ghost" className="h-11 sm:h-10" onClick={closeTour}>
            {last ? "Close" : "Skip tour"}
          </Button>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button
                variant="outline"
                className="h-11 flex-1 sm:h-10 sm:flex-none"
                onClick={() => {
                  setIndex(index - 1);
                }}
              >
                Back
              </Button>
            ) : null}
            <Button
              className="h-11 flex-1 sm:h-10 sm:flex-none"
              onClick={() => {
                if (last) closeTour();
                else setIndex(index + 1);
              }}
            >
              {last ? "Start dispatching" : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </>
  );
}
