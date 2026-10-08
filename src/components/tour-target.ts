import type { TourTarget } from "@/domain/tour";

export function tourTarget(id: TourTarget | undefined) {
  return { "data-tour": id };
}

export function findTourTarget(id: TourTarget): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  return Array.from(candidates).find((element) => element.getClientRects().length > 0) ?? null;
}
