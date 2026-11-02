import { CalendarDays, Check, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { Signup } from "../api/types";
import { FairSeatLogo } from "../components/FairSeatLogo";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/empty-state";
import { ErrorState } from "../components/ui/error-state";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/ui/status-badge";
import { useBookingActions } from "../features/events/useBookingActions";
import { formatTimeLeft } from "../features/events/bookingText";
import { useListMySignupsQuery } from "../features/signups/signupsApi";
import { toApiError } from "../api/client";
import { formatDateTime, formatRangeEnd, formatRelativeDay, lagosDaysFromToday } from "../lib/format";
import { SIGNUP_STATUS_TONES } from "../lib/labels";
import { useNow } from "../lib/useNow";
import { baseApi } from "../store/baseApi";
import { useAppDispatch } from "../store/hooks";

const OFFER_POLL_MS = 30_000;
const CLOCK_MS = 60_000;
const RELATIVE_WEEKDAYS = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "Africa/Lagos",
});
type Scope = "upcoming" | "past";

function relativeEventDate(startsAt: string, now: number): string {
  const days = lagosDaysFromToday(startsAt, now);
  if (Number.isNaN(days)) return formatDateTime(startsAt);
  if (days === 0 || days === 1 || days < 0) return formatRelativeDay(startsAt, now);
  if (days <= 7) return `${RELATIVE_WEEKDAYS.format(Date.parse(startsAt))} · in ${days} days`;
  return formatRelativeDay(startsAt, now);
}

function ticketStatus(signup: Signup, scope: Scope): string {
  if (signup.event.status === "CANCELLED") return "Event cancelled";
  if (scope === "past") {
    switch (signup.status) {
      case "GOING":
        // The API doesn't record attendance; a past booking only confirms that the attendee had a seat.
        return "Went · Had a seat";
      case "WAITING":
        return signup.waitingPosition ? `Missed out · Was #${signup.waitingPosition} in line` : "Missed out";
      case "CANCELLED":
        return "Gave up seat";
      default:
        return signup.status === "OFFER_EXPIRED" ? "Offer expired" : "Seat offered";
    }
  }
  switch (signup.status) {
    case "GOING":
      return "You're going";
    case "WAITING":
      return "In line";
    case "OFFERED":
      return "Seat offered";
    case "OFFER_EXPIRED":
      return "Offer expired";
    case "CANCELLED":
      return "Cancelled";
  }
}

function TicketStatus({ signup, scope }: { signup: Signup; scope: Scope }) {
  const label = ticketStatus(signup, scope);
  const tone = SIGNUP_STATUS_TONES[signup.status];
  const muted = scope === "past" || signup.status === "OFFER_EXPIRED" || signup.status === "CANCELLED" || signup.event.status === "CANCELLED";
  return (
    <StatusBadge
      tone="neutral"
      className={`rounded-full border-transparent bg-[var(--color-bg)] px-2.5 py-1 text-[var(--color-text)] ${
        tone === "warning" && !muted ? "text-[var(--color-copper-deep)]" : ""
      } ${muted ? "text-[var(--color-text-muted)]" : ""}`}
    >
      {signup.status === "GOING" && scope === "upcoming" && signup.event.status !== "CANCELLED" ? (
        <span className="inline-flex items-center gap-1"><Check aria-hidden="true" size={12} />{label}</span>
      ) : label}
    </StatusBadge>
  );
}

function SeatMotif({ offered = false, muted = false }: { offered?: boolean; muted?: boolean }) {
  return (
    <div aria-hidden="true" className="flex items-end gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2 rounded-t-sm ${index === 2
            ? muted
              ? "bg-[var(--color-border-input)]"
              : offered
                ? "bg-[var(--color-seat-offered)]"
                : "bg-[var(--color-seat-going)]"
            : "bg-[var(--color-surface-darker)]"
          }`}
        />
      ))}
    </div>
  );
}

function LineMotif({ position }: { position: number | null }) {
  const current = position ?? 1;
  const compressed = current > 4;
  const dotKinds = compressed
    ? ["ahead", "ahead", "ahead", "you", "after"]
    : Array.from({ length: 5 }, (_, index) => {
        if (index + 1 < current) return "ahead";
        if (index + 1 === current) return "you";
        return "after";
      });
  return (
    <div aria-hidden="true" className="flex h-3 items-center gap-1.5">
      {dotKinds.map((kind, index) => (
        <span
          key={index}
          className={`rounded-full ${kind === "you"
            ? "size-3 bg-[var(--color-primary)]"
            : kind === "ahead"
              ? "size-2 bg-[var(--color-surface-darker)]"
              : "size-2 border border-[var(--color-seat-free-border)] bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

function TicketSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="grid min-h-40 content-start gap-4 bg-[var(--color-surface)] p-5">
        <div className="flex justify-between gap-4"><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-20" /></div>
        <Skeleton className="h-6 w-4/5" />
        <Skeleton lines={2} />
      </div>
      <div className="border-t-2 border-dashed border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between gap-4"><Skeleton lines={2} /><Skeleton className="h-10 w-24 rounded-full" /></div>
      </div>
    </div>
  );
}

function LoadingTickets() {
  return (
    <div aria-busy="true" className="mx-auto max-w-[1000px] px-4 py-8 sm:px-8">
      <p className="sr-only">Loading your events…</p>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">My events</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => <TicketSkeleton key={index} />)}
      </div>
    </div>
  );
}

function PageTabs({ scope, upcomingCount, pastCount, onChange }: {
  scope: Scope;
  upcomingCount: number;
  pastCount: number;
  onChange: (scope: Scope) => void;
}) {
  return (
    <div role="group" aria-label="Event time period" className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
      {(["upcoming", "past"] as const).map((value) => {
        const selected = scope === value;
        const label = value === "upcoming" ? "Upcoming" : "Past";
        const count = value === "upcoming" ? upcomingCount : pastCount;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(value)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
              selected
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            }`}
          >
            {label} · {count}
          </button>
        );
      })}
    </div>
  );
}

export default function MyEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawScope = searchParams.get("scope");
  const scope: Scope = rawScope === "past" ? "past" : "upcoming";
  const upcoming = useListMySignupsQuery({ scope: "upcoming" });
  const past = useListMySignupsQuery({ scope: "past" });
  const upcomingHasOffer = upcoming.data?.items.some((signup) => signup.status === "OFFERED" && signup.event.status !== "CANCELLED") ?? false;
  const navigate = useNavigate();
  const now = useNow(CLOCK_MS);
  const dispatch = useAppDispatch();
  const current = scope === "past" ? past : upcoming;
  const signups = current.data?.items ?? [];
  const tickets = scope === "upcoming"
    ? [...signups].sort((a, b) => Number(b.status === "OFFERED" && b.event.status !== "CANCELLED") - Number(a.status === "OFFERED" && a.event.status !== "CANCELLED") || Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt))
    : signups;
  const isLoading = current.isLoading;
  const { isError, error, isFetching, refetch } = current;
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!upcomingHasOffer) return;
    const timer = window.setInterval(() => {
      if (upcoming.data?.items.some((signup) =>
        signup.status === "OFFERED" && signup.offerExpiresAt !== null && Date.parse(signup.offerExpiresAt) <= Date.now()
      )) {
        dispatch(baseApi.util.invalidateTags(["MySignup"]));
      }
    }, CLOCK_MS);
    return () => window.clearInterval(timer);
  }, [dispatch, upcoming.data, upcomingHasOffer]);

  if (isLoading) return <LoadingTickets />;

  if (isError || !current.data) {
    const apiError = toApiError(error);
    const advice = apiError.isConnectionProblem
      ? "Check your connection and try again."
      : "Something went wrong on our side. Try again in a moment.";
    return (
      <main className="min-h-screen bg-[var(--color-surface)]">
        <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">My events</h1>
          <ErrorState
            title="We couldn't load your events"
            description={`${advice} Reference: ${apiError.requestId}`}
            onRetry={() => void refetch()}
            retrying={isFetching}
            className="mt-8 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg)]"
          />
        </div>
      </main>
    );
  }

  const offered = scope === "upcoming" && signups.some((signup) => signup.status === "OFFERED" && signup.event.status !== "CANCELLED");
  const goingCount = signups.filter((signup) => signup.status === "GOING").length;
  const waitingCount = signups.filter((signup) => signup.status === "WAITING").length;

  async function refreshBothScopes() {
    await Promise.all([upcoming.refetch(), past.refetch()]);
  }

  function chooseScope(nextScope: Scope) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("scope", nextScope);
      return next;
    });
  }

  return (
    <main aria-busy={isFetching} className="min-h-screen bg-[var(--color-surface)]">
      <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">My events</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {scope === "past"
                ? "Events that have already happened"
                : offered
                  ? "You have an offer waiting. Answer it before it goes to the next person."
                  : `${goingCount} going · ${waitingCount} in line`}
            </p>
          </div>
          <PageTabs
            scope={scope}
            upcomingCount={upcoming.data?.items.length ?? 0}
            pastCount={past.data?.items.length ?? 0}
            onChange={chooseScope}
          />
        </div>

        <p aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>

        {upcomingHasOffer && <OfferPoller />}
        {signups.length === 0 ? (
          <section className="mt-8 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg)]">
            {scope === "upcoming" ? (
              <>
                <div aria-hidden="true" className="flex justify-center gap-2 pt-8">
                  {Array.from({ length: 7 }, (_, index) => (
                    <span key={index} className={`h-4 w-3 rounded-t-sm ${index === 3 ? "bg-[var(--color-seat-offered)]" : "bg-[var(--color-surface-darker)]"}`} />
                  ))}
                </div>
                <EmptyState
                  title="No tickets yet"
                  description="Book a seat, or join the line for a full event, and your ticket will show up here."
                  action={{ label: "Discover events", onClick: () => navigate("/events") }}
                />
              </>
            ) : (
              <EmptyState title="Nothing here yet" description="Your past event tickets will show up here." />
            )}
          </section>
        ) : (
          <ul className="mt-7 grid list-none gap-4 p-0 md:grid-cols-2">
            {tickets.map((signup) => (
              <Ticket
                key={signup.id}
                signup={signup}
                scope={scope}
                now={now}
                refresh={refreshBothScopes}
                announce={setAnnouncement}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function OfferPoller() {
  useListMySignupsQuery({ scope: "upcoming" }, { pollingInterval: OFFER_POLL_MS });
  return null;
}

function Ticket({ signup, scope, now, refresh, announce }: {
  signup: Signup;
  scope: Scope;
  now: number;
  refresh: () => Promise<void>;
  announce: (message: string) => void;
}) {
  const { event } = signup;
  // EventSummary has no category yet; the backend could add `category` to EventSummary.
  const actions = useBookingActions(event);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cancelledByEvent = event.status === "CANCELLED";
  const expired = signup.status === "OFFER_EXPIRED";
  const cancelledByPerson = signup.status === "CANCELLED" && !cancelledByEvent;
  const offered = signup.status === "OFFERED" && !cancelledByEvent;
  const neutralTint = expired || cancelledByPerson || cancelledByEvent;
  const topTint = "var(--color-surface)";
  const stubTint = offered
    ? "var(--color-copper-wash)"
    : neutralTint
      ? "var(--color-surface)"
      : "var(--color-bg)";
  const expiresAt = signup.offerExpiresAt ? Date.parse(signup.offerExpiresAt) : Number.NaN;
  const remainingMs = expiresAt - now;
  const offerEnded = offered && remainingMs <= 0;

  useEffect(() => {
    if (offerEnded) dispatch(baseApi.util.invalidateTags(["MySignup"]));
  }, [dispatch, offerEnded]);

  async function complete(action: (onResult: (succeeded: boolean) => void) => Promise<void>, successMessage: string) {
    let succeeded = false;
    await action((result) => {
      succeeded = result;
    });
    await refresh();
    announce(succeeded ? successMessage : "We couldn't make that change. Check the latest ticket status.");
  }

  function eventLink() {
    return `/events/${encodeURIComponent(event.id)}`;
  }

  let ticketLabel = "Your place";
  let ticketValue: string;
  let motif = <SeatMotif />;
  let rightAction = <Button variant="secondary" size="sm" className="min-h-11" onClick={() => navigate(eventLink())}>View event</Button>;

  if (scope === "past" && signup.status === "GOING") {
    ticketValue = "Had a seat";
    motif = <SeatMotif muted />;
  } else if (scope === "past" && signup.status === "WAITING") {
    ticketValue = signup.waitingPosition ? `Was #${signup.waitingPosition} in line` : "Missed out";
    motif = <LineMotif position={signup.waitingPosition} />;
  } else if (offered) {
    ticketLabel = "Accept within";
    ticketValue = Number.isFinite(remainingMs) && remainingMs > 0 ? formatTimeLeft(remainingMs) : "0m";
    motif = <SeatMotif offered />;
    rightAction = (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          className="min-h-11"
          loading={actions.accepting}
          disabled={offerEnded}
          onClick={(event) => {
            event.stopPropagation();
            void complete((onResult) => actions.accept(signup, onResult), "Your ticket was updated. The latest status is shown.");
          }}
        >
          Accept seat
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="secondary" size="sm" className="min-h-11" loading={actions.cancellingSignup} onClick={(event) => event.stopPropagation()}>
              Decline
            </Button>
          }
          title="Decline this seat?"
          description="The seat goes to the next person in line and you leave the line. You can't undo this."
          confirmLabel="Decline seat"
          cancelLabel="Keep the offer"
          tone="danger"
          loading={actions.cancellingSignup}
          onConfirm={() => complete((onResult) => actions.cancelSignup(signup, "You've declined the seat", onResult), "Your offer was declined.")}
        />
      </div>
    );
  } else if (expired) {
    ticketLabel = "What happened";
    ticketValue = "Seat went to the next person";
    if (scope === "upcoming") {
      rightAction = (
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          loading={actions.booking}
          onClick={(event) => {
            event.stopPropagation();
            void complete((onResult) => actions.book(onResult), "Your ticket was updated. The latest status is shown.");
          }}
        >
          Join again
        </Button>
      );
    }
  } else if (cancelledByEvent) {
    ticketLabel = "What happened";
    ticketValue = "Cancelled by the organiser";
    rightAction = <Button variant="secondary" size="sm" className="min-h-11" onClick={() => navigate(eventLink())}>Details</Button>;
  } else if (cancelledByPerson) {
    ticketLabel = "What happened";
    ticketValue = scope === "past" ? "Gave up seat" : "You gave up your seat";
    rightAction = <Button variant="secondary" size="sm" className="min-h-11" onClick={() => navigate(eventLink())}>Details</Button>;
  } else if (signup.status === "WAITING") {
    ticketValue = signup.waitingPosition ? `#${signup.waitingPosition} in line` : "In line";
    motif = <LineMotif position={signup.waitingPosition} />;
  } else {
    ticketValue = "Seat booked";
  }

  return (
    <li className="min-w-0">
      <article className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg)] transition-transform duration-200 hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
        <Link
          to={eventLink()}
          className="relative block min-h-[168px] rounded-t-[inherit] p-5 text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--color-focus)]"
          style={{ background: topTint }}
        >
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 opacity-25">
            <FairSeatLogo size={42} />
          </span>
          <div className="relative z-10">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <TicketStatus signup={signup} scope={scope} />
              <time dateTime={event.startsAt} className="shrink-0 pt-1 text-right text-xs text-[var(--color-text-muted)]">
                {relativeEventDate(event.startsAt, now)}
              </time>
            </div>
            <h2 className={`mt-4 line-clamp-2 text-lg font-semibold leading-snug ${cancelledByEvent ? "text-[var(--color-text-muted)] line-through" : ""}`}>
              {event.title}
            </h2>
            <div className="mt-3 grid gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="flex min-w-0 items-center gap-1.5">
                <CalendarDays aria-hidden="true" size={13} className="shrink-0" />
                <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
                <span aria-hidden="true">–</span>
                <time dateTime={event.endsAt}>{formatRangeEnd(event.startsAt, event.endsAt)}</time>
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin aria-hidden="true" size={13} className="shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            </div>
          </div>
        </Link>

        <div className="relative border-t-2 border-dashed border-[var(--color-border)]">
          <span aria-hidden="true" className="absolute -left-2 -top-[9px] size-4 rounded-full bg-[var(--color-surface)]" />
          <span aria-hidden="true" className="absolute -right-2 -top-[9px] size-4 rounded-full bg-[var(--color-surface)]" />
          <div className="flex min-h-[84px] items-center justify-between gap-3 px-5 py-3" style={{ background: stubTint }}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden shrink-0 sm:block">{motif}</div>
              <div className="min-w-0">
                <p className="text-[11px] leading-4 text-[var(--color-text-muted)]">{ticketLabel}</p>
                <p className={`max-w-full text-sm font-semibold leading-5 text-[var(--color-text)] ${neutralTint ? "text-[var(--color-text-muted)]" : ""}`}>
                  {ticketValue}
                </p>
                <div className="mt-1 sm:hidden">{motif}</div>
              </div>
            </div>
            <div className="shrink-0 [&_a]:no-underline">
              {rightAction}
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}
