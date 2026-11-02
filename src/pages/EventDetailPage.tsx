// EventDetailPage: one event (GET /events/{eventId}), public. The "Event details v3" design.
//
// - useGetEventQuery(eventId) sends the token when signed in, so event.mySignup is filled then.
// - Category band: full width in the category's cover tint. Breadcrumb, the compact square cover
//   (tilted -2deg from 768px unless reduced motion is asked for), category and relative-day pills, the
//   title, the description's first line, "Add to calendar" (.ics built here) and "Copy link".
//   From 1100px its bottom padding leaves room for the booking panel to overlap it by 112px.
// - Below, two columns from 768px. Left: date and place cards, "The room", About, the host card
//   and "More from <first name>". Right: the sticky BookingPanel (bookingState picks the state).
// - Phones (<768px): one column in the same order, and the panel becomes a bar fixed to the
//   bottom (status + one action); tapping the status opens the whole panel as a sheet.
// - useNow(60s): the offer countdown moves by the minute, and the page notices the start passing.
// - Status changes (booked, in line, offer, cancelled…) are read out once by an sr-only
//   role="status" region; the first render is not announced.
// - 404 → "This event doesn't exist or was removed" and a link to Discover. Other failures →
//   ErrorState with Retry and "Reference: <requestId>". Times show in Africa/Lagos (lib/format).

import { CalendarPlus, Link2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { toApiError } from "../api/client";
import type { FairEvent } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { loginReturnState } from "../auth/returnPath";
import { Avatar } from "../components/avatar/Avatar";
import { COVER_TINTS } from "../components/category-cover/coverTints";
import { EventImage } from "../components/event-image/EventImage";
import { Button } from "../components/ui/button";
import { ErrorState } from "../components/ui/error-state";
import { Skeleton } from "../components/ui/skeleton";
import { useFairSeatToast } from "../lib/useFairSeatToast";
import { BookingBar, BookingPanel, BookingSheet, OfferWatch, type BookingPanelProps } from "../features/events/BookingPanel";
import { bookingState, relativeDayLabel } from "../features/events/bookingState";
import { useGetEventQuery } from "../features/events/eventsApi";
import { MORE_FROM_ID, MoreFromOrganiser } from "../features/events/MoreFromOrganiser";
import { firstName, useMoreFromOrganiser } from "../features/events/organiserEvents";
import { roomCounts, roomTag } from "../features/events/roomSeats";
import { SeatMap } from "../features/events/SeatMap";
import { useBookingActions } from "../features/events/useBookingActions";
import { downloadCalendarFile } from "../lib/calendarFile";
import { cn } from "../lib/cn";
import { calendarTile, formatClock, formatLongDay, formatRangeEnd } from "../lib/format";
import { CATEGORY_LABELS } from "../lib/labels";
import { useNow } from "../lib/useNow";

const CLOCK_MS = 60_000;

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

const container = "mx-auto max-w-7xl px-4 sm:px-8";

/** Panel column: 320px at 768px, 380px from 1100px. */
const columns = "grid gap-8 md:grid-cols-[minmax(0,1fr)_320px] min-[1100px]:grid-cols-[minmax(0,1fr)_380px] min-[1100px]:gap-12";

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  const { data: event, error, isLoading, isError, isFetching, refetch } = useGetEventQuery(eventId, {
    skip: !eventId,
  });

  if (isLoading) return <LoadingPage />;

  if (isError || !event) {
    const apiError = toApiError(error);
    if (!eventId || apiError.status === 404) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
          <h1 className="text-2xl font-bold text-(--color-text)">This event doesn't exist or was removed</h1>
          <p className="mt-3 text-(--color-text-muted)">The link may be wrong, or the organiser took it down.</p>
          <Link
            to="/events"
            className={cn(
              "mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-(--color-primary) px-6 font-semibold text-(--color-on-primary) hover:bg-(--color-primary-hover)",
              focusRing,
            )}
          >
            Back to Discover
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
          retryLabel="Retry"
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </main>
    );
  }

  // Keyed by id, so moving to another event (More from …) starts with fresh local state.
  return <EventDetail key={event.id} event={event} busy={isFetching} />;
}

function EventDetail({ event, busy }: { event: FairEvent; busy: boolean }) {
  const { user } = useAuth();
  const location = useLocation();
  const now = useNow(CLOCK_MS);
  const actions = useBookingActions(event);
  const more = useMoreFromOrganiser(event);
  const [sheetOpen, setSheetOpen] = useState(false);

  const state = bookingState(event, user, now);
  const signInHref = "/login";
  const signInState = loginReturnState(`${location.pathname}${location.search}${location.hash}`, user?.id ?? null);
  const panel: BookingPanelProps = { event, state, actions, now, signInHref, signInState, signedIn: !!user };

  useEffect(() => {
    document.title = `${event.title} · FairSeat`;
  }, [event.title]);

  const organiserName = firstName(event.organiser.displayName);

  return (
    <main aria-busy={busy} className="pb-16">
      {state.kind === "offer" && <OfferWatch eventId={event.id} signup={state.signup} now={now} />}

      <CategoryBand event={event} now={now} />

      <div className={cn(container, "pt-8 md:pt-10")}>
        <div className={columns}>
          <div className="flex min-w-0 flex-col gap-10">
            <WhenAndWhere event={event} now={now} />
            <TheRoom event={event} />

            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl font-semibold text-(--color-text)">
                About this event
              </h2>
              <p className="mt-3 max-w-prose leading-7 whitespace-pre-line wrap-break-word text-(--color-text)">
                {event.description.trim() || "The organiser hasn't added a description yet."}
              </p>
            </section>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-(--color-border) p-4">
              <Avatar id={event.organiser.id} name={event.organiser.displayName} size={40} decorative />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-(--color-text-muted)">Hosted by</p>
                <p className="font-semibold wrap-break-word text-(--color-text)">{event.organiser.displayName}</p>
              </div>
              {more.length > 0 && (
                <a
                  href={`#${MORE_FROM_ID}`}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border border-(--color-border-input) px-4 text-sm font-medium text-(--color-text) hover:bg-(--color-surface)",
                    focusRing,
                  )}
                >
                  More events by {organiserName}
                </a>
              )}
            </div>

            <MoreFromOrganiser events={more} name={organiserName} now={now} />
          </div>

          <aside aria-label="Booking" className="relative z-10 hidden md:block min-[1100px]:-mt-[112px]">
            <div className="sticky top-[84px]">
              <BookingPanel {...panel} />
            </div>
          </aside>
        </div>
      </div>

      <BookingBar {...panel} onOpenDetails={() => setSheetOpen(true)} className="md:hidden" />
      <BookingSheet {...panel} open={sheetOpen} onOpenChange={setSheetOpen} />
    </main>
  );
}

function CategoryBand({ event, now }: { event: FairEvent; now: number }) {
  const { toast } = useFairSeatToast();
  const tint = COVER_TINTS[event.category];
  const category = CATEGORY_LABELS[event.category];
  const firstLine = event.description.trim().split(/\r?\n/)[0];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ variant: "success", title: "Link copied" });
    } catch {
      toast({ variant: "error", title: "We couldn't copy the link", description: "Copy it from the address bar instead." });
    }
  }

  const muted = tint.dark ? "text-(--color-on-dark-muted)" : "text-(--color-text-muted)";
  const crumbLink = cn("rounded-sm underline-offset-4 hover:underline", focusRing);
  const pillClass = cn(
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
    tint.dark ? "bg-(--color-dark-panel) text-(--color-on-dark)" : "bg-(--color-bg) text-(--color-text)",
  );

  return (
    <div
      className={cn("pt-5 pb-6 md:pt-6 md:pb-10 min-[1100px]:pb-[120px]", tint.dark ? "text-(--color-on-dark)" : "text-(--color-text)")}
      style={{ background: tint.background }}
    >
      <div className={container}>
        <nav aria-label="Breadcrumb">
          <ol className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm", muted)}>
            <li>
              <Link to="/events" className={crumbLink}>
                Discover
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/events?category=${event.category}`} className={crumbLink}>
                {category}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className={cn("min-w-0 truncate font-medium", tint.dark ? "text-(--color-on-dark)" : "text-(--color-text)")}>
              {event.title}
            </li>
          </ol>
        </nav>

        <div className="mt-4 grid items-center gap-4 md:mt-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
          <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-(--radius-cover) shadow-(--shadow-cover) md:max-w-[300px] md:motion-safe:-rotate-2 min-[1100px]:max-w-[360px]">
            <EventImage category={event.category} ratio="1 / 1" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className={pillClass}>{category}</span>
              <span className={pillClass}>{relativeDayLabel(event, now)}</span>
            </div>
            <h1 className="mt-3 text-[2.25rem] leading-[1.02] font-semibold wrap-break-word md:text-5xl min-[1100px]:text-[56px]">
              {event.title}
            </h1>
            {firstLine && <p className={cn("mt-3 max-w-xl text-base leading-6 md:text-lg md:leading-7", muted)}>{firstLine}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="h-11 rounded-full border-transparent px-5"
                onClick={() =>
                  downloadCalendarFile({
                    id: event.id,
                    title: event.title,
                    startsAt: event.startsAt,
                    endsAt: event.endsAt,
                    location: event.location,
                    url: window.location.href,
                  })
                }
              >
                <CalendarPlus aria-hidden="true" className="size-4" />
                Add to calendar
              </Button>
              <Button variant="secondary" className="h-11 rounded-full border-transparent px-5" onClick={() => void copyLink()}>
                <Link2 aria-hidden="true" className="size-4" />
                Copy link
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const card = "flex min-w-0 items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-bg) p-4";

function WhenAndWhere({ event, now }: { event: FairEvent; now: number }) {
  const tile = calendarTile(event.startsAt);
  return (
    // Side by side where the column is wide enough: 640–767px (one column page) and from 1100px.
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 min-[1100px]:grid-cols-2">
      <div className={card}>
        <div
          aria-hidden="true"
          className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-(--color-surface) leading-none"
        >
          <span className="text-[11px] font-semibold tracking-wide text-(--color-copper-deep) uppercase">{tile.month}</span>
          <span className="mt-1 text-xl font-semibold text-(--color-text)">{tile.day}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-(--color-text)">
            <time dateTime={event.startsAt}>{formatLongDay(event.startsAt, now)}</time>
          </p>
          <p className="text-sm text-(--color-text-muted)">
            <time dateTime={event.startsAt}>{formatClock(event.startsAt)}</time>
            {" – "}
            <time dateTime={event.endsAt}>{formatRangeEnd(event.startsAt, event.endsAt, { now })}</time>
            <span className="sr-only"> Lagos time</span>
          </p>
        </div>
      </div>
      <div className={card}>
        <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-(--color-surface)">
          <MapPin className="size-5 text-(--color-text)" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-(--color-text-muted)">Where</p>
          <p className="font-semibold wrap-break-word text-(--color-text)">{event.location}</p>
        </div>
      </div>
    </div>
  );
}

const TAG_TONES = {
  copper: "bg-(--color-warning) text-(--color-on-warning)",
  ink: "bg-(--color-primary) text-(--color-on-primary)",
  neutral: "border border-(--color-border-input) bg-(--color-bg) text-(--color-text)",
} as const;

function TheRoom({ event }: { event: FairEvent }) {
  const tag = roomTag(event);
  const counts = roomCounts(event);
  return (
    <section aria-labelledby="room-heading" className="rounded-[20px] bg-(--color-surface) p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="room-heading" className="text-xl font-semibold text-(--color-text)">
            The room
          </h2>
          <p className="text-sm text-(--color-text-muted)">
            {counts.total} seats · {event.goingCount} going
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", TAG_TONES[tag.tone])}>{tag.text}</span>
      </div>
      <SeatMap event={event} />
    </section>
  );
}

function LoadingPage() {
  return (
    <main aria-busy="true" className="pb-16">
      <p className="sr-only">Loading event…</p>
      <div className="bg-(--color-surface) pt-5 pb-6 md:pb-10 min-[1100px]:pb-[120px]">
        <div className={container}>
          <Skeleton className="max-w-xs" />
          <div className="mt-4 grid items-center gap-4 md:mt-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
            <Skeleton shape="image" className="mx-auto aspect-square w-full max-w-[220px] rounded-(--radius-cover) md:max-w-[300px] min-[1100px]:max-w-[360px]" />
            <div className="grid gap-4">
              <Skeleton className="max-w-40" />
              <Skeleton lines={2} className="[&_div]:h-12" />
              <Skeleton lines={2} className="max-w-md" />
            </div>
          </div>
        </div>
      </div>
      <div className={cn(container, "pt-8 md:pt-10")}>
        <div className={columns}>
          <div className="grid gap-6">
            <Skeleton lines={3} />
            <Skeleton shape="image" className="rounded-[20px]" />
          </div>
          <div className="relative z-10 hidden rounded-[20px] border border-(--color-border) bg-(--color-bg) p-6 md:block min-[1100px]:-mt-[112px]">
            <Skeleton lines={6} />
          </div>
        </div>
      </div>
    </main>
  );
}
