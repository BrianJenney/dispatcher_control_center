"use client";

import { createContext, use, type ReactNode } from "react";

const TimeZoneContext = createContext("UTC");

export function TimeZoneProvider({ timeZone, children }: { timeZone: string; children: ReactNode }) {
  return <TimeZoneContext value={timeZone}>{children}</TimeZoneContext>;
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function useFormat() {
  const timeZone = use(TimeZoneContext);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" });
  const hour = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric" });
  return {
    money: formatMoney,
    time: (iso: string) => time.format(new Date(iso)),
    day: (iso: string) => day.format(new Date(iso)),
    hour: (iso: string) => hour.format(new Date(iso)),
  };
}
