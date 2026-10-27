// EventCard: one event in the public Events list.
//
//   <EventCard event={event} />
//
// - The title links to /events/:eventId. Its ::after covers the card, so the whole card is clickable,
//   while the link (with its visible focus ring) is still the only tab stop.
// - mySignup is only filled when the request carried a token, so the badge appears only when signed in.
// - Times show in Africa/Lagos (lib/format).

import { CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "react-router";
import type { FairEvent } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import { CATEGORY_LABELS, SIGNUP_STATUS_TONES, signupStatusLabel } from "../../lib/labels";
import { cn } from "../../shared/cn";
import { StatusBadge } from "../../shared/ui/status-badge";

export type EventCardProps = {
  event: FairEvent;
  className?: string;
};

export function EventCard({ event, className }: EventCardProps) {
  const { seatsAvailable, mySignup } = event;
  const isFull = seatsAvailable <= 0;

  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-4",
        "transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge>{CATEGORY_LABELS[event.category]}</StatusBadge>
        {mySignup && <StatusBadge tone={SIGNUP_STATUS_TONES[mySignup.status]}>{signupStatusLabel(mySignup)}</StatusBadge>}
      </div>

      <h3 className="text-lg font-semibold leading-snug wrap-break-word text-(--color-text)">
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

      <dl className="grid gap-1.5 text-sm text-(--color-text-muted)">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Starts</dt>
          <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <dd>
            <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Location</dt>
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <dd className="min-w-0 wrap-break-word">{event.location}</dd>
        </div>
        <div className="flex items-start gap-2">
          <dt className="sr-only">Seats</dt>
          <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <dd className={cn("font-medium", isFull ? "text-(--color-warning)" : "text-(--color-success)")}>
            {isFull ? "Full · waitlist open" : `${seatsAvailable} ${seatsAvailable === 1 ? "seat" : "seats"} left`}
          </dd>
        </div>
      </dl>
    </article>
  );
}
