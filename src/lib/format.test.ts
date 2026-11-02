import { describe, expect, it } from "vitest";
import { formatDateTime, formatRelativeDay, lagosDaysFromToday } from "./format";

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
