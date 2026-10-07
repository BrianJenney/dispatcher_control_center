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

const wallClock = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function zonedWallTime(date: string, time: string, timeZone: string): Date {
  const match = wallClock.exec(`${date}T${time}`);
  if (!match) throw new Error(`Not a wall clock time: ${date} ${time}`);
  const [, year, month, day, hour, minute] = match.map(Number);
  const asUtc = Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0);
  const firstGuess = asUtc - zoneOffsetMs(new Date(asUtc), timeZone);
  return new Date(asUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

export function wallTimeOf(instant: Date, timeZone: string): { date: string; time: string } {
  const zoned = zonedDate(instant, timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${String(zoned.year)}-${pad(zoned.month)}-${pad(zoned.day)}`,
    time: `${pad(zoned.hour)}:${pad(zoned.minute)}`,
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
