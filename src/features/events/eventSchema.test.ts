import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Yup from "yup";
import {
  changedFields,
  EMPTY_EVENT_VALUES,
  eventSchema,
  fromLagosInput,
  toEventCreate,
  toLagosInput,
  type EventFormValues,
} from "./eventSchema";

// "Now" for every test: 1 Nov 2026, 12:00 in Lagos.
const NOW = "2026-11-01T11:00:00Z";

const valid: EventFormValues = {
  title: "Lagos React Meetup",
  description: "Talks on React Server Components and testing.",
  category: "TECH",
  location: "Yaba, Lagos",
  startsAt: "2026-11-07T16:00",
  endsAt: "2026-11-07T19:00",
  seats: 40,
};

/** field → first message, for every field that fails. */
function errorsOf(schema: Yup.Schema, values: unknown): Record<string, string> {
  try {
    schema.validateSync(values, { abortEarly: false });
    return {};
  } catch (e) {
    if (!(e instanceof Yup.ValidationError)) throw e;
    const errors: Record<string, string> = {};
    for (const inner of e.inner) if (inner.path && !errors[inner.path]) errors[inner.path] = inner.message;
    return errors;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Lagos time", () => {
  it("shows a UTC time as Lagos time (UTC+1)", () => {
    expect(toLagosInput("2026-11-07T15:00:00Z")).toBe("2026-11-07T16:00");
    expect(toLagosInput("2026-12-31T23:30:00Z")).toBe("2027-01-01T00:30");
  });

  it("sends a Lagos input with the +01:00 offset", () => {
    expect(fromLagosInput("2026-11-07T16:00")).toBe("2026-11-07T16:00:00+01:00");
    expect(Date.parse(fromLagosInput("2026-11-07T16:00") ?? "")).toBe(Date.parse("2026-11-07T15:00:00Z"));
  });

  it("rejects dates and times that don't exist", () => {
    expect(fromLagosInput("2026-02-30T10:00")).toBeNull();
    expect(fromLagosInput("2026-11-07T24:00")).toBeNull();
    expect(fromLagosInput("")).toBeNull();
    expect(fromLagosInput("next Saturday")).toBeNull();
  });

  it("round-trips: what the form shows is what it sends", () => {
    const sent = fromLagosInput(toLagosInput("2026-11-07T15:00:00Z")) ?? "";
    expect(Date.parse(sent)).toBe(Date.parse("2026-11-07T15:00:00Z"));
  });
});

describe("eventSchema (create)", () => {
  const schema = eventSchema();

  it("accepts a complete event, with or without a description", () => {
    expect(errorsOf(schema, valid)).toEqual({});
    expect(errorsOf(schema, { ...valid, description: "" })).toEqual({});
  });

  it("asks for every required field", () => {
    expect(Object.keys(errorsOf(schema, EMPTY_EVENT_VALUES)).sort()).toEqual(
      ["category", "endsAt", "location", "seats", "startsAt", "title"].sort(),
    );
  });

  it("treats only spaces as empty", () => {
    expect(errorsOf(schema, { ...valid, title: "   " }).title).toBe("Enter a title.");
  });

  it("applies the yaml's length limits", () => {
    expect(errorsOf(schema, { ...valid, title: "x".repeat(200) })).toEqual({});
    expect(errorsOf(schema, { ...valid, title: "x".repeat(201) }).title).toMatch(/at most 200/);
    expect(errorsOf(schema, { ...valid, location: "x".repeat(201) }).location).toMatch(/at most 200/);
    expect(errorsOf(schema, { ...valid, description: "x".repeat(4001) }).description).toMatch(/at most 4000/);
  });

  it("accepts 1 to 1000 whole seats", () => {
    expect(errorsOf(schema, { ...valid, seats: 1 })).toEqual({});
    expect(errorsOf(schema, { ...valid, seats: 1000 })).toEqual({});
    expect(errorsOf(schema, { ...valid, seats: 0 }).seats).toMatch(/at least 1/);
    expect(errorsOf(schema, { ...valid, seats: 1001 }).seats).toMatch(/at most 1000/);
    expect(errorsOf(schema, { ...valid, seats: 2.5 }).seats).toBe("Enter a whole number of seats.");
  });

  it("only allows the contract's categories", () => {
    expect(errorsOf(schema, { ...valid, category: "PARTY" }).category).toBe("Choose a category from the list.");
  });

  it("needs the end after the start", () => {
    expect(errorsOf(schema, { ...valid, endsAt: valid.startsAt }).endsAt).toBe("The end must be after the start.");
    expect(errorsOf(schema, { ...valid, endsAt: "2026-11-07T15:00" }).endsAt).toBe("The end must be after the start.");
  });

  it("needs the start in the future", () => {
    expect(errorsOf(schema, { ...valid, startsAt: "2026-11-01T11:59", endsAt: "2026-11-01T14:00" }).startsAt).toBe(
      "The start must be in the future.",
    );
  });
});

describe("eventSchema (edit)", () => {
  // An event that began in the past was blocked by the page, but the rules still say what they'd do.
  const initial: EventFormValues = { ...valid, startsAt: "2026-10-30T16:00", endsAt: "2026-11-07T19:00" };

  it("doesn't check an unchanged start against now", () => {
    expect(errorsOf(eventSchema({ initial }), initial)).toEqual({});
  });

  it("needs a changed start to be in the future", () => {
    expect(errorsOf(eventSchema({ initial }), { ...initial, startsAt: "2026-10-31T16:00" }).startsAt).toBe(
      "The start must be in the future.",
    );
  });

  it("won't drop seats below the seats already taken", () => {
    const schema = eventSchema({ initial: valid, seatsTaken: 38 });
    expect(errorsOf(schema, { ...valid, seats: 38 })).toEqual({});
    expect(errorsOf(schema, { ...valid, seats: 37 }).seats).toBe(
      "38 seats are already taken, so you can't go below 38.",
    );
  });
});

describe("toEventCreate", () => {
  it("trims text and sends times with the Lagos offset", () => {
    expect(toEventCreate({ ...valid, title: "  Lagos React Meetup  " })).toEqual({
      title: "Lagos React Meetup",
      description: "Talks on React Server Components and testing.",
      category: "TECH",
      location: "Yaba, Lagos",
      startsAt: "2026-11-07T16:00:00+01:00",
      endsAt: "2026-11-07T19:00:00+01:00",
      seats: 40,
    });
  });
});

describe("changedFields", () => {
  it("is empty when nothing changed", () => {
    expect(changedFields(valid, valid)).toEqual({});
  });

  it("ignores spaces added around text", () => {
    expect(changedFields(valid, { ...valid, title: ` ${valid.title} ` })).toEqual({});
  });

  it("sends only the fields that changed", () => {
    expect(changedFields(valid, { ...valid, seats: 50, endsAt: "2026-11-07T20:00" })).toEqual({
      seats: 50,
      endsAt: "2026-11-07T20:00:00+01:00",
    });
  });

  it("sends a cleared description as an empty string", () => {
    expect(changedFields(valid, { ...valid, description: "" })).toEqual({ description: "" });
  });
});
