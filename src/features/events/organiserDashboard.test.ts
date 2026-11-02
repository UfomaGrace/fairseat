import { describe, expect, it } from "vitest";
import type { FairEvent } from "../../api/types";
import { attentionItems, eventSeatChip, eventsForTab, organiserQuery, readOrganiserTab } from "./organiserDashboard";

const NOW = Date.parse("2026-11-02T12:00:00Z");

function event(overrides: Partial<FairEvent> = {}): FairEvent {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Lagos React meetup",
    description: "",
    category: "TECH",
    location: "Yaba",
    startsAt: "2026-11-10T12:00:00Z",
    endsAt: "2026-11-10T14:00:00Z",
    seats: 20,
    seatsTaken: 4,
    seatsAvailable: 16,
    goingCount: 4,
    offeredCount: 0,
    waitingCount: 0,
    status: "SCHEDULED",
    organiser: { id: "00000000-0000-4000-8000-000000000002", displayName: "Ada" },
    asOf: "2026-11-02T12:00:00Z",
    ...overrides,
  };
}

describe("organiser dashboard URL and queries", () => {
  it("uses upcoming by default and enables the contract flags for past and cancelled tabs", () => {
    expect(readOrganiserTab("")).toBe("upcoming");
    expect(readOrganiserTab("?tab=invalid")).toBe("upcoming");
    expect(organiserQuery("organiser-id", "upcoming")).toEqual({ organiserId: "organiser-id", limit: 20 });
    expect(organiserQuery("organiser-id", "past")).toEqual({
      organiserId: "organiser-id",
      limit: 20,
      includePast: true,
    });
    expect(organiserQuery("organiser-id", "cancelled")).toEqual({
      organiserId: "organiser-id",
      limit: 20,
      includePast: true,
      includeCancelled: true,
    });
  });

  it("filters past to ended scheduled events and cancelled to cancelled events", () => {
    const events = [
      event({ id: "past", endsAt: "2026-11-02T11:00:00Z" }),
      event({ id: "future" }),
      event({ id: "cancelled", status: "CANCELLED", endsAt: "2026-11-02T11:00:00Z" }),
    ];
    expect(eventsForTab(events, "past", NOW).map(({ id }) => id)).toEqual(["past"]);
    expect(eventsForTab(events, "cancelled", NOW).map(({ id }) => id)).toEqual(["cancelled"]);
  });
});

describe("organiser attention rules", () => {
  it("prioritises waiting events and then shows sign-up-free events more than two days away", () => {
    const items = attentionItems(
      [
        event({ id: "no-signups", seatsTaken: 0 }),
        event({ id: "waiting-small", waitingCount: 2 }),
        event({ id: "waiting-large", waitingCount: 6 }),
        event({ id: "too-soon", startsAt: "2026-11-04T11:00:00Z", seatsTaken: 0 }),
        event({ id: "cancelled", status: "CANCELLED", seatsTaken: 0 }),
      ],
      NOW,
    );
    expect(items.map((item) => item.event.id)).toEqual(["waiting-large", "waiting-small"]);
    expect(attentionItems([event({ seatsTaken: 0 })], NOW)).toEqual([
      { kind: "no-signups", event: event({ seatsTaken: 0 }), daysAway: 8 },
    ]);
  });

  it("returns no more than two attention items", () => {
    const items = attentionItems(
      [event({ id: "one", waitingCount: 3 }), event({ id: "two", waitingCount: 2 }), event({ id: "three", waitingCount: 1 })],
      NOW,
    );
    expect(items).toHaveLength(2);
  });
});

describe("organiser seat chips", () => {
  it.each([
    [event({ seatsAvailable: 0, waitingCount: 3 }), "upcoming", "Full · 3 in line", "ink"],
    [event({ seatsAvailable: 4 }), "upcoming", "4 seats left", "copper"],
    [event({ seatsTaken: 0, seatsAvailable: 10 }), "upcoming", "No sign-ups yet", "outline"],
    [event({ seatsAvailable: 8 }), "upcoming", "8 seats left", "neutral"],
    [event({ endsAt: "2026-11-01T10:00:00Z" }), "past", "Ended", "neutral"],
    [event({ status: "CANCELLED" }), "cancelled", "Cancelled", "neutral"],
  ] as const)("labels %s in the %s tab", (item, tab, label, tone) => {
    expect(eventSeatChip(item, tab)).toEqual({ label, tone });
  });
});
