import { z } from "zod";

export const pageSize = 25;
export const maxShown = 200;

export const shownCount = z.coerce
  .number()
  .catch(pageSize)
  .transform((show) => Math.min(Math.max(Math.round(show), pageSize), maxShown));

export function nextShownCount(show: number): number | null {
  return show < maxShown ? Math.min(show + pageSize, maxShown) : null;
}
