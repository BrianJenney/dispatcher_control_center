export type TimeRange = { start: Date; end: Date };

const minuteMs = 60_000;

type ZonedDate = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function zonedDate(instant: Date, timeZone: string): ZonedDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const zoned = zonedDate(instant, timeZone);
  const wallClockAsUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
  return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

function startOfZonedDay(year: number, month: number, day: number, timeZone: string): Date {
  const midnightAsUtc = Date.UTC(year, month - 1, day);
  const firstGuess = midnightAsUtc - zoneOffsetMs(new Date(midnightAsUtc), timeZone);
  return new Date(midnightAsUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

export function dayRange(instant: Date, timeZone: string): TimeRange {
  const today = zonedDate(instant, timeZone);
  const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  return {
    start: startOfZonedDay(today.year, today.month, today.day, timeZone),
    end: startOfZonedDay(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), timeZone),
  };
}

export function shiftDays(day: TimeRange, days: number, timeZone: string): TimeRange {
  const middayOfTarget = day.start.getTime() + days * 24 * 60 * minuteMs + 12 * 60 * minuteMs;
  return dayRange(new Date(middayOfTarget), timeZone);
}

export function isWithin(instant: Date, range: TimeRange): boolean {
  return instant >= range.start && instant < range.end;
}

export function tripWindow(pickupAt: Date, durationMinutes: number): TimeRange {
  return { start: pickupAt, end: new Date(pickupAt.getTime() + durationMinutes * minuteMs) };
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}
