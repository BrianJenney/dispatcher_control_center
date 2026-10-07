import type { Route } from "next";

export function isAppRoute(path: string): path is Route {
  return path.startsWith("/") && !path.startsWith("//");
}
