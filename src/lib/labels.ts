// Labels: turn the contract's codes into words people read on screen.
//
// - Every map is a Record over a generated type, so if the contract adds a value
//   (say a new Category), TypeScript fails here until it gets a label.

import type { ApiErrorCode, Category, NoticeKind, Signup, SignupStatus } from "../api/types";
import type { StatusBadgeTone } from "../shared/ui/status-badge";

export const CATEGORY_LABELS: Record<Category, string> = {
  TECH: "Tech",
  DESIGN: "Design",
  PRODUCT: "Product",
  CAREER: "Career",
  BUSINESS: "Business",
  COMMUNITY: "Community",
};

export const SIGNUP_STATUS_LABELS: Record<SignupStatus, string> = {
  GOING: "You're going",
  WAITING: "On the waitlist",
  OFFERED: "Seat offered",
  OFFER_EXPIRED: "Offer expired",
  CANCELLED: "Cancelled",
};

// Badge colour per status. Colour is extra: the badge always shows the label as text.
export const SIGNUP_STATUS_TONES: Record<SignupStatus, StatusBadgeTone> = {
  GOING: "success",
  WAITING: "info",
  OFFERED: "warning",
  OFFER_EXPIRED: "neutral",
  CANCELLED: "neutral",
};

/** "On the waitlist · #2" when the position is known, otherwise the plain status label. */
export function signupStatusLabel(signup: Signup): string {
  const label = SIGNUP_STATUS_LABELS[signup.status];
  return signup.status === "WAITING" && signup.waitingPosition ? `${label} · #${signup.waitingPosition}` : label;
}

export const NOTICE_KIND_LABELS: Record<NoticeKind, string> = {
  SEAT_OFFERED: "Seat offered",
  OFFER_EXPIRED: "Offer expired",
  EVENT_CHANGED: "Event updated",
  EVENT_CANCELLED: "Event cancelled",
};

export const NOTICE_KIND_TONES: Record<NoticeKind, StatusBadgeTone> = {
  SEAT_OFFERED: "warning",
  OFFER_EXPIRED: "neutral",
  EVENT_CHANGED: "info",
  EVENT_CANCELLED: "danger",
};

export function keysOf<K extends string>(labels: Record<K, string>): K[] {
  return Object.keys(labels) as K[];
}

/** True when value is one of the map's keys, e.g. a ?category from the URL. */
export function isKeyOf<K extends string>(labels: Record<K, string>, value: unknown): value is K {
  return typeof value === "string" && Object.hasOwn(labels, value);
}

export type LabelOption<K extends string> = { value: K; label: string };

/** The map as select options, in the order the map lists them. */
export function labelOptions<K extends string>(labels: Record<K, string>): LabelOption<K>[] {
  return keysOf(labels).map((value) => ({ value, label: labels[value] }));
}

export const CATEGORY_OPTIONS = labelOptions(CATEGORY_LABELS);

// 409 Conflict: the action no longer fits the event or sign-up. These codes get their own
// words; any other 409 gets CONFLICT_FALLBACK. The screen has already refetched by then.
type ConflictCode = Extract<ApiErrorCode, "EVENT_CANCELLED" | "EVENT_STARTED" | "OFFER_EXPIRED" | "NO_ACTIVE_OFFER">;

export const CONFLICT_MESSAGES: Record<ConflictCode, string> = {
  EVENT_CANCELLED: "This event has been cancelled, so seats can't be booked or changed.",
  EVENT_STARTED: "This event has already started, so seats can't be booked or changed.",
  OFFER_EXPIRED: "Sorry, this seat offer expired before you accepted it. The seat has gone to the next person waiting.",
  NO_ACTIVE_OFFER: "You don't have a seat offer to accept right now.",
};

export const CONFLICT_FALLBACK = "Something changed while you were looking at this event.";

export const LATEST_DETAILS_LOADED = "We've loaded the latest details.";

/** The friendly line for a 409, e.g. "Sorry, this seat offer expired… We've loaded the latest details." */
export function conflictMessage(code: string): string {
  const message = isKeyOf(CONFLICT_MESSAGES, code) ? CONFLICT_MESSAGES[code] : CONFLICT_FALLBACK;
  return `${message} ${LATEST_DETAILS_LOADED}`;
}

// The same 409s, in the organiser's words, for the Edit event page. SEATS_BELOW_TAKEN isn't
// here: it goes on the seats field (seatsTakenMessage).
type EventEditConflictCode = Extract<ApiErrorCode, "EVENT_CANCELLED" | "EVENT_STARTED">;

export const EVENT_EDIT_CONFLICT_MESSAGES: Record<EventEditConflictCode, string> = {
  EVENT_CANCELLED: "This event has been cancelled, so it can't be edited.",
  EVENT_STARTED: "This event has already started, so it can't be edited.",
};

/** The friendly line for a 409 from updateEvent. */
export function eventEditConflictMessage(code: string): string {
  const message = isKeyOf(EVENT_EDIT_CONFLICT_MESSAGES, code) ? EVENT_EDIT_CONFLICT_MESSAGES[code] : CONFLICT_FALLBACK;
  return `${message} ${LATEST_DETAILS_LOADED}`;
}

/** "38 seats are already taken, so you can't go below 38." */
export function seatsTakenMessage(taken: number): string {
  return `${taken} ${taken === 1 ? "seat is" : "seats are"} already taken, so you can't go below ${taken}.`;
}
