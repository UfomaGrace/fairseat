// roomSeats: what "The room" draws for an event. Pure functions, tested without a browser.
//
//   const counts = roomCounts(event);          // { going, offered, free, total }
//   const seats = roomLayout(event);           // ["going", "free", "offered", …], one per seat
//   roomTag(event)                             // { text: "Only 2 left", tone: "copper" }
//
// - Counts come from seats, goingCount, offeredCount and seatsAvailable. They can disagree for up
//   to a minute while a lapsed offer is passed on; any seat left over is drawn as going (taken).
// - roomLayout shuffles the seats with a generator seeded from the event id, so free seats are
//   scattered over the room, and the same event always looks the same.
// - Above ROOM_GRID_MAX_SEATS the page draws a proportion bar instead of a grid.

import type { FairEvent } from "../../api/types";
import { hashString } from "../../components/avatar/avatarParts";
import { seatState } from "../../lib/labels";

export type SeatKind = "going" | "offered" | "free";

export const ROOM_COLUMNS = 10;
export const ROOM_GRID_MAX_SEATS = 80;

type RoomEvent = Pick<FairEvent, "id" | "seats" | "goingCount" | "offeredCount" | "seatsAvailable">;

export type RoomCounts = { going: number; offered: number; free: number; total: number };

const whole = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

export function roomCounts(event: Omit<RoomEvent, "id">): RoomCounts {
  const total = whole(event.seats);
  const offered = Math.min(whole(event.offeredCount), total);
  const free = Math.min(whole(event.seatsAvailable), total - offered);
  // Going takes the rest, so the three always add up to the room.
  const going = total - offered - free;
  return { going, offered, free, total };
}

/** mulberry32: a small seeded generator, enough to shuffle seats the same way every time. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roomLayout(event: RoomEvent): SeatKind[] {
  const { going, offered, free } = roomCounts(event);
  const seats: SeatKind[] = [
    ...Array<SeatKind>(going).fill("going"),
    ...Array<SeatKind>(offered).fill("offered"),
    ...Array<SeatKind>(free).fill("free"),
  ];
  const random = seededRandom(hashString(event.id));
  for (let i = seats.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  return seats;
}

/** "37 going, 1 offered to someone in line, 2 free, of 40 seats": the room's text alternative. */
export function roomLabel(counts: RoomCounts): string {
  return `${counts.going} going, ${counts.offered} offered to someone in line, ${counts.free} free, of ${counts.total} seats`;
}

export type RoomTag = { text: string; tone: "copper" | "ink" | "neutral" };

export function roomTag(event: Pick<FairEvent, "status" | "seatsAvailable" | "waitingCount">): RoomTag {
  if (event.status === "CANCELLED") return { text: "Cancelled", tone: "neutral" };
  const free = event.seatsAvailable;
  switch (seatState(event)) {
    case "full":
      return { text: `Full · ${event.waitingCount} in line`, tone: "ink" };
    case "low":
      return { text: `Only ${free} left`, tone: "copper" };
    case "open":
      return { text: `${free} ${free === 1 ? "seat" : "seats"} free`, tone: "ink" };
  }
}
