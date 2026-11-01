// Format: dates as people read them. Times always show in Africa/Lagos, whatever the
// device's own time zone.
// - formatDateTime: "Sat 7 Nov 2026 · 10:00", 24-hour. Detail pages, sign-ups, notices.
// - formatRelativeDateTime: "Tomorrow · 8:00 AM", "Thu, 5 Nov · 7:00 PM". The Discover list, as
//   in its design. It needs `now`, so callers pass it in (useNow) instead of reading the clock.

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Africa/Lagos",
});

/** "2026-11-07T09:00:00Z" → "Sat 7 Nov 2026 · 10:00". Unparseable input is returned as is. */
export function formatDateTime(isoDateTime: string): string {
  const time = Date.parse(isoDateTime);
  if (Number.isNaN(time)) return isoDateTime;
  // Built from parts so the separators don't depend on the browser's en-GB punctuation.
  const parts = Object.fromEntries(DATE_TIME_FORMAT.formatToParts(time).map((part) => [part.type, part.value]));
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year} · ${parts.hour}:${parts.minute}`;
}

/** True for a real calendar day written "YYYY-MM-DD" (the yaml's `format: date`). "2026-02-30" is false. */
export function isDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const LAGOS_DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Africa/Lagos",
});

/** The Lagos calendar day of an instant, as days since 1 Jan 1970, so day differences are a subtraction. */
export function lagosDayNumber(time: number): number {
  const parts = Object.fromEntries(LAGOS_DAY_FORMAT.formatToParts(time).map((part) => [part.type, part.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000;
}

/** 0 when the instant falls on today's Lagos date, 1 tomorrow, -1 yesterday. NaN when unparseable. */
export function lagosDaysFromToday(isoDateTime: string, now: number): number {
  const time = Date.parse(isoDateTime);
  if (Number.isNaN(time)) return Number.NaN;
  return lagosDayNumber(time) - lagosDayNumber(now);
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

function dayParts(time: number): Record<string, string> {
  return Object.fromEntries(DAY_FORMAT.formatToParts(time).map((part) => [part.type, part.value]));
}

/** "Today", "Tomorrow", "Thu, 5 Nov". The year is added when it isn't this year. */
export function formatRelativeDay(isoDateTime: string, now: number): string {
  const days = lagosDaysFromToday(isoDateTime, now);
  if (Number.isNaN(days)) return isoDateTime;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  const parts = dayParts(Date.parse(isoDateTime));
  const day = `${parts.weekday}, ${parts.day} ${parts.month}`;
  return parts.year === dayParts(now).year ? day : `${day} ${parts.year}`;
}

/** "8:00 AM", "7:30 PM" in Lagos. Built from parts: some browsers put a narrow space before AM. */
export function formatClockTime(isoDateTime: string): string {
  const time = Date.parse(isoDateTime);
  if (Number.isNaN(time)) return isoDateTime;
  const parts = Object.fromEntries(CLOCK_FORMAT.formatToParts(time).map((part) => [part.type, part.value]));
  return `${parts.hour}:${parts.minute} ${parts.dayPeriod.toUpperCase()}`;
}

/** "Tomorrow · 8:00 AM", "Thu, 5 Nov · 7:00 PM". */
export function formatRelativeDateTime(isoDateTime: string, now: number): string {
  if (Number.isNaN(Date.parse(isoDateTime))) return isoDateTime;
  return `${formatRelativeDay(isoDateTime, now)} · ${formatClockTime(isoDateTime)}`;
}
