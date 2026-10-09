import { BriefcaseBusiness, CalendarClock, CarFront, ChartColumn, History, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import type { TourTarget } from "@/domain/tour";

export type NavItem = { href: Route; label: string; icon: LucideIcon; tour?: TourTarget; onPhone: boolean };

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, onPhone: true },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness, tour: "nav-jobs", onPhone: true },
  { href: "/schedule", label: "Schedule", icon: CalendarClock, tour: "nav-schedule", onPhone: true },
  { href: "/drivers", label: "Drivers", icon: Users, onPhone: true },
  { href: "/fleet", label: "Fleet", icon: CarFront, onPhone: true },
  { href: "/insights", label: "Insights", icon: ChartColumn, tour: "nav-insights", onPhone: true },
  { href: "/activity", label: "Activity", icon: History, onPhone: false },
];

export const phoneNavItems = navItems.filter((item) => item.onPhone);

export function isActive(pathname: string, href: Route): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
