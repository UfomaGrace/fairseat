// DiscoverEventRow: one event in the Discover lists ("This week", "Later").
//
//   <DiscoverEventRow event={event} now={now} />
//
// - Square EventImage (88px on phones, 112px from 768px), then the relative date and time, the
//   title (the link to the event), the organiser and location, and the seat status. QuickBook sits
//   under the text on phones and on the right from 768px.
// - The cover is decorative, so the category is also written for screen readers.
// - Seat status, by seatState (lib/labels, LOW_SEATS):
//     full → "Full · 3 in line"         low → "Only 2 left" (copper)
//     open → "37 going · 12 seats left"
// - Times show in Africa/Lagos (lib/format).

import { Link } from "react-router";
import type { FairEvent } from "../../api/types";
import { Avatar } from "../../components/avatar/Avatar";
import { EventImage } from "../../components/event-image/EventImage";
import { formatRelativeDateTime } from "../../lib/format";
import { CATEGORY_LABELS, seatState } from "../../lib/labels";
import { cn } from "../../lib/cn";
import { Skeleton } from "../../components/ui/skeleton";
import { QuickBook } from "./QuickBook";

// Phones: the action sits under the text, so "Join the line" doesn't squeeze it. From 768px: on the right.
const rowGrid = "grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-4 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center";

function seatsLeft(count: number): string {
  return `${count} ${count === 1 ? "seat" : "seats"} left`;
}

export function SeatStatus({ event }: { event: FairEvent }) {
  switch (seatState(event)) {
    case "full":
      return <span className="text-(--color-text-muted)">Full · {event.waitingCount} in line</span>;
    case "low":
      return <span className="font-semibold text-(--color-copper)">Only {event.seatsAvailable} left</span>;
    case "open":
      return (
        <span className="text-(--color-text-muted)">
          {event.goingCount} going · {seatsLeft(event.seatsAvailable)}
        </span>
      );
  }
}

export type DiscoverEventRowProps = {
  event: FairEvent;
  now: number;
};

export function DiscoverEventRow({ event, now }: DiscoverEventRowProps) {
  return (
    <article className={cn(rowGrid, "py-4")}>
      <div className="row-span-2 overflow-hidden rounded-xl md:row-span-1">
        <EventImage category={event.category} ratio="1 / 1" />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-(--color-text-muted)">
          <time dateTime={event.startsAt}>{formatRelativeDateTime(event.startsAt, now)}</time>
        </p>
        <h3 className="mt-0.5 text-base leading-snug font-semibold wrap-break-word text-(--color-text) md:text-lg">
          <Link
            id={`event-${event.id}`}
            to={`/events/${encodeURIComponent(event.id)}`}
            className={cn(
              "rounded-sm underline-offset-2 hover:underline",
              "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
            )}
          >
            {event.title}
          </Link>
        </h3>
        <p className="sr-only">Category: {CATEGORY_LABELS[event.category]}</p>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-(--color-text-muted)">
          <Avatar id={event.organiser.id} name={event.organiser.displayName} size={20} decorative />
          <span className="min-w-0 truncate">
            {event.organiser.displayName} · {event.location}
          </span>
        </p>
        <p className="mt-1 text-sm">
          <SeatStatus event={event} />
        </p>
      </div>

      <QuickBook event={event} className="mt-3 justify-self-start md:mt-0 md:justify-self-end" />
    </article>
  );
}

/** A loading row in the same grid. */
export function DiscoverEventRowSkeleton() {
  return (
    <div className={cn(rowGrid, "py-4")} aria-hidden="true">
      <Skeleton shape="image" className="row-span-2 aspect-square rounded-xl md:row-span-1" />
      <Skeleton lines={3} />
      <Skeleton className="mt-3 w-16 md:mt-0 [&_div]:h-11 [&_div]:rounded-full" />
    </div>
  );
}
