// eventSchema: the rules and conversions behind EventForm (Create event and Edit event).
//
//   validationSchema={eventSchema()}                                   // create
//   validationSchema={eventSchema({ initial, seatsTaken: 38 })}        // edit
//   toEventCreate(values)            → POST /events body (every field)
//   changedFields(initial, values)   → PATCH /events/{id} body (only what changed)
//
// - Limits come from the yaml (EventCreate / EventUpdate), so the service never rejects what we let through.
// - The form holds "form shape" values: plain strings, and times as a datetime-local input
//   writes them ("2026-11-07T16:00"), read as Africa/Lagos time. Lagos is UTC+1 all year
//   (no daylight saving), so we send "2026-11-07T16:00:00+01:00".

import * as Yup from "yup";
import type { Category, EventCreate, EventUpdate, FairEvent } from "../../api/types";
import { CATEGORY_LABELS, isKeyOf, keysOf, seatsTakenMessage } from "../../lib/labels";

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 4000;
export const LOCATION_MAX = 200;
export const SEATS_MIN = 1;
export const SEATS_MAX = 1000;

export type EventFormValues = {
  title: string;
  description: string;
  category: Category | "";
  location: string;
  startsAt: string;
  endsAt: string;
  /** "" while the box is empty; an input type="number" gives Formik a number otherwise. */
  seats: number | "";
};

/** The form's field names, which are also the request's field names (for server errors). */
export const EVENT_FIELDS = [
  "title",
  "description",
  "category",
  "location",
  "startsAt",
  "endsAt",
  "seats",
] as const satisfies readonly (keyof EventFormValues)[];

export const EMPTY_EVENT_VALUES: EventFormValues = {
  title: "",
  description: "",
  category: "",
  location: "",
  startsAt: "",
  endsAt: "",
  seats: "",
};

// ---- Lagos time ----

const LAGOS_OFFSET = "+01:00";
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const LOCAL_INPUT = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** "2026-11-07T15:00:00Z" → "2026-11-07T16:00" (Lagos), ready for a datetime-local input. */
export function toLagosInput(isoDateTime: string): string {
  const time = Date.parse(isoDateTime);
  if (Number.isNaN(time)) return "";
  return new Date(time + LAGOS_OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-11-07T16:00" (Lagos) → "2026-11-07T16:00:00+01:00". Null when it isn't a real date and time. */
export function fromLagosInput(local: string): string | null {
  const match = LOCAL_INPUT.exec(local);
  if (!match) return null;
  const [, date, hours, minutes, seconds = "00"] = match;
  const iso = `${date}T${hours}:${minutes}:${seconds}${LAGOS_OFFSET}`;
  // Converting back catches times that don't exist, like 30 February or 24:00.
  return toLagosInput(iso) === `${date}T${hours}:${minutes}` ? iso : null;
}

/** Milliseconds since 1970 for a Lagos input value, or NaN. */
function instant(local: string): number {
  return Date.parse(fromLagosInput(local) ?? "");
}

// ---- Yup ----

export type EventSchemaOptions = {
  /** Edit only: the values the form started with. */
  initial?: EventFormValues;
  /** Edit only: seats already taken, so seats can't go below it. */
  seatsTaken?: number;
};

const SEATS_REQUIRED = "Enter the number of seats.";

/**
 * Create: everything is checked, and the start must be in the future.
 * Edit (initial given): the same rules, but the start only has to be in the future if it
 * was changed, and seats can't drop below seatsTaken.
 */
export function eventSchema({ initial, seatsTaken }: EventSchemaOptions = {}) {
  const startChanged = (value: string) => !initial || value !== initial.startsAt;
  const seatsChanged = (value: number) => !initial || value !== initial.seats;

  let seats = Yup.number()
    .typeError(SEATS_REQUIRED)
    .required(SEATS_REQUIRED)
    .integer("Enter a whole number of seats.")
    .min(SEATS_MIN, `An event needs at least ${SEATS_MIN} seat.`)
    .max(SEATS_MAX, `An event can have at most ${SEATS_MAX} seats.`);
  if (seatsTaken !== undefined && seatsTaken > 0) {
    seats = seats.test(
      "seats-taken",
      seatsTakenMessage(seatsTaken),
      (value) => value === undefined || !seatsChanged(value) || value >= seatsTaken,
    );
  }

  return Yup.object({
    title: Yup.string()
      .trim()
      .required("Enter a title.")
      .max(TITLE_MAX, `The title can be at most ${TITLE_MAX} characters.`),
    description: Yup.string()
      .trim()
      .max(DESCRIPTION_MAX, `The description can be at most ${DESCRIPTION_MAX} characters.`),
    category: Yup.string()
      .required("Choose a category.")
      .oneOf(keysOf(CATEGORY_LABELS), "Choose a category from the list."),
    location: Yup.string()
      .trim()
      .required("Enter where the event takes place.")
      .max(LOCATION_MAX, `The location can be at most ${LOCATION_MAX} characters.`),
    startsAt: Yup.string()
      .required("Choose when the event starts.")
      .test("lagos-time", "Enter a valid date and time.", (value) => !value || fromLagosInput(value) !== null)
      .test(
        "future",
        "The start must be in the future.",
        (value) => !value || !startChanged(value) || instant(value) > Date.now(),
      ),
    endsAt: Yup.string()
      .required("Choose when the event ends.")
      .test("lagos-time", "Enter a valid date and time.", (value) => !value || fromLagosInput(value) !== null)
      .test("after-start", "The end must be after the start.", (value, context) => {
        const start: unknown = context.parent.startsAt;
        // No usable start yet: the start field shows its own message.
        if (!value || typeof start !== "string" || Number.isNaN(instant(start))) return true;
        return instant(value) > instant(start);
      }),
    seats,
  });
}

// ---- Request bodies ----

/** An event from the service → form values (times in Lagos). */
export function eventToFormValues(event: FairEvent): EventFormValues {
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    location: event.location,
    startsAt: toLagosInput(event.startsAt),
    endsAt: toLagosInput(event.endsAt),
    seats: event.seats,
  };
}

/** Form values → the request's fields, trimmed. Null if something doesn't parse. */
function toRequestFields(values: EventFormValues): EventCreate | null {
  const startsAt = fromLagosInput(values.startsAt);
  const endsAt = fromLagosInput(values.endsAt);
  if (!isKeyOf(CATEGORY_LABELS, values.category)) return null;
  if (startsAt === null || endsAt === null || typeof values.seats !== "number") return null;
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    location: values.location.trim(),
    startsAt,
    endsAt,
    seats: values.seats,
  };
}

/** POST /events body. Only call with values that passed eventSchema. */
export function toEventCreate(values: EventFormValues): EventCreate {
  const body = toRequestFields(values);
  if (!body) throw new Error("EventForm submitted values that eventSchema should have stopped.");
  return body;
}

/**
 * PATCH /events/{id} body: only the fields that differ from what the form started with.
 * Compared after trimming, so adding a space at the end isn't a change. {} means nothing changed.
 */
export function changedFields(initial: EventFormValues, values: EventFormValues): EventUpdate {
  const after = toEventCreate(values);
  const before = toRequestFields(initial);
  if (!before) return after;

  const changes: EventUpdate = {};
  if (after.title !== before.title) changes.title = after.title;
  if (after.description !== before.description) changes.description = after.description;
  if (after.category !== before.category) changes.category = after.category;
  if (after.location !== before.location) changes.location = after.location;
  if (after.startsAt !== before.startsAt) changes.startsAt = after.startsAt;
  if (after.endsAt !== before.endsAt) changes.endsAt = after.endsAt;
  if (after.seats !== before.seats) changes.seats = after.seats;
  return changes;
}
