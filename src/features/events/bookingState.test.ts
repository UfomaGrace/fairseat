import { describe, expect, it } from "vitest";
import type { FairEvent, Signup, SignupStatus, User } from "../../api/types";
import { bookingState, relativeDayLabel } from "./bookingState";

// 2 Nov 2026, 10:00 in Lagos.
const NOW = Date.parse("2026-11-02T09:00:00Z");

const ORGANISER: User = { id: "org-1", email: "tolu@fairseat.demo", displayName: "Tolu Adebayo", role: "ORGANISER" };
const ATTENDEE: User = { id: "att-1", email: "amaka@fairseat.demo", displayName: "Amaka Obi", role: "ATTENDEE" };
const ADMIN: User = { id: "adm-1", email: "admin@fairseat.demo", displayName: "Admin", role: "ADMIN" };

const EVENT: FairEvent = {
  id: "ev-1",
  title: "React Lagos meetup",
  description: "Talks.",
  category: "TECH",
  location: "Yaba, Lagos",
  startsAt: "2026-11-05T17:00:00Z",
  endsAt: "2026-11-05T20:00:00Z",
  seats: 40,
  seatsTaken: 16,
  seatsAvailable: 24,
  goingCount: 16,
  offeredCount: 0,
  waitingCount: 0,
  status: "SCHEDULED",
  organiser: { id: "org-1", displayName: "Tolu Adebayo" },
  mySignup: null,
  asOf: "2026-11-02T09:00:00Z",
};

function signup(status: SignupStatus): Signup {
  return {
    id: "su-1",
    event: { id: EVENT.id, title: EVENT.title, location: EVENT.location, startsAt: EVENT.startsAt, endsAt: EVENT.endsAt, status: "SCHEDULED" },
    status,
    waitingPosition: status === "WAITING" ? 2 : null,
    offerExpiresAt: status === "OFFERED" ? "2026-11-03T09:00:00Z" : null,
    createdAt: EVENT.asOf,
    updatedAt: EVENT.asOf,
    asOf: EVENT.asOf,
  };
}

describe("bookingState", () => {
  it("reads the seat state for visitors and attendees without a sign-up", () => {
    expect(bookingState(EVENT, null, NOW).kind).toBe("free");
    expect(bookingState({ ...EVENT, seatsAvailable: 2 }, ATTENDEE, NOW).kind).toBe("low");
    expect(bookingState({ ...EVENT, seatsAvailable: 0 }, ATTENDEE, NOW).kind).toBe("full");
  });

  it("follows the attendee's sign-up", () => {
    expect(bookingState({ ...EVENT, mySignup: signup("GOING") }, ATTENDEE, NOW).kind).toBe("going");
    expect(bookingState({ ...EVENT, mySignup: signup("WAITING") }, ATTENDEE, NOW).kind).toBe("waiting");
    expect(bookingState({ ...EVENT, mySignup: signup("OFFERED") }, ATTENDEE, NOW).kind).toBe("offer");
    expect(bookingState({ ...EVENT, mySignup: signup("OFFER_EXPIRED") }, ATTENDEE, NOW).kind).toBe("expired");
    expect(bookingState({ ...EVENT, mySignup: signup("CANCELLED") }, ATTENDEE, NOW).kind).toBe("free");
  });

  it("ignores a sign-up when signed out", () => {
    expect(bookingState({ ...EVENT, mySignup: signup("GOING") }, null, NOW).kind).toBe("free");
  });

  it("shows the organiser view only on the organiser's own event, admins included", () => {
    expect(bookingState(EVENT, ORGANISER, NOW).kind).toBe("organiser");
    expect(bookingState(EVENT, { ...ORGANISER, id: "org-2" }, NOW).kind).toBe("viewer");
    expect(bookingState(EVENT, ADMIN, NOW).kind).toBe("viewer");
    expect(bookingState({ ...EVENT, organiser: { id: ADMIN.id, displayName: "Admin" } }, ADMIN, NOW).kind).toBe("organiser");
  });

  it("puts cancelled and started before everything else", () => {
    expect(bookingState({ ...EVENT, status: "CANCELLED" }, ORGANISER, NOW).kind).toBe("cancelled");
    expect(bookingState({ ...EVENT, mySignup: signup("GOING") }, ATTENDEE, Date.parse(EVENT.startsAt))).toEqual({
      kind: "started",
      ended: false,
    });
    expect(bookingState(EVENT, null, Date.parse(EVENT.endsAt))).toEqual({ kind: "started", ended: true });
  });
});

describe("relativeDayLabel", () => {
  it("counts Lagos days", () => {
    expect(relativeDayLabel(EVENT, NOW)).toBe("In 3 days");
    expect(relativeDayLabel({ ...EVENT, startsAt: "2026-11-03T09:00:00Z" }, NOW)).toBe("Tomorrow");
    expect(relativeDayLabel({ ...EVENT, startsAt: "2026-11-02T17:00:00Z" }, NOW)).toBe("Today");
  });

  it("says when it is on, over or cancelled", () => {
    expect(relativeDayLabel(EVENT, Date.parse("2026-11-05T18:00:00Z"))).toBe("Happening now");
    expect(relativeDayLabel(EVENT, Date.parse("2026-11-06T18:00:00Z"))).toBe("Ended");
    expect(relativeDayLabel({ ...EVENT, status: "CANCELLED" }, NOW)).toBe("Cancelled");
  });
});
