export function tripCardId(tripId: string): string {
  return `trip-card-${tripId}`;
}

export function keepFocusNearTrip(tripId: string) {
  requestAnimationFrame(() => {
    if (document.activeElement && document.activeElement !== document.body) return;
    const card = document.getElementById(tripCardId(tripId));
    (card ?? document.querySelector<HTMLElement>("main"))?.focus();
  });
}
