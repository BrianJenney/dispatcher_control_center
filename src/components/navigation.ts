import type { Route } from "next";
import { inAppPath } from "@/domain/auth";

export function isAppRoute(path: string): path is Route {
  return inAppPath.test(path);
}
