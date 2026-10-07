import { LayoutDashboard, type LucideIcon } from "lucide-react";
import type { Route } from "next";

export type NavItem = { href: Route; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [{ href: "/", label: "Dashboard", icon: LayoutDashboard }];

export function isActive(pathname: string, href: Route): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
