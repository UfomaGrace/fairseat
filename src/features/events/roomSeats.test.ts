import { describe, expect, it } from "vitest";
import { roomCounts, roomLabel, roomLayout, roomTag } from "./roomSeats";

const EVENT = { id: "9b2e0c44-0000-4000-8000-000000000201", seats: 40, goingCount: 37, offeredCount: 1, seatsAvailable: 2 };

describe("roomCounts", () => {
  it("splits the room into going, offered and free", () => {
    expect(roomCounts(EVENT)).toEqual({ going: 37, offered: 1, free: 2, total: 40 });
  });

  it("draws leftover seats as going, and never more seats than the room", () => {
    expect(roomCounts({ seats: 10, goingCount: 3, offeredCount: 0, seatsAvailable: 2 })).toEqual({
      going: 8,
      offered: 0,
      free: 2,
      total: 10,
    });
    expect(roomCounts({ seats: 5, goingCount: 9, offeredCount: 9, seatsAvailable: 9 }).total).toBe(5);
    expect(roomCounts({ seats: 5, goingCount: 9, offeredCount: 9, seatsAvailable: 9 }).offered).toBe(5);
  });
});

describe("roomLayout", () => {
  it("has one seat per seat with the right counts", () => {
    const seats = roomLayout(EVENT);
    expect(seats).toHaveLength(40);
    expect(seats.filter((s) => s === "free")).toHaveLength(2);
    expect(seats.filter((s) => s === "offered")).toHaveLength(1);
  });

  it("is the same for the same event, and different for another", () => {
    expect(roomLayout(EVENT)).toEqual(roomLayout(EVENT));
    const other = { ...EVENT, id: "9b2e0c44-0000-4000-8000-000000000202", seatsAvailable: 20, goingCount: 19 };
    expect(roomLayout(other)).not.toEqual(roomLayout({ ...other, id: EVENT.id }));
  });

  it("scatters the free seats instead of leaving them at the end", () => {
    const seats = roomLayout({ ...EVENT, goingCount: 20, offeredCount: 0, seatsAvailable: 20 });
    expect(seats.slice(0, 20).some((s) => s === "free")).toBe(true);
  });
});

describe("roomTag and roomLabel", () => {
  it("names the seat state", () => {
    expect(roomTag({ status: "SCHEDULED", seatsAvailable: 2, waitingCount: 0 })).toEqual({ text: "Only 2 left", tone: "copper" });
    expect(roomTag({ status: "SCHEDULED", seatsAvailable: 24, waitingCount: 0 })).toEqual({ text: "24 seats free", tone: "ink" });
    expect(roomTag({ status: "SCHEDULED", seatsAvailable: 0, waitingCount: 6 })).toEqual({ text: "Full · 6 in line", tone: "ink" });
    expect(roomTag({ status: "CANCELLED", seatsAvailable: 4, waitingCount: 0 }).text).toBe("Cancelled");
  });

  it("describes the counts in words", () => {
    expect(roomLabel(roomCounts(EVENT))).toBe("37 going, 1 offered to someone in line, 2 free, of 40 seats");
  });
});
