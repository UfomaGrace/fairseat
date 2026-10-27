// EventDetailPage: one event (GET /events/{eventId}), public.
//
// - useGetEventQuery(eventId) sends the token when signed in, so event.mySignup is filled then.
// - 404 → "Event not found" with a link back to /events. Other failures → ErrorState with Reference.
// - Times show in Africa/Lagos (lib/format).
// - A cancelled, started or ended event gets a banner and no booking box. useNow(30s) lets the
//   page notice the start time passing while it is open.
// - SignupActions holds the booking buttons. "Edit event" is for the event's organiser, or any admin.

import { ArrowLeft, CalendarDays, MapPin, UserRound, Users } from "lucide-react";
import { Link, useParams } from "react-router";
import { toApiError } from "../api/client";
import type { FairEvent, User } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { useGetEventQuery } from "../features/events/eventsApi";
import { SignupActions } from "../features/signups/SignupActions";
import { formatDateTime } from "../lib/format";
import { CATEGORY_LABELS, SIGNUP_STATUS_TONES, signupStatusLabel } from "../lib/labels";
import { useNow } from "../lib/useNow";
import { cn } from "../shared/cn";
import { ErrorState } from "../shared/ui/error-state";
import { Skeleton } from "../shared/ui/skeleton";
import { StatusBadge } from "../shared/ui/status-badge";

const START_CHECK_MS = 30_000;

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

const linkButton = (variant: "primary" | "secondary") =>
  cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
    variant === "primary"
      ? "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)"
      : "border border-(--color-border-input) bg-(--color-surface) text-(--color-text) hover:bg-(--color-surface-hover)",
    focusRing,
  );

/** Why booking is closed, or null while it is open. */
function closedNotice(event: FairEvent, now: number): string | null {
  if (event.status === "CANCELLED") return "This event has been cancelled. Booking is closed.";
  if (Date.parse(event.endsAt) <= now) return "This event has ended.";
  if (Date.parse(event.startsAt) <= now) return "This event has started. Booking is closed.";
  return null;
}

/** "2 seats left" / "Full · 3 on the waitlist". */
function seatsLeftText(event: FairEvent): string {
  const { seatsAvailable, waitingCount } = event;
  if (seatsAvailable > 0) return `${seatsAvailable} ${seatsAvailable === 1 ? "seat" : "seats"} left`;
  return waitingCount > 0 ? `Full · ${waitingCount} on the waitlist` : "Full · waitlist open";
}

function canEdit(user: User | null, event: FairEvent): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || (user.role === "ORGANISER" && user.id === event.organiser.id);
}

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  const { user } = useAuth();
  const now = useNow(START_CHECK_MS);
  const { data: event, error, isLoading, isError, isFetching, refetch } = useGetEventQuery(eventId, {
    skip: !eventId,
  });

  if (isLoading) {
    return (
      <main aria-busy="true" className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <p className="sr-only">Loading event…</p>
        <Skeleton lines={2} className="max-w-md" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <Skeleton lines={6} />
          <Skeleton lines={5} />
        </div>
      </main>
    );
  }

  if (isError || !event) {
    const apiError = toApiError(error);
    if (!eventId || apiError.status === 404) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
          <h1 className="text-2xl font-bold text-(--color-text)">Event not found</h1>
          <p className="mt-3 text-(--color-text-muted)">
            This event may have been removed, or the link may be wrong.
          </p>
          <Link to="/events" className={cn(linkButton("primary"), "mt-6")}>
            Browse events
          </Link>
        </main>
      );
    }
    const advice = apiError.isConnectionProblem
      ? "Check your connection and try again."
      : "Something went wrong on our side. Try again in a moment.";
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="sr-only">Event details</h1>
        <ErrorState
          title="We couldn't load this event"
          description={`${advice} Reference: ${apiError.requestId}`}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </main>
    );
  }

  const closed = closedNotice(event, now);
  const { mySignup } = event;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <Link
        to="/events"
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-(--color-text-muted) hover:text-(--color-text)",
          focusRing,
        )}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to events
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge>{CATEGORY_LABELS[event.category]}</StatusBadge>
          {mySignup && (
            <StatusBadge tone={SIGNUP_STATUS_TONES[mySignup.status]}>{signupStatusLabel(mySignup)}</StatusBadge>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight wrap-break-word text-(--color-text) sm:text-4xl">
          {event.title}
        </h1>
      </header>

      {closed && (
        <p
          className={cn(
            "mt-6 rounded-md border border-l-4 p-4 font-medium",
            event.status === "CANCELLED"
              ? "border-(--color-danger) bg-(--color-danger-subtle) text-(--color-danger)"
              : "border-(--color-border) border-l-(--color-warning) bg-(--color-warning-subtle) text-(--color-text)",
          )}
        >
          {closed}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="about-heading" className="min-w-0">
          <h2 id="about-heading" className="text-lg font-semibold text-(--color-text)">
            About this event
          </h2>
          <p className="mt-3 leading-7 whitespace-pre-line wrap-break-word text-(--color-text)">
            {event.description.trim() || "The organiser hasn't added a description yet."}
          </p>
        </section>

        <aside
          aria-labelledby="details-heading"
          aria-busy={isFetching}
          className="h-fit rounded-lg border border-(--color-border) bg-(--color-surface) p-5"
        >
          <h2 id="details-heading" className="text-lg font-semibold text-(--color-text)">
            Event details
          </h2>

          <dl className="mt-4 grid gap-4 text-sm">
            <div className="flex gap-3">
              <CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--color-text-muted)" />
              <div>
                <dt className="font-semibold text-(--color-text-muted)">When (Lagos time)</dt>
                <dd className="mt-0.5 text-(--color-text)">
                  <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
                  {" to "}
                  <time dateTime={event.endsAt}>{formatDateTime(event.endsAt)}</time>
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--color-text-muted)" />
              <div className="min-w-0">
                <dt className="font-semibold text-(--color-text-muted)">Where</dt>
                <dd className="mt-0.5 wrap-break-word text-(--color-text)">{event.location}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--color-text-muted)" />
              <div className="min-w-0">
                <dt className="font-semibold text-(--color-text-muted)">Organiser</dt>
                <dd className="mt-0.5 wrap-break-word text-(--color-text)">{event.organiser.displayName}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--color-text-muted)" />
              <div>
                <dt className="font-semibold text-(--color-text-muted)">Seats</dt>
                <dd
                  className={cn(
                    "mt-0.5 font-medium",
                    event.seatsAvailable > 0 ? "text-(--color-success)" : "text-(--color-warning)",
                  )}
                >
                  {seatsLeftText(event)}
                </dd>
                <dd className="text-(--color-text-muted)">
                  {event.seatsTaken} of {event.seats} taken
                </dd>
              </div>
            </div>
          </dl>

          {!closed && (
            <div className="mt-6 border-t border-(--color-border) pt-5">
              <SignupActions event={event} />
            </div>
          )}

          {!closed && canEdit(user, event) && (
            <Link
              to={`/organiser/events/${encodeURIComponent(event.id)}/edit`}
              className={cn(linkButton("secondary"), "mt-3 w-full")}
            >
              Edit event
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
