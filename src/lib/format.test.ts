import { describe, expect, it } from "vitest";
import {
  calendarTile,
  formatClock,
  formatDateTime,
  formatLongDay,
  formatRangeEnd,
  formatRelativeDay,
  formatTimeRange,
  lagosDaysFromToday,
} from "./format";

// 1 Nov 2026, 22:30 in Lagos (21:30 UTC).
const NOW = Date.parse("2026-11-01T21:30:00Z");

describe("formatDateTime", () => {
  it("shows the Lagos day and 12-hour time", () => {
    expect(formatDateTime("2026-11-07T09:00:00Z", { now: NOW })).toBe("Sat, 7 Nov · 10:00 AM");
    expect(formatDateTime("2026-11-10T17:00:00Z", { now: NOW })).toBe("Tue, 10 Nov · 6:00 PM");
  });

  it("shows noon as 12 PM and midnight as 12 AM, with no leading zero", () => {
    expect(formatDateTime("2026-11-07T11:00:00Z", { now: NOW })).toBe("Sat, 7 Nov · 12:00 PM");
    expect(formatDateTime("2026-11-06T23:30:00Z", { now: NOW })).toBe("Sat, 7 Nov · 12:30 AM");
    expect(formatDateTime("2026-11-07T07:05:00Z", { now: NOW })).toBe("Sat, 7 Nov · 8:05 AM");
  });

  it("uses the Lagos date when UTC is still the day before, and adds another year", () => {
    expect(formatDateTime("2026-12-31T23:15:00Z", { now: NOW })).toBe("Fri, 1 Jan 2027 · 12:15 AM");
    expect(formatDateTime("2025-11-05T18:00:00Z", { now: NOW })).toBe("Wed, 5 Nov 2025 · 7:00 PM");
  });

  it("accepts an offset other than Z", () => {
    expect(formatDateTime("2026-11-07T10:00:00+01:00", { now: NOW })).toBe("Sat, 7 Nov · 10:00 AM");
  });

  it("works without now, keeping the same shape", () => {
    expect(formatDateTime("2026-11-05T18:00:00Z")).toMatch(/^Thu, 5 Nov( 2026)? · 7:00 PM$/);
  });

  it("returns unparseable input as is", () => {
    expect(formatDateTime("soon")).toBe("soon");
    expect(formatDateTime("soon", { now: NOW, relative: true })).toBe("soon");
  });

  describe("relative", () => {
    it("says Today and Tomorrow by the Lagos date", () => {
      expect(formatDateTime("2026-11-01T22:00:00Z", { now: NOW, relative: true })).toBe("Today · 11:00 PM");
      // 23:30 UTC is already 2 Nov in Lagos.
      expect(formatDateTime("2026-11-01T23:30:00Z", { now: NOW, relative: true })).toBe("Tomorrow · 12:30 AM");
      expect(formatDateTime("2026-11-02T07:00:00Z", { now: NOW, relative: true })).toBe("Tomorrow · 8:00 AM");
    });

    it("falls back to the normal format further out", () => {
      expect(formatDateTime("2026-11-05T18:00:00Z", { now: NOW, relative: true })).toBe("Thu, 5 Nov · 7:00 PM");
      expect(formatDateTime("2027-01-08T11:00:00Z", { now: NOW, relative: true })).toBe(
        "Fri, 8 Jan 2027 · 12:00 PM",
      );
    });
  });
});

describe("formatTimeRange", () => {
  it("shows the date once when start and end are the same Lagos day", () => {
    expect(formatTimeRange("2026-11-07T15:00:00Z", "2026-11-07T18:00:00Z", { now: NOW })).toBe(
      "Sat, 7 Nov · 4:00 PM – 7:00 PM",
    );
    // 22:30 UTC is 11:30 PM in Lagos: still the same day.
    expect(formatTimeRange("2026-11-07T19:00:00Z", "2026-11-07T22:30:00Z", { now: NOW })).toBe(
      "Sat, 7 Nov · 8:00 PM – 11:30 PM",
    );
  });

  it("repeats the date when the event runs past midnight in Lagos", () => {
    // 23:30 UTC on the 7th is already 8 Nov in Lagos, though UTC says the same day.
    expect(formatTimeRange("2026-11-07T19:00:00Z", "2026-11-07T23:30:00Z", { now: NOW })).toBe(
      "Sat, 7 Nov · 8:00 PM – Sun, 8 Nov · 12:30 AM",
    );
    expect(formatTimeRange("2026-12-31T20:00:00Z", "2027-01-01T02:00:00Z", { now: NOW })).toBe(
      "Thu, 31 Dec · 9:00 PM – Fri, 1 Jan 2027 · 3:00 AM",
    );
  });

  it("gives just the end time from formatRangeEnd on the same day", () => {
    expect(formatRangeEnd("2026-11-07T15:00:00Z", "2026-11-07T18:00:00Z", { now: NOW })).toBe("7:00 PM");
  });

  it("returns an unparseable end as is", () => {
    expect(formatRangeEnd("2026-11-07T15:00:00Z", "later")).toBe("later");
  });
});

describe("formatRelativeDay", () => {
  it("gives just the day", () => {
    expect(formatRelativeDay("2026-11-02T07:00:00Z", NOW)).toBe("Tomorrow");
    expect(formatRelativeDay("2026-11-05T18:00:00Z", NOW)).toBe("Thu, 5 Nov");
  });
});

describe("lagosDaysFromToday", () => {
  it("counts Lagos calendar days, not 24-hour blocks", () => {
    expect(lagosDaysFromToday("2026-11-01T22:59:00Z", NOW)).toBe(0);
    expect(lagosDaysFromToday("2026-11-01T23:00:00Z", NOW)).toBe(1);
    expect(lagosDaysFromToday("2026-11-08T22:59:00Z", NOW)).toBe(7);
  });
});

describe("formatLongDay", () => {
  it("writes the weekday and month in full, in Lagos", () => {
    expect(formatLongDay("2026-11-05T17:00:00Z", NOW)).toBe("Thursday, 5 November");
    expect(formatLongDay("2026-12-31T23:15:00Z", NOW)).toBe("Friday, 1 January 2027");
  });
});

describe("formatClock and calendarTile", () => {
  it("give the Lagos time and day", () => {
    expect(formatClock("2026-11-05T17:00:00Z")).toBe("6:00 PM");
    expect(calendarTile("2026-11-04T23:30:00Z")).toEqual({ month: "Nov", day: "5" });
  });
});
