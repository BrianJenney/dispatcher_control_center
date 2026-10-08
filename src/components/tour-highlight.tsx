"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { findTourTarget } from "@/components/tour-target";
import type { TourTarget } from "@/domain/tour";

type Box = { top: number; left: number; width: number; height: number };

let lastBox: Box | null = null;

function sameBox(a: Box | null, b: Box | null): boolean {
  if (a === null || b === null) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

function readBox(target: TourTarget): Box | null {
  const rect = findTourTarget(target)?.getBoundingClientRect();
  const next = rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null;
  if (!sameBox(lastBox, next)) lastBox = next;
  return lastBox;
}

function watchTarget(target: TourTarget, onChange: () => void): () => void {
  const resizeObserver = new ResizeObserver(onChange);
  let observed: HTMLElement | null = null;
  const follow = () => {
    const current = findTourTarget(target);
    if (current !== observed) {
      if (observed) resizeObserver.unobserve(observed);
      if (current) resizeObserver.observe(current);
      observed = current;
    }
    onChange();
  };
  const mutationObserver = new MutationObserver(follow);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", follow);
  window.addEventListener("scroll", onChange, { capture: true, passive: true });
  follow();
  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    window.removeEventListener("resize", follow);
    window.removeEventListener("scroll", onChange, { capture: true });
  };
}

export function TourHighlight({ target }: { target: TourTarget }) {
  const subscribe = useCallback((onChange: () => void) => watchTarget(target, onChange), [target]);
  const box = useSyncExternalStore(subscribe, () => readBox(target), () => null);

  useEffect(() => {
    findTourTarget(target)?.scrollIntoView({ block: "start" });
  }, [target]);

  if (!box) return null;
  return (
    <div
      aria-hidden
      data-testid="tour-highlight"
      className="pointer-events-none fixed z-40 rounded-xl outline-2 outline-offset-4 outline-gold"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    />
  );
}
