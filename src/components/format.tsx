"use client";

import { createContext, use, type ReactNode } from "react";
import { dayRange, isWithin, tripWindow } from "@/domain/time";
import { durationLabel } from "@/domain/trip-form";

const TimeZoneContext = createContext<string | null>(null);

export function TimeZoneProvider({ timeZone, children }: { timeZone: string; children: ReactNode }) {
  return <TimeZoneContext value={timeZone}>{children}</TimeZoneContext>;
}

const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dollarsAndCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function formatMoney(cents: number): string {
  return (cents % 100 === 0 ? wholeDollars : dollarsAndCents).format(cents / 100);
}

const compactMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" });

export function formatCompactMoney(cents: number): string {
  return compactMoney.format(cents / 100);
}

export function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

function createFormat(timeZone: string) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" });
  const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric" });
  const shortDay = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" });
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
  return {
    money: formatMoney,
    compactMoney: formatCompactMoney,
    fileSize: formatFileSize,
    duration: durationLabel,
    time: (iso: string) => time.format(new Date(iso)),
    timeRange: (iso: string, minutes: number) => {
      const window = tripWindow(new Date(iso), minutes);
      return `${time.format(window.start)} – ${time.format(window.end)}`;
    },
    day: (iso: string) => day.format(new Date(iso)),
    hour: (iso: string) => hour.format(new Date(iso)),
    shortDay: (iso: string) => shortDay.format(new Date(iso)),
    weekday: (iso: string) => weekday.format(new Date(iso)),
    isToday: (iso: string) => isWithin(new Date(iso), dayRange(new Date(), timeZone)),
    when: (iso: string) => {
      const at = new Date(iso);
      const clock = time.format(at);
      return isWithin(at, dayRange(new Date(), timeZone)) ? clock : `${shortDay.format(at)}, ${clock}`;
    },
  };
}

const formatsByTimeZone = new Map<string, ReturnType<typeof createFormat>>();

function formatFor(timeZone: string) {
  const known = formatsByTimeZone.get(timeZone);
  if (known) return known;
  const created = createFormat(timeZone);
  formatsByTimeZone.set(timeZone, created);
  return created;
}

export function useFormat() {
  const timeZone = use(TimeZoneContext);
  if (!timeZone) throw new Error("useFormat needs a TimeZoneProvider above it.");
  return formatFor(timeZone);
}
