import { describe, expect, it } from "vitest";
import type { FairEvent, Signup } from "../../api/types";
import { bookingAnnouncement, bookingStatusText, formatTimeLeft, lineRow } from "./bookingText";

const EVENT = {
  seats: 40,
  seatsTaken: 38,
  seatsAvailable: 2,
  waitingCount: 6,
} as Pick<FairEvent, "seats" | "seatsTaken" | "seatsAvailable" | "waitingCount"> as FairEvent;

const OFFER = { offerExpiresAt: "2026-11-03T09:00:00Z", waitingPosition: null } as Pick<
  Signup,
  "offerExpiresAt" | "waitingPosition"
> as Signup;

describe("formatTimeLeft", () => {
  it("shows hours and minutes, rounding minutes up", () => {
    expect(formatTimeLeft((23 * 60 + 40) * 60_000 + 1)).toBe("23h 41m");
    expect(formatTimeLeft(59 * 60_000)).toBe("59m");
    expect(formatTimeLeft(1)).toBe("1m");
    expect(formatTimeLeft(-5)).toBe("0m");
  });
});

describe("bookingStatusText", () => {
  it("gives the phone bar's line for each state", () => {
    expect(bookingStatusText(EVENT, { kind: "low" }, 0)).toBe("Only 2 left");
    expect(bookingStatusText(EVENT, { kind: "full" }, 0)).toBe("Full · 6 in line");
    expect(bookingStatusText(EVENT, { kind: "organiser" }, 0)).toBe("You're hosting · 38 of 40 taken");
    expect(bookingStatusText(EVENT, { kind: "waiting", signup: { ...OFFER, waitingPosition: 2 } }, 0)).toBe(
      "You're #2 in line",
    );
    const now = Date.parse("2026-11-02T09:19:00Z");
    expect(bookingStatusText(EVENT, { kind: "offer", signup: OFFER }, now)).toBe("23h 41m left to accept");
    expect(bookingStatusText(EVENT, { kind: "started", ended: true }, 0)).toBe("This event has ended");
  });

  it("announces without the countdown", () => {
    expect(bookingAnnouncement(EVENT, { kind: "offer", signup: OFFER })).not.toMatch(/\d+h/);
    expect(bookingAnnouncement(EVENT, { kind: "low" })).toBe("Only 2 left.");
  });
});

describe("lineRow", () => {
  it("puts You at the position, at most six spots", () => {
    expect(lineRow(2, 6)).toEqual([1, "you", 3, 4, 5, 6]);
    expect(lineRow(1, 1)).toEqual(["you"]);
    expect(lineRow(3, 20)).toEqual([1, 2, "you", 4, 5, 6]);
    expect(lineRow(9, 12)).toEqual([1, 2, 3, "gap", "you"]);
  });
});
