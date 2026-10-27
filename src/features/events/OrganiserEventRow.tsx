// OrganiserEventRow: one event in the organiser's list (My organised events / All events).
//
//   <OrganiserEventRow event={event} showOrganiser={isAdmin} />
//
// - A row, not EventCard: EventCard's title link covers the whole card, which would swallow
//   the Edit link. Here the title and Edit are two separate tab stops.
// - The yaml's status is only SCHEDULED or CANCELLED. Started / Ended follow from the times,
//   judged against the event's asOf (the server's clock, not the device's).
// - Edit is hidden once the event has ended or been cancelled; a started event can still be edited.
// - Times show in Africa/Lagos (lib/format).

import { CalendarDays, Pencil, UserRound, Users } from "lucide-react";
import { Link } from "react-router";
import type { FairEvent } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import { cn } from "../../shared/cn";
import { StatusBadge, type StatusBadgeTone } from "../../shared/ui/status-badge";

type EventPhase = "upcoming" | "started" | "ended" | "cancelled";

const PHASE_LABELS: Record<EventPhase, string> = {
  upcoming: "Upcoming",
  started: "Started",
  ended: "Ended",
  cancelled: "Cancelled",
};

const PHASE_TONES: Record<EventPhase, StatusBadgeTone> = {
  upcoming: "info",
  started: "success",
  ended: "neutral",
  cancelled: "danger",
};

function eventPhase(event: FairEvent): EventPhase {
  if (event.status === "CANCELLED") return "cancelled";
  const now = Date.parse(event.asOf);
  if (Date.parse(event.endsAt) <= now) return "ended";
  if (Date.parse(event.startsAt) <= now) return "started";
  return "upcoming";
}

const editLink = cn(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
  "border border-(--color-border-input) bg-(--color-surface) text-(--color-text) hover:bg-(--color-surface-hover)",
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
);

export type OrganiserEventRowProps = {
  event: FairEvent;
  /** Admins see everyone's events, so say who runs each one. */
  showOrganiser?: boolean;
};

export function OrganiserEventRow({ event, showOrganiser = false }: OrganiserEventRowProps) {
  const phase = eventPhase(event);
  const canEdit = phase === "upcoming" || phase === "started";

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface) p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 grid gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="min-w-0 text-lg font-semibold leading-snug wrap-break-word text-(--color-text)">
            <Link
              to={`/events/${encodeURIComponent(event.id)}`}
              className="rounded-sm underline-offset-2 hover:underline focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)"
            >
              {event.title}
            </Link>
          </h3>
          <StatusBadge tone={PHASE_TONES[phase]}>{PHASE_LABELS[phase]}</StatusBadge>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-(--color-text-muted)">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Starts</dt>
            <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <dd>
              <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="sr-only">Seats</dt>
            <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <dd>
              {event.seatsTaken}/{event.seats} seats taken · {event.waitingCount} waiting
            </dd>
          </div>
          {showOrganiser && (
            <div className="flex min-w-0 items-start gap-2">
              <dt className="sr-only">Organiser</dt>
              <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <dd className="min-w-0 wrap-break-word">{event.organiser.displayName}</dd>
            </div>
          )}
        </dl>
      </div>

      {canEdit && (
        <Link to={`/organiser/events/${encodeURIComponent(event.id)}/edit`} className={cn(editLink, "self-start sm:self-center")}>
          <Pencil aria-hidden="true" className="size-4" />
          Edit<span className="sr-only"> {event.title}</span>
        </Link>
      )}
    </article>
  );
}
