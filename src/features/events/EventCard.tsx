// EventCard: one event in the public Events list.
//
//   <EventCard event={event} />
//
// - The title links to /events/:eventId. Its ::after covers the card, so the whole card is clickable,
//   while the link (with its visible focus ring) is still the only tab stop.
// - Top: EventImage (the category cover until events have pictures). The cover's word is decorative,
//   so the category is also written for screen readers. The sign-up badge sits top left, clear of the icon.
// - mySignup is only filled when the request carried a token, so the badge appears only when signed in.
// - Seats: "N seats left" with a bar of seats taken, or a badge in its seat-state tone (lib/labels):
//   "Only N seats left" (warning, at LOW_SEATS or fewer) or "Full · waitlist open" (neutral) with the
//   waiting count (only when someone is waiting). The bar is hidden from screen readers: the text says it.
// - Times show in Africa/Lagos (lib/format).

import { MapPin } from "lucide-react";
import { Link } from "react-router";
import type { FairEvent } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import {
  CATEGORY_LABELS,
  SEAT_STATE_TONES,
  SIGNUP_STATUS_TONES,
  seatState,
  signupStatusLabel,
} from "../../lib/labels";
import { cn } from "../../lib/cn";
import { StatusBadge } from "../../components/ui/status-badge";
import { EventImage } from "../../components/event-image/EventImage";

export type EventCardProps = {
  event: FairEvent;
  className?: string;
};

export function EventCard({ event, className }: EventCardProps) {
  const { seats, seatsTaken, seatsAvailable, waitingCount, mySignup } = event;
  const state = seatState(event);
  const takenPercent = seats > 0 ? Math.min(100, Math.max(0, (seatsTaken / seats) * 100)) : 0;

  const seatsLeft = `${seatsAvailable} ${seatsAvailable === 1 ? "seat" : "seats"} left`;

  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)",
        "transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative">
        <EventImage category={event.category} />
        <p className="sr-only">Category: {CATEGORY_LABELS[event.category]}</p>
        {mySignup && (
          <StatusBadge
            tone={SIGNUP_STATUS_TONES[mySignup.status]}
            className="absolute top-3 left-3 rounded-full px-3 py-1 font-semibold"
          >
            {signupStatusLabel(mySignup)}
          </StatusBadge>
        )}
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
            {state === "full" ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge tone={SEAT_STATE_TONES.full} className="rounded-full px-3 py-1 text-sm font-semibold">
                  Full · waitlist open
                </StatusBadge>
                {waitingCount > 0 && (
                  <span className="text-sm text-(--color-text-muted)">{waitingCount} waiting</span>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {state === "low" ? (
                    <StatusBadge tone={SEAT_STATE_TONES.low} className="rounded-full px-3 py-1 text-sm font-semibold">
                      Only {seatsLeft}
                    </StatusBadge>
                  ) : (
                    <span className="font-semibold text-(--color-text)">{seatsLeft}</span>
                  )}
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
