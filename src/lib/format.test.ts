import { describe, expect, it } from "vitest";
import { formatDateTime } from "./format";

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
