import { stepIndex } from "@/domain/shortcuts";

export const tripCardSelector = "[data-trip-card]";

export function tripCardId(tripId: string): string {
  return `trip-card-${tripId}`;
}

export function moveToTripCard(step: 1 | -1) {
  const cards = [...document.querySelectorAll<HTMLElement>(tripCardSelector)];
  const current = cards.findIndex((card) => card.contains(document.activeElement));
  cards[stepIndex(current, cards.length, step)]?.focus();
}

export function scrollGently(element: Element) {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
}

export function showTripCard(tripId: string) {
  const card = document.getElementById(tripCardId(tripId));
  if (!card) return;
  card.focus({ preventScroll: true });
  scrollGently(card);
  card.animate([{ boxShadow: "0 0 0 3px var(--gold)" }, { boxShadow: "0 0 0 3px transparent" }], {
    duration: 1800,
    easing: "ease-in",
  });
}

export function keepFocusNearTrip(tripId: string) {
  requestAnimationFrame(() => {
    if (document.activeElement && document.activeElement !== document.body) return;
    const card = document.getElementById(tripCardId(tripId));
    (card ?? document.querySelector<HTMLElement>("main"))?.focus();
  });
}
