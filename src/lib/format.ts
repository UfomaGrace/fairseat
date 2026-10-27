// Format: dates as people read them. Times always show in Africa/Lagos, whatever the
// device's own time zone.

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Africa/Lagos",
});

/** "2026-11-07T15:00:00Z" → "Sat 7 Nov 2026, 4:00 pm". Unparseable input is returned as is. */
export function formatDateTime(isoDateTime: string): string {
  const time = Date.parse(isoDateTime);
  return Number.isNaN(time) ? isoDateTime : DATE_TIME_FORMAT.format(time);
}

/** True for a real calendar day written "YYYY-MM-DD" (the yaml's `format: date`). "2026-02-30" is false. */
export function isDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
