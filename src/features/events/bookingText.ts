// bookingText: the booking panel's words that are worked out, not written: time left on an
// offer, the phone bar's status line, the live-region announcement and the row of people in line.
// Pure, so they are tested without a browser.

import type { FairEvent, Signup } from "../../api/types";
import type { BookingState } from "./bookingState";

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** 85_260_000 → "23h 41m"; minutes round up, so it never shows 0m while time is left. */
export function formatTimeLeft(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function offerMsLeft(signup: Signup, now: number): number {
  return signup.offerExpiresAt ? Date.parse(signup.offerExpiresAt) - now : Number.NaN;
}

/** The short line for the phone bar: "Only 2 left", "You're #2 in line", "23h 41m left to accept". */
export function bookingStatusText(event: FairEvent, state: BookingState, now: number): string {
  switch (state.kind) {
    case "free":
    case "viewer":
      return event.seatsAvailable > 0 ? plural(event.seatsAvailable, "seat left", "seats left") : `Full · ${event.waitingCount} in line`;
    case "low":
      return `Only ${event.seatsAvailable} left`;
    case "full":
      return `Full · ${event.waitingCount} in line`;
    case "going":
      return "You're going";
    case "waiting":
      return state.signup.waitingPosition ? `You're #${state.signup.waitingPosition} in line` : "You're in line";
    case "offer": {
      const ms = offerMsLeft(state.signup, now);
      return ms > 0 ? `${formatTimeLeft(ms)} left to accept` : "Your offer has ended";
    }
    case "expired":
      return "Your offer expired";
    case "organiser":
      return `You're hosting · ${event.seatsTaken} of ${event.seats} taken`;
    case "started":
      return state.ended ? "This event has ended" : "This event has started";
    case "cancelled":
      return "This event was cancelled";
  }
}

/** For the page's live region: what changed, without the ticking countdown. */
export function bookingAnnouncement(event: FairEvent, state: BookingState): string {
  switch (state.kind) {
    case "offer":
      return "A seat opened up for you. Accept it before the offer ends.";
    case "going":
      return "You're going. Your seat is saved.";
    case "waiting":
      return state.signup.waitingPosition
        ? `You're number ${state.signup.waitingPosition} in line.`
        : "You're in line.";
    case "expired":
      return "Your seat offer expired.";
    case "cancelled":
      return "This event was cancelled.";
    case "started":
      return state.ended ? "This event has ended." : "This event has started. Booking is closed.";
    default:
      return bookingStatusText(event, state, 0) + ".";
  }
}

/** The line as a row of people: 1, You, 3, … with at most six circles. */
export function lineRow(position: number, waiting: number): (number | "you" | "gap")[] {
  const count = Math.max(waiting, position);
  if (position <= 6) {
    return Array.from({ length: Math.min(count, 6) }, (_, i) => (i + 1 === position ? "you" : i + 1));
  }
  return [1, 2, 3, "gap", "you"];
}
