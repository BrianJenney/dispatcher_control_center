import { BriefcaseBusiness, CalendarClock, CarFront, ChartColumn, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import type { Route } from "next";

export type NavItem = { href: Route; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/fleet", label: "Fleet", icon: CarFront },
  { href: "/insights", label: "Insights", icon: ChartColumn },
];

export function isActive(pathname: string, href: Route): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
