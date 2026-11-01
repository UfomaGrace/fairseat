// FeaturedEvent: the dark "Next up" panel at the top of Discover.
//
//   <FeaturedEvent event={featured} now={now} />
//
// - The page picks the event (pickFeatured): the soonest one with a free seat.
// - Left: "Next up · Tomorrow", the title, date · time · location, the organiser and who's going,
//   then QuickBook (a white "Book a seat") and "View details".
// - Right: the seat map, 10 squares to a row: taken seats filled white, free seats outlined in
//   copper. It is decorative; the sentence above it says the same in words. Over 100 seats, each
//   square stands for several seats and the caption says how many.
// - "Only N seats left" (warning badge) when seats are low (LOW_SEATS).
// - Stacks on phones; two columns from 768px.

import { Link } from "react-router";
import type { FairEvent } from "../../api/types";
import { Avatar } from "../../components/avatar/Avatar";
import { formatClockTime, formatRelativeDay } from "../../lib/format";
import { SEAT_STATE_TONES, seatState } from "../../lib/labels";
import { cn } from "../../lib/cn";
import { StatusBadge } from "../../components/ui/status-badge";
import { seatMap, SEAT_MAP_COLUMNS } from "./discover";
import { QuickBook } from "./QuickBook";

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export type FeaturedEventProps = {
  event: FairEvent;
  now: number;
};

export function FeaturedEvent({ event, now }: FeaturedEventProps) {
  const day = formatRelativeDay(event.startsAt, now);
  const low = seatState(event) === "low";
  const map = seatMap(event.seats, event.seatsAvailable);
  const headingId = `featured-${event.id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-8 rounded-(--radius-card) bg-(--color-text) p-5 text-(--color-on-dark) sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10"
    >
      <div className="flex min-w-0 flex-col">
        <p className="w-fit rounded-full bg-(--color-dark-panel) px-3 py-1 text-sm font-semibold text-(--color-on-dark-accent)">
          Next up · {day}
        </p>
        <h2
          id={headingId}
          className="mt-4 text-3xl leading-tight font-bold tracking-tight wrap-break-word md:text-4xl"
        >
          {event.title}
        </h2>
        <p className="mt-3 text-(--color-on-dark-muted)">
          <time dateTime={event.startsAt}>
            {day} · {formatClockTime(event.startsAt)}
          </time>{" "}
          · {event.location}
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm text-(--color-on-dark-muted)">
          {/* The ring keeps the black avatar pair visible on the dark panel. */}
          <Avatar
            id={event.organiser.id}
            name={event.organiser.displayName}
            size={24}
            decorative
            className="ring-1 ring-(--color-on-dark-muted)"
          />
          <span className="min-w-0">
            Hosted by <span className="font-medium text-(--color-on-dark)">{event.organiser.displayName}</span> ·{" "}
            {event.goingCount} going
          </span>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-auto md:pt-8">
          <QuickBook event={event} appearance="featured" />
          <Link
            to={`/events/${encodeURIComponent(event.id)}`}
            className={cn(
              "inline-flex h-12 items-center rounded-full border border-(--color-on-dark-muted) px-6 font-semibold",
              "transition-colors hover:bg-(--color-dark-panel)",
              focusRing,
            )}
          >
            View details<span className="sr-only">: {event.title}</span>
          </Link>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-(--color-on-dark-muted)">
            {event.seatsTaken} of {event.seats} seats taken
          </p>
          {low && (
            <StatusBadge tone={SEAT_STATE_TONES.low} className="rounded-full px-3 py-1 text-sm font-semibold">
              Only {event.seatsAvailable} {event.seatsAvailable === 1 ? "seat" : "seats"} left
            </StatusBadge>
          )}
        </div>

        <div
          aria-hidden="true"
          className="mt-4 grid gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${SEAT_MAP_COLUMNS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: map.cells }, (_, i) => (
            <span
              key={i}
              className={cn(
                "aspect-4/3 rounded-sm",
                i < map.taken ? "bg-(--color-on-dark)" : "border-2 border-(--color-copper)",
              )}
            />
          ))}
        </div>
        {map.perCell > 1 && (
          <p className="mt-2 text-xs text-(--color-on-dark-muted)">Each square is {map.perCell} seats.</p>
        )}

        <p className="mt-5 text-sm text-(--color-on-dark-muted)">
          Full? Join the line. The next free seat is offered in order, with 24 hours to accept.
        </p>
      </div>
    </section>
  );
}
