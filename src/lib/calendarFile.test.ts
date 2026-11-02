import { describe, expect, it } from "vitest";
import { buildCalendarFile, calendarFileName, icsDate, icsText } from "./calendarFile";

const EVENT = {
  id: "9b2e0c44-0000-4000-8000-000000000201",
  title: "React Lagos meetup",
  startsAt: "2026-11-05T17:00:00Z",
  endsAt: "2026-11-05T20:00:00+00:00",
  location: "Yaba, Lagos",
  url: "https://fairseat.example/events/9b2e0c44",
};

describe("calendarFile", () => {
  it("writes times in UTC", () => {
    expect(icsDate("2026-11-05T18:00:00+01:00")).toBe("20261105T170000Z");
  });

  it("escapes commas, semicolons, backslashes and new lines", () => {
    expect(icsText("Yaba, Lagos; a\\b\nnext")).toBe("Yaba\\, Lagos\\; a\\\\b\\nnext");
  });

  it("builds one event with CRLF line ends", () => {
    const file = buildCalendarFile(EVENT, Date.parse("2026-11-02T10:00:00Z"));
    expect(file).toContain("\r\nDTSTART:20261105T170000Z\r\n");
    expect(file).toContain("\r\nDTEND:20261105T200000Z\r\n");
    expect(file).toContain("\r\nSUMMARY:React Lagos meetup\r\n");
    expect(file).toContain("\r\nLOCATION:Yaba\\, Lagos\r\n");
    expect(file).toContain("\r\nDTSTAMP:20261102T100000Z\r\n");
    expect(file.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(file.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("folds lines longer than 75 octets", () => {
    const file = buildCalendarFile({ ...EVENT, title: "x".repeat(200) }, 0);
    for (const line of file.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("names the file after the title", () => {
    expect(calendarFileName("React Lagos meetup!")).toBe("react-lagos-meetup.ics");
    expect(calendarFileName("***")).toBe("event.ics");
  });
});
