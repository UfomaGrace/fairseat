// Format: dates as people read them. Times always show in Africa/Lagos, whatever the
// device's own time zone.
//
// One date-and-time format everywhere, 12-hour with AM/PM:
//
//   formatDateTime(iso)                           "Thu, 5 Nov · 7:00 PM"
//   formatDateTime(iso, { now })                  "Fri, 8 Jan 2027 · 12:00 PM" (another year)
//   formatDateTime(iso, { now, relative: true })  "Tomorrow · 8:00 AM" (Discover)
//   formatTimeRange(start, end)                   "Sat, 7 Nov · 4:00 PM – 7:00 PM"
//                                                 "Sat, 7 Nov · 8:00 PM – Sun, 8 Nov · 1:00 AM"
//
// - The year is added only when it isn't the current year. Without `now`, "current" means the
//   year when the app loaded, so render never reads the clock (pass useNow's value to be exact).
// - formatRelativeDay gives just the day: "Today", "Tomorrow", "Thu, 5 Nov".

/** The clock when this module loaded: the default "now" for the year rule. */
const LOADED_AT = Date.now();

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

const LAGOS_DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Africa/Lagos",
});

// Built from parts so the separators don't depend on the browser's punctuation.
function partsOf(format: Intl.DateTimeFormat, time: number): Record<string, string> {
  return Object.fromEntries(format.formatToParts(time).map((part) => [part.type, part.value]));
}

/** The Lagos calendar day of an instant, as days since 1 Jan 1970, so day differences are a subtraction. */
export function lagosDayNumber(time: number): number {
  const parts = partsOf(LAGOS_DAY_FORMAT, time);
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000;
}

/** 0 when the instant falls on today's Lagos date, 1 tomorrow, -1 yesterday. NaN when unparseable. */
export function lagosDaysFromToday(isoDateTime: string, now: number): number {
  const time = Date.parse(isoDateTime);
  if (Number.isNaN(time)) return Number.NaN;
  return lagosDayNumber(time) - lagosDayNumber(now);
}

/** "Thu, 5 Nov", plus the year when it isn't now's year. */
function calendarDay(time: number, now: number): string {
  const parts = partsOf(DAY_FORMAT, time);
  const day = `${parts.weekday}, ${parts.day} ${parts.month}`;
  return parts.year === partsOf(DAY_FORMAT, now).year ? day : `${day} ${parts.year}`;
}

/** "Today", "Tomorrow", "Thu, 5 Nov" (with the year when it isn't this year). */
export function formatRelativeDay(isoDateTime: string, now: number): string {
  const time = Date.parse(isoDateTime);
  if (Number.isNaN(time)) return isoDateTime;
  const days = lagosDayNumber(time) - lagosDayNumber(now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return calendarDay(time, now);
}

export type DateTimeOptions = {
  /** For the year rule and relative days. Defaults to when the app loaded. */
  now?: number;
  /** "Today" / "Tomorrow" in place of the date when they apply. */
  relative?: boolean;
};

/** "2026-11-05T18:00:00Z" → "Thu, 5 Nov · 7:00 PM". Unparseable input is returned as is. */
export function formatDateTime(isoDateTime: string, { now = LOADED_AT, relative = false }: DateTimeOptions = {}): string {
  const time = Date.parse(isoDateTime);
  if (Number.isNaN(time)) return isoDateTime;
  const day = relative ? formatRelativeDay(isoDateTime, now) : calendarDay(time, now);
  const clock = partsOf(CLOCK_FORMAT, time);
  return `${day} · ${clock.hour}:${clock.minute} ${clock.dayPeriod.toUpperCase()}`;
}

/**
 * The end of a range: just "7:00 PM" when it falls on the start's Lagos day, otherwise the full
 * "Sun, 8 Nov · 1:00 AM". Lets a page wrap start and end in their own <time> elements.
 */
export function formatRangeEnd(startIso: string, endIso: string, options: DateTimeOptions = {}): string {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(end)) return endIso;
  if (!Number.isNaN(start) && lagosDayNumber(start) === lagosDayNumber(end)) {
    const clock = partsOf(CLOCK_FORMAT, end);
    return `${clock.hour}:${clock.minute} ${clock.dayPeriod.toUpperCase()}`;
  }
  return formatDateTime(endIso, { ...options, relative: false });
}

/** "Sat, 7 Nov · 4:00 PM – 7:00 PM"; the date is repeated only when the event spans days. */
export function formatTimeRange(startIso: string, endIso: string, options: DateTimeOptions = {}): string {
  return `${formatDateTime(startIso, options)} – ${formatRangeEnd(startIso, endIso, options)}`;
}

/** True for a real calendar day written "YYYY-MM-DD" (the yaml's `format: date`). "2026-02-30" is false. */
export function isDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
