import { CalendarDays, Check, Copy, MoreHorizontal, Plus, Users } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toApiError } from "../api/client";
import type { FairEvent } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { EventImage } from "../components/event-image/EventImage";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/empty-state";
import { ErrorState } from "../components/ui/error-state";
import { Skeleton } from "../components/ui/skeleton";
import { useToast } from "../components/ui/toast";
import { useCancelEventMutation, useListEventPagesInfiniteQuery, useListEventsQuery } from "../features/events/eventsApi";
import {
  attentionItems,
  eventsForTab,
  eventSeatChip,
  organiserQuery,
  readOrganiserTab,
  type OrganiserTab,
} from "../features/events/organiserDashboard";
import { formatDateTime } from "../lib/format";
import { useNow } from "../lib/useNow";

const CREATE_PATH = "/organiser/events/new";
const TABS: OrganiserTab[] = ["upcoming", "past", "cancelled"];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)";

function publicEventPath(event: FairEvent): string {
  return `/events/${encodeURIComponent(event.id)}`;
}

function editEventPath(event: FairEvent): string {
  return `/organiser/events/${encodeURIComponent(event.id)}/edit`;
}

function TabLink({
  tab,
  current,
  count,
  search,
  onSelect,
}: {
  tab: OrganiserTab;
  current: OrganiserTab;
  count: number | undefined;
  search: string;
  onSelect: (tab: OrganiserTab) => void;
}) {
  const params = new URLSearchParams(search);
  if (tab === "upcoming") params.delete("tab");
  else params.set("tab", tab);
  const query = params.toString();
  return (
    <Link
      to={{ search: query ? `?${query}` : "" }}
      aria-current={current === tab ? "page" : undefined}
      onClick={() => onSelect(tab)}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${focusRing} ${
        current === tab
          ? "bg-(--color-primary) text-(--color-on-primary)"
          : "text-(--color-text-muted) hover:bg-(--color-bg) hover:text-(--color-text)"
      }`}
    >
      {tab === "upcoming" ? "Upcoming" : tab === "past" ? "Past" : "Cancelled"}
      <span className={current === tab ? "text-(--color-on-primary)" : "text-(--color-text-muted)"}>
        {count ?? "–"}
      </span>
    </Link>
  );
}

function SeatBar({ event }: { event: FairEvent }) {
  const seats = Math.max(1, event.seats);
  const goingWidth = Math.min(100, (event.goingCount / seats) * 100);
  const offeredWidth = Math.min(100 - goingWidth, (event.offeredCount / seats) * 100);
  const free = Math.max(0, event.seats - event.goingCount - event.offeredCount);
  const segments = [
    { label: `${event.goingCount} going`, className: "bg-(--color-seat-going)" },
    ...(event.offeredCount > 0
      ? [{ label: `${event.offeredCount} offered`, className: "bg-(--color-seat-offered)" }]
      : []),
    { label: `${free} free`, className: "bg-(--color-border-input)" },
    ...(event.waitingCount > 0 ? [{ label: `${event.waitingCount} in line`, className: "" }] : []),
    { label: `${event.seats} seats`, className: "" },
  ];

  return (
    <div className="min-w-0 flex-1">
      <div
        role="img"
        aria-label={`${event.goingCount} going, ${event.offeredCount} offered, ${free} free of ${event.seats} seats`}
        className="flex h-1.5 overflow-hidden rounded-full bg-(--color-surface-darker)"
      >
        <span className="bg-(--color-seat-going)" style={{ width: `${goingWidth}%` }} />
        <span className="bg-(--color-seat-offered)" style={{ width: `${offeredWidth}%` }} />
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-1 text-[11px] leading-4 text-(--color-text-muted)">
        {segments.map((segment, index) => (
          <span key={segment.label} className="inline-flex items-center gap-1 whitespace-nowrap">
            {index > 0 && <span aria-hidden="true">·</span>}
            <span className={segment.className}>{segment.label}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

function SeatChip({ event, tab }: { event: FairEvent; tab: OrganiserTab }) {
  const chip = eventSeatChip(event, tab);
  const classes = {
    ink: "border-transparent bg-(--color-primary) text-(--color-on-primary)",
    copper: "border-transparent bg-(--color-copper) text-(--color-on-warning)",
    outline: "border-(--color-border-input) bg-(--color-bg) text-(--color-text-muted)",
    neutral: "border-(--color-border-input) bg-(--color-surface) text-(--color-text)",
  }[chip.tone];
  return (
    <span className={`inline-flex min-h-7 max-w-full items-center rounded-full border px-2.5 text-xs font-medium ${classes}`}>
      {chip.label}
    </span>
  );
}

function ActionMenu({
  event,
  cancellable,
  onCopy,
  onCancel,
}: {
  event: FairEvent;
  cancellable: boolean;
  onCopy: () => void;
  onCancel: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };
  return (
    <details ref={detailsRef} className="group relative">
      <summary
        aria-label={`More actions for ${event.title}`}
        className={`flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-(--color-text-muted) hover:bg-(--color-surface) [&::-webkit-details-marker]:hidden ${focusRing}`}
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex w-48 flex-col rounded-(--radius-md) border border-(--color-border) bg-(--color-bg) p-1 shadow-(--shadow-panel)">
        <Link
          to={publicEventPath(event)}
          onClick={closeMenu}
          className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-sm hover:bg-(--color-surface) ${focusRing}`}
        >
          View public page
        </Link>
        <button
          type="button"
          onClick={() => {
            closeMenu();
            onCopy();
          }}
          className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-(--color-surface) ${focusRing}`}
        >
          <Copy aria-hidden="true" className="size-4" />
          Copy link
        </button>
        {cancellable && (
          <button
            type="button"
            onClick={() => {
              closeMenu();
              onCancel();
            }}
            className={`flex min-h-11 items-center gap-2 rounded-md px-3 text-left text-sm text-(--color-danger) hover:bg-(--color-error-wash) ${focusRing}`}
          >
            Cancel event
          </button>
        )}
      </div>

    </details>
  );
}

function EventRow({
  event,
  tab,
  onCopy,
  onCancel,
}: {
  event: FairEvent;
  tab: OrganiserTab;
  onCopy: (event: FairEvent) => void;
  onCancel: (event: FairEvent) => void;
}) {
  const cancelled = tab === "cancelled" || event.status === "CANCELLED";
  const canEdit = tab === "upcoming" && !cancelled;
  const canCancel = tab === "upcoming" && !cancelled;
  return (
    <article className="grid min-w-0 gap-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-3 sm:grid-cols-[minmax(0,1fr)_minmax(170px,1.2fr)_auto_auto] sm:items-center sm:gap-4 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <EventImage
          category={event.category}
          ratio="1 / 1"
          className="size-[72px] shrink-0 rounded-(--radius-md)"
        />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-(--color-text)">
            <Link
              to={publicEventPath(event)}
              className={`rounded-sm underline-offset-2 hover:underline ${focusRing} ${cancelled ? "line-through" : ""}`}
            >
              {event.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-start gap-1 text-xs leading-4 text-(--color-text-muted)">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
              <span aria-hidden="true"> · </span>
              {event.location}
            </span>
          </p>
        </div>
      </div>

      {cancelled ? (
        <p className="text-xs text-(--color-text-muted) sm:col-start-2">Everyone was told in their notices</p>
      ) : (
        <SeatBar event={event} />
      )}

      <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end">
        <SeatChip event={event} tab={tab} />
        <div className="flex items-center gap-1">
          {canEdit && (
            <Link
              to={editEventPath(event)}
              className={`inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-border-input) px-4 text-sm font-medium hover:bg-(--color-surface) ${focusRing}`}
            >
              Edit<span className="sr-only"> {event.title}</span>
            </Link>
          )}
          <ActionMenu event={event} cancellable={canCancel} onCopy={() => onCopy(event)} onCancel={() => onCancel(event)} />
        </div>
      </div>
    </article>
  );
}

function StatCard({ label, value, detail, copper = false }: { label: string; value: ReactNode; detail?: string; copper?: boolean }) {
  return (
    <article className="min-w-0 rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) px-4 py-3">
      <h2 className="text-xs font-medium text-(--color-text-muted)">{label}</h2>
      <p className={`mt-1 text-2xl font-semibold leading-none tracking-[-0.03em] ${copper ? "text-(--color-copper-deep)" : "text-(--color-text)"}`}>
        {value}
        {detail && <span className="ml-1 text-sm font-medium tracking-normal text-(--color-text-muted)">{detail}</span>}
      </p>
    </article>
  );
}

function SkeletonRows() {
  return (
    <ul aria-label="Loading events" className="grid gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} aria-hidden="true" className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-[72px] shrink-0 rounded-(--radius-md)" />
            <div className="min-w-0 flex-1">
              <Skeleton lines={2} />
              <Skeleton className="mt-3 h-2 w-2/3" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyTab({ tab, onCreate }: { tab: OrganiserTab; onCreate: () => void }) {
  if (tab === "upcoming") {
    return (
      <EmptyState
        title="Host your first event"
        description="Set the seats, and FairSeat handles the rest: bookings, a fair line when it's full, and offers when seats open."
        action={{ label: "Create event", onClick: onCreate }}
      />
    );
  }
  return (
    <EmptyState
      title={tab === "past" ? "No past events yet" : "Nothing cancelled"}
      description={tab === "past" ? "Events will appear here after they end." : "Events you cancel will appear here."}
    />
  );
}

export default function OrganiserEventsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cancelEvent] = useCancelEventMutation();
  const [eventToCancel, setEventToCancel] = useState<FairEvent | null>(null);
  const tab = readOrganiserTab(location.search);
  const queryArgs = useMemo(() => organiserQuery(user?.id ?? "", tab), [tab, user?.id]);
  const upcomingCounts = useListEventsQuery(
    { ...organiserQuery(user?.id ?? "", "upcoming"), limit: 1 },
    { skip: !user?.id || tab === "upcoming" },
  );
  const pastCounts = useListEventsQuery(
    { ...organiserQuery(user?.id ?? "", "past"), limit: 1 },
    { skip: !user?.id || tab === "past" },
  );
  const cancelledCounts = useListEventsQuery(
    { ...organiserQuery(user?.id ?? "", "cancelled"), limit: 1 },
    { skip: !user?.id || tab === "cancelled" },
  );
  const {
    data,
    error,
    isLoading,
    isFetching,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useListEventPagesInfiniteQuery(queryArgs, { skip: !user?.id });
  const pages = data?.pages ?? [];
  const loadedEvents = pages.flatMap((page) => page.items);
  const now = useNow(30_000);
  const visibleEvents = eventsForTab(loadedEvents, tab, now);
  const upcoming = tab === "upcoming" ? visibleEvents : [];
  const attention = attentionItems(upcoming, now);

  async function copyLink(event: FairEvent) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicEventPath(event)}`);
      toast({ variant: "success", title: "Link copied" });
    } catch {
      toast({
        variant: "error",
        title: "Couldn't copy the link",
        description: "Check your browser's clipboard permission and try again.",
      });
    }
  }

  async function confirmCancel() {
    if (!eventToCancel) return;
    try {
      await cancelEvent(eventToCancel.id).unwrap();
    } catch (reason) {
      const apiError = toApiError(reason);
      toast({
        variant: "error",
        title: "Couldn't cancel the event",
        description: `${apiError.message} Reference: ${apiError.requestId}`,
      });
      throw reason;
    }
    const refreshed = await refetch();
    setEventToCancel(null);
    if (refreshed.error) {
      const apiError = toApiError(refreshed.error);
      toast({
        variant: "error",
        title: "Event cancelled, but your list couldn't be refreshed",
        description: `${apiError.message} Reference: ${apiError.requestId}`,
      });
      return;
    }
    toast({ variant: "success", title: "Event cancelled" });
  }

  function chooseTab(nextTab: OrganiserTab) {
    if (nextTab === "upcoming") navigate({ search: "" });
  }

  const countFor = (id: OrganiserTab) => {
    if (id === tab) return pages[0]?.total;
    if (id === "upcoming") return upcomingCounts.data?.total;
    if (id === "past") return pastCounts.data?.total;
    return cancelledCounts.data?.total;
  };
  const upcomingTotal = tab === "upcoming" ? pages[0]?.total : upcomingCounts.data?.total;

  return (
    <main className="min-h-full bg-(--color-surface)">
      <div className="mx-auto max-w-[1120px] px-4 py-7 sm:px-8 sm:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-heading text-(--color-text)">Your events</h1>
            <p className="mt-2 text-sm text-(--color-text-muted)">Seats, lines and offers for everything you host.</p>
          </div>
          <nav aria-label="Your events" className="flex w-fit max-w-full items-center gap-1 rounded-full border border-(--color-border) bg-(--color-bg) p-1">
            {TABS.map((id) => (
              <TabLink
                key={id}
                tab={id}
                current={tab}
                count={countFor(id)}
                search={location.search}
                onSelect={chooseTab}
              />
            ))}
          </nav>
        </header>

        {tab === "upcoming" && !isError && (
          <section aria-label="Upcoming event totals" className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) px-4 py-3">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="mt-3 h-6 w-1/3" />
                </div>
              ))
            ) : (
              <>
                <StatCard label="Upcoming events" value={upcomingTotal ?? 0} />
                {/* These sums cover the loaded pages only, not the server total. */}
                <StatCard
                  label="Seats taken"
                  value={upcoming.reduce((sum, event) => sum + event.seatsTaken, 0)}
                  detail={`/ ${upcoming.reduce((sum, event) => sum + event.seats, 0)}`}
                />
                <StatCard label="People in line" value={upcoming.reduce((sum, event) => sum + event.waitingCount, 0)} />
                <StatCard
                  label="Offers waiting"
                  value={upcoming.reduce((sum, event) => sum + event.offeredCount, 0)}
                  copper
                />
              </>
            )}
          </section>
        )}

        {tab === "upcoming" && attention.length > 0 && !isLoading && !isError && (
          <section aria-labelledby="attention-heading" className="mb-8">
            <h2 id="attention-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
              Needs your attention
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {attention.map((item) =>
                item.kind === "waiting" ? (
                  <article key={item.event.id} className="rounded-(--radius-card) border border-(--color-copper-soft) bg-(--color-copper-wash) p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--color-copper) text-(--color-on-warning)">
                        <Users aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-snug text-(--color-text)">
                          {item.event.waitingCount} {item.event.waitingCount === 1 ? "person is" : "people are"} waiting for {item.event.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-(--color-copper-deep)">
                          If the venue has room, add seats and they're offered to the line straight away, in order.
                        </p>
                        <Link
                          to={`${editEventPath(item.event)}?focus=seats`}
                          className={`mt-2 inline-flex min-h-11 items-center gap-1 rounded-full bg-(--color-primary) px-4 text-xs font-semibold text-(--color-on-primary) hover:bg-(--color-primary-hover) ${focusRing}`}
                        >
                          <Plus aria-hidden="true" className="size-3.5" />
                          Add seats
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : (
                  <article key={item.event.id} className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--color-surface) text-(--color-text-muted)">
                        <Check aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold leading-snug text-(--color-text)">{item.event.title} has no sign-ups yet</h3>
                        <p className="mt-1 text-xs leading-5 text-(--color-text-muted)">
                          It's {item.daysAway} days away. Share the link with your community to get it moving.
                        </p>
                        <button
                          type="button"
                          onClick={() => void copyLink(item.event)}
                          className={`mt-2 inline-flex min-h-11 items-center gap-1 rounded-full border border-(--color-border-input) px-4 text-xs font-medium hover:bg-(--color-surface) ${focusRing}`}
                        >
                          <Copy aria-hidden="true" className="size-3.5" />
                          Copy link
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        )}

        {tab === "upcoming" && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Upcoming</h2>}
        {tab === "past" && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Past events</h2>}
        {tab === "cancelled" && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Cancelled events</h2>}

        <section aria-label={`${tab} events`} aria-busy={isFetching}>
          {isLoading ? (
            <SkeletonRows />
          ) : isError ? (
            <ErrorState
              headingLevel="h2"
              title="We couldn't load your events"
              description={`${toApiError(error).isConnectionProblem ? "Check your connection and try again." : "Something went wrong on our side. Try again in a moment."} Reference: ${toApiError(error).requestId}`}
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          ) : visibleEvents.length === 0 ? (
            <>
              <EmptyTab tab={tab} onCreate={() => navigate(CREATE_PATH)} />
              {hasNextPage && (
                <div className="mt-2 flex justify-center">
                  <Button variant="secondary" loading={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                    Show more
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <ul className={`grid gap-3 transition-opacity ${isFetching && !isFetchingNextPage ? "opacity-60" : ""}`}>
                {visibleEvents.map((event) => (
                  <li key={event.id} className="min-w-0">
                    <EventRow event={event} tab={tab} onCopy={(item) => void copyLink(item)} onCancel={setEventToCancel} />
                  </li>
                ))}
              </ul>
              {hasNextPage && (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" loading={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                    Show more
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={eventToCancel !== null}
        onOpenChange={(open) => {
          if (!open) setEventToCancel(null);
        }}
        title={eventToCancel ? `Cancel ${eventToCancel.title}?` : "Cancel event?"}
        description={
          eventToCancel
            ? `All ${eventToCancel.seatsTaken} ${eventToCancel.seatsTaken === 1 ? "seat" : "seats"} and the ${eventToCancel.waitingCount} ${eventToCancel.waitingCount === 1 ? "person" : "people"} in line are released, and everyone gets a notice. This can't be undone.`
            : "This can't be undone."
        }
        confirmLabel="Cancel event"
        tone="danger"
        onConfirm={confirmCancel}
      />
    </main>
  );
}
