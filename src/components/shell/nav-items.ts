import { BriefcaseBusiness, CalendarClock, CarFront, ChartColumn, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import type { TourTarget } from "@/domain/tour";

export type NavItem = { href: Route; label: string; icon: LucideIcon; tour?: TourTarget };

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, tour: "nav-jobs" },
  { href: "/schedule", label: "Schedule", icon: CalendarClock, tour: "nav-schedule" },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/fleet", label: "Fleet", icon: CarFront },
  { href: "/insights", label: "Insights", icon: ChartColumn, tour: "nav-insights" },
];

export function isActive(pathname: string, href: Route): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
