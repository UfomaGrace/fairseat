// EventCard: one event in the public Events list.
//
//   <EventCard event={event} />
//
// - The title links to /events/:eventId. Its ::after covers the card, so the whole card is clickable,
//   while the link (with its visible focus ring) is still the only tab stop.
// - Top panel: a tint and icon per category (categoryVisuals), with the category name in a pill.
// - mySignup is only filled when the request carried a token, so the badge appears only when signed in.
// - Seats: "N seats left" (amber text at LOW_SEATS or fewer) with a bar of seats taken, or, when full,
//   "Full · waitlist open" with the waiting count (only when someone is waiting). The bar is hidden from screen readers: the text says it.
// - Times show in Africa/Lagos (lib/format).

import { MapPin } from "lucide-react";
import { Link } from "react-router";
import type { FairEvent } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import { CATEGORY_LABELS, SIGNUP_STATUS_TONES, signupStatusLabel } from "../../lib/labels";
import { cn } from "../../lib/cn";
import { StatusBadge } from "../../components/ui/status-badge";
import { CATEGORY_VISUALS } from "./categoryVisuals";

/** At this many seats left or fewer, the count turns amber: "Only 3 seats left". */
const LOW_SEATS = 5;

export type EventCardProps = {
  event: FairEvent;
  className?: string;
};

export function EventCard({ event, className }: EventCardProps) {
  const { seats, seatsTaken, seatsAvailable, waitingCount, mySignup } = event;
  const isFull = seatsAvailable <= 0;
  const isLow = !isFull && seatsAvailable <= LOW_SEATS;
  const takenPercent = seats > 0 ? Math.min(100, Math.max(0, (seatsTaken / seats) * 100)) : 0;
  const visual = CATEGORY_VISUALS[event.category];
  const Icon = visual.icon;

  const seatsLeft = `${seatsAvailable} ${seatsAvailable === 1 ? "seat" : "seats"} left`;

  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)",
        "transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className={cn("relative flex h-32 items-center justify-center", visual.className)}>
        <Icon aria-hidden="true" className="size-14" strokeWidth={1.75} />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="rounded-full bg-(--color-surface) px-3 py-1 text-xs font-semibold text-(--color-text)">
            {CATEGORY_LABELS[event.category]}
          </span>
          {mySignup && (
            <StatusBadge tone={SIGNUP_STATUS_TONES[mySignup.status]} className="rounded-full px-3 py-1 font-semibold">
              {signupStatusLabel(mySignup)}
            </StatusBadge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-semibold tracking-wide text-(--color-primary) uppercase">
          <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
        </p>

        <h3 className="mt-2 text-xl leading-snug font-bold wrap-break-word text-(--color-text)">
          <Link
            to={`/events/${encodeURIComponent(event.id)}`}
            className={cn(
              "rounded-sm underline-offset-2 hover:underline after:absolute after:inset-0 after:content-['']",
              "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
            )}
          >
            {event.title}
          </Link>
        </h3>

        <p className="mt-2 flex items-start gap-2 text-(--color-text-muted)">
          <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
          <span className="sr-only">Location: </span>
          <span className="min-w-0 wrap-break-word">{event.location}</span>
        </p>

        <div className="mt-auto pt-5">
          <div className="border-t border-(--color-border) pt-4">
            {isFull ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-(--color-full-bg) px-3 py-1 text-sm font-semibold text-(--color-full-text)">
                  Full · waitlist open
                </span>
                {waitingCount > 0 && (
                  <span className="text-sm text-(--color-text-muted)">{waitingCount} waiting</span>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={cn("font-semibold", isLow ? "text-(--color-full-text)" : "text-(--color-text)")}>
                    {isLow ? `Only ${seatsLeft}` : seatsLeft}
                  </span>
                  <span className="text-sm text-(--color-text-muted)">{seats} seats</span>
                </div>
                <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-(--color-border)">
                  <div className="h-full rounded-full bg-(--color-primary)" style={{ width: `${takenPercent}%` }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
