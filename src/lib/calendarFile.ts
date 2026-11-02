// calendarFile: an .ics file for "Add to calendar", built in the browser. No request is made.
//
//   downloadCalendarFile({ id, title, startsAt, endsAt, location, url });
//
// - Times are written in UTC ("20261105T170000Z"), so every calendar app shows them in its own
//   time zone correctly.
// - Text is escaped as RFC 5545 asks (backslash, semicolon, comma, new line), and long lines are
//   folded at 75 octets.

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  /** Link back to the event page, added to the description. */
  url?: string;
};

/** "2026-11-05T17:00:00Z" → "20261105T170000Z". */
export function icsDate(isoDateTime: string): string {
  return new Date(isoDateTime).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Splits a line into 75-octet pieces; each continuation starts with a space. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const pieces: string[] = [];
  let current = "";
  for (const char of Array.from(line)) {
    const limit = pieces.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      pieces.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  pieces.push(current);
  return pieces.join("\r\n ");
}

export function buildCalendarFile(event: CalendarEvent, now: number): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FairSeat//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@fairseat`,
    `DTSTAMP:${icsDate(new Date(now).toISOString())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.location)}`,
    ...(event.url ? [`DESCRIPTION:${icsText(event.url)}`, `URL:${event.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** "React Lagos meetup" → "react-lagos-meetup.ics". */
export function calendarFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "event"}.ics`;
}

export function downloadCalendarFile(event: CalendarEvent): void {
  const blob = new Blob([buildCalendarFile(event, Date.now())], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = calendarFileName(event.title);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
