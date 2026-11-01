// discover: the Discover page's choices about the loaded events. Pure functions, so they're tested
// without a browser.
//
//   const featured = pickFeatured(events, now);
//   const { thisWeek, later } = groupByWeek(events, now, featured?.id);
//   const map = seatMap(event.seats, event.seatsAvailable);
//
// - Featured: the soonest event that hasn't started, isn't cancelled and has a free seat. Only the
//   loaded events are looked at, so a category filter that leaves it out leaves it out here too.
// - "This week": starts within the next 7 Lagos calendar days (today plus the 6 after). Everything
//   else is "Later". The featured event is in neither.
// - Seat map: one square per seat, 10 to a row. Big events would need hundreds of rows, so above
//   SEAT_MAP_MAX_CELLS each square stands for several seats.

import type { FairEvent, Signup, SignupStatus } from "../../api/types";
import { lagosDaysFromToday } from "../../lib/format";

export const THIS_WEEK_DAYS = 7;

const ACTIVE_STATUSES: readonly SignupStatus[] = ["GOING", "WAITING", "OFFERED"];

/** The caller's sign-up when it still holds a seat or a place in line; null otherwise (or signed out). */
export function activeSignup(event: FairEvent): Signup | null {
  const signup = event.mySignup ?? null;
  return signup && ACTIVE_STATUSES.includes(signup.status) ? signup : null;
}

/** The soonest bookable event, or undefined when none qualifies. */
export function pickFeatured(events: readonly FairEvent[], now: number): FairEvent | undefined {
  let featured: FairEvent | undefined;
  for (const event of events) {
    const startsAt = Date.parse(event.startsAt);
    if (event.status === "CANCELLED" || event.seatsAvailable <= 0 || !(startsAt > now)) continue;
    if (!featured || startsAt < Date.parse(featured.startsAt)) featured = event;
  }
  return featured;
}

export type WeekGroups = { thisWeek: FairEvent[]; later: FairEvent[] };

/** Splits the events into "This week" and "Later", keeping their order and leaving out excludeId. */
export function groupByWeek(events: readonly FairEvent[], now: number, excludeId?: string): WeekGroups {
  const groups: WeekGroups = { thisWeek: [], later: [] };
  for (const event of events) {
    if (event.id === excludeId) continue;
    const days = lagosDaysFromToday(event.startsAt, now);
    (days < THIS_WEEK_DAYS ? groups.thisWeek : groups.later).push(event);
  }
  return groups;
}

export const SEAT_MAP_COLUMNS = 10;
export const SEAT_MAP_MAX_CELLS = 100;

export type SeatMap = {
  /** Squares to draw, taken ones first. */
  cells: number;
  taken: number;
  /** Seats per square: 1 unless the event has more than SEAT_MAP_MAX_CELLS seats. */
  perCell: number;
};

export function seatMap(seats: number, seatsAvailable: number): SeatMap {
  const total = Math.max(0, seats);
  const perCell = Math.max(1, Math.ceil(total / SEAT_MAP_MAX_CELLS));
  const cells = Math.ceil(total / perCell);
  const available = Math.min(Math.max(0, seatsAvailable), total);
  // Never round the last free seat away: a free seat always shows at least one free square.
  const free = available > 0 ? Math.max(1, Math.round(available / perCell)) : 0;
  return { cells, taken: cells - free, perCell };
}
