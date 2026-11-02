// bookingState: which of the booking panel's states an event is in for the person looking at it.
// Pure, so every state is tested without a browser.
//
//   const state = bookingState(event, user, now);
//   switch (state.kind) { case "offer": … }
//
// In order, the first that fits wins:
//   cancelled   event.status is CANCELLED
//   started     now >= startsAt (ended too: state.ended)
//   organiser   the event's own organiser (an ORGANISER, or an ADMIN on their own event)
//   offer / going / waiting / expired   the signed-in attendee's sign-up
//   viewer      any other organiser or admin: they see the seats but can't book
//   full / low / free                   from seatsAvailable (LOW_SEATS in lib/labels)
//
// Also: relativeDayLabel ("In 3 days", "Tomorrow", "Happening now", "Cancelled") for the band's pill.

import type { FairEvent, Signup, User } from "../../api/types";
import { lagosDaysFromToday } from "../../lib/format";
import { seatState } from "../../lib/labels";

export type BookingState =
  | { kind: "cancelled" }
  | { kind: "started"; ended: boolean }
  | { kind: "organiser" }
  | { kind: "offer"; signup: Signup }
  | { kind: "going"; signup: Signup }
  | { kind: "waiting"; signup: Signup }
  | { kind: "expired"; signup: Signup }
  | { kind: "viewer" }
  | { kind: "full" }
  | { kind: "low" }
  | { kind: "free" };

export type BookingKind = BookingState["kind"];

export function isOwnEvent(user: User | null, event: Pick<FairEvent, "organiser">): boolean {
  return !!user && user.role !== "ATTENDEE" && user.id === event.organiser.id;
}

export function bookingState(event: FairEvent, user: User | null, now: number): BookingState {
  if (event.status === "CANCELLED") return { kind: "cancelled" };
  if (Date.parse(event.startsAt) <= now) return { kind: "started", ended: Date.parse(event.endsAt) <= now };
  if (isOwnEvent(user, event)) return { kind: "organiser" };

  if (user?.role === "ATTENDEE" && event.mySignup) {
    const signup = event.mySignup;
    switch (signup.status) {
      case "OFFERED":
        return { kind: "offer", signup };
      case "GOING":
        return { kind: "going", signup };
      case "WAITING":
        return { kind: "waiting", signup };
      case "OFFER_EXPIRED":
        return { kind: "expired", signup };
      case "CANCELLED":
        break; // Free to book again.
    }
  }

  if (user && user.role !== "ATTENDEE") return { kind: "viewer" };

  const seats = seatState(event);
  return { kind: seats === "open" ? "free" : seats };
}

/** The pill next to the category: "Cancelled", "Happening now", "Ended", "Today", "Tomorrow", "In 3 days". */
export function relativeDayLabel(event: Pick<FairEvent, "status" | "startsAt" | "endsAt">, now: number): string {
  if (event.status === "CANCELLED") return "Cancelled";
  const start = Date.parse(event.startsAt);
  const end = Date.parse(event.endsAt);
  if (end <= now) return "Ended";
  if (start <= now) return "Happening now";
  const days = lagosDaysFromToday(event.startsAt, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
