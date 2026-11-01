import { describe, expect, it } from "vitest";
import type { FairEvent } from "../../api/types";
import { groupByWeek, pickFeatured, seatMap } from "./discover";

// 1 Nov 2026, 22:30 in Lagos (21:30 UTC).
const NOW = Date.parse("2026-11-01T21:30:00Z");

function event(id: string, startsAt: string, changes: Partial<FairEvent> = {}): FairEvent {
  return {
    id,
    title: id,
    description: "",
    category: "TECH",
    location: "Yaba, Lagos",
    startsAt,
    endsAt: startsAt,
    seats: 40,
    seatsTaken: 30,
    seatsAvailable: 10,
    goingCount: 30,
    offeredCount: 0,
    waitingCount: 0,
    status: "SCHEDULED",
    organiser: { id: "o1", displayName: "Tolu Adebayo" },
    asOf: "2026-11-01T21:30:00Z",
    ...changes,
  };
}

describe("pickFeatured", () => {
  it("picks the soonest event with a free seat", () => {
    const events = [
      event("full", "2026-11-02T07:00:00Z", { seatsAvailable: 0 }),
      event("later", "2026-11-05T18:00:00Z"),
      event("sooner", "2026-11-03T18:00:00Z"),
    ];
    expect(pickFeatured(events, NOW)?.id).toBe("sooner");
  });

  it("skips cancelled events and events that have started", () => {
    const events = [
      event("started", "2026-11-01T20:00:00Z"),
      event("cancelled", "2026-11-02T07:00:00Z", { status: "CANCELLED" }),
    ];
    expect(pickFeatured(events, NOW)).toBeUndefined();
  });
});

describe("groupByWeek", () => {
  it("puts the next 7 Lagos days in This week and leaves out the featured event", () => {
    const events = [
      event("featured", "2026-11-02T07:00:00Z"),
      event("today", "2026-11-01T22:00:00Z"),
      // 7 Nov, 23:59 in Lagos: the last minute of this week.
      event("day6", "2026-11-07T22:59:00Z"),
      // 8 Nov, 00:00 in Lagos.
      event("day7", "2026-11-07T23:00:00Z"),
    ];
    const { thisWeek, later } = groupByWeek(events, NOW, "featured");
    expect(thisWeek.map((e) => e.id)).toEqual(["today", "day6"]);
    expect(later.map((e) => e.id)).toEqual(["day7"]);
  });
});

describe("seatMap", () => {
  it("draws one square per seat for small events", () => {
    expect(seatMap(40, 2)).toEqual({ cells: 40, taken: 38, perCell: 1 });
  });

  it("groups seats per square above 100 seats", () => {
    expect(seatMap(250, 30)).toEqual({ cells: 84, taken: 74, perCell: 3 });
  });

  it("keeps one free square for the last free seat", () => {
    expect(seatMap(1000, 1)).toEqual({ cells: 100, taken: 99, perCell: 10 });
  });

  it("fills every square when full", () => {
    expect(seatMap(12, 0)).toEqual({ cells: 12, taken: 12, perCell: 1 });
  });
});
