import { describe, expect, it } from "vitest";
import { formatDateTime, formatRelativeDateTime, lagosDaysFromToday } from "./format";

describe("formatDateTime", () => {
  it("shows the Lagos day and 24-hour time", () => {
    expect(formatDateTime("2026-11-07T09:00:00Z")).toBe("Sat 7 Nov 2026 · 10:00");
    expect(formatDateTime("2026-11-10T17:00:00Z")).toBe("Tue 10 Nov 2026 · 18:00");
  });

  it("pads single-digit hours and shows midnight as 00", () => {
    expect(formatDateTime("2026-11-07T07:05:00Z")).toBe("Sat 7 Nov 2026 · 08:05");
    expect(formatDateTime("2026-11-06T23:30:00Z")).toBe("Sat 7 Nov 2026 · 00:30");
  });

  it("uses the Lagos date when UTC is still the day before", () => {
    expect(formatDateTime("2026-12-31T23:15:00Z")).toBe("Fri 1 Jan 2027 · 00:15");
  });

  it("accepts an offset other than Z", () => {
    expect(formatDateTime("2026-11-07T10:00:00+01:00")).toBe("Sat 7 Nov 2026 · 10:00");
  });

  it("returns unparseable input as is", () => {
    expect(formatDateTime("soon")).toBe("soon");
  });
});

// 1 Nov 2026, 22:30 in Lagos (21:30 UTC).
const NOW = Date.parse("2026-11-01T21:30:00Z");

describe("formatRelativeDateTime", () => {
  it("says Today and Tomorrow by the Lagos date", () => {
    expect(formatRelativeDateTime("2026-11-01T22:00:00Z", NOW)).toBe("Today · 11:00 PM");
    // 23:30 UTC is already 2 Nov in Lagos.
    expect(formatRelativeDateTime("2026-11-01T23:30:00Z", NOW)).toBe("Tomorrow · 12:30 AM");
    expect(formatRelativeDateTime("2026-11-02T07:00:00Z", NOW)).toBe("Tomorrow · 8:00 AM");
  });

  it("names the day further out, with the year only when it differs", () => {
    expect(formatRelativeDateTime("2026-11-05T18:00:00Z", NOW)).toBe("Thu, 5 Nov · 7:00 PM");
    expect(formatRelativeDateTime("2027-01-08T11:00:00Z", NOW)).toBe("Fri, 8 Jan 2027 · 12:00 PM");
  });

  it("returns unparseable input as is", () => {
    expect(formatRelativeDateTime("soon", NOW)).toBe("soon");
  });
});

describe("lagosDaysFromToday", () => {
  it("counts Lagos calendar days, not 24-hour blocks", () => {
    expect(lagosDaysFromToday("2026-11-01T22:59:00Z", NOW)).toBe(0);
    expect(lagosDaysFromToday("2026-11-01T23:00:00Z", NOW)).toBe(1);
    expect(lagosDaysFromToday("2026-11-08T22:59:00Z", NOW)).toBe(7);
  });
});
