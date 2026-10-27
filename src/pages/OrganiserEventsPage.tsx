// OrganiserEventsPage: the events an organiser runs (GET /events?organiserId=…), or every event for an admin.
//
// - Same useListEventsQuery as the public Events page, with different args. RTK Query caches per
//   arg, so this list and /events are separate cache entries; both refetch after any event
//   change, because createEvent / updateEvent / cancelEvent invalidate "EventList".
// - "Show past events" and "Show cancelled events" and the page live in the URL (useEventFilters
//   in organiser mode), so links and Back work. Both off by default, like the API.
// - isLoading: no data yet → skeletons. isFetching with old data → dim the old rows.

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { toApiError } from "../api/client";
import type { EventPage } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { OrganiserEventRow } from "../features/events/OrganiserEventRow";
import { useListEventsQuery } from "../features/events/eventsApi";
import { PAGE_SIZE, useEventFilters, type EventFilters } from "../features/events/useEventFilters";
import { cn } from "../shared/cn";
import { Button } from "../shared/ui/button";
import { Checkbox } from "../shared/ui/checkbox";
import { EmptyState } from "../shared/ui/empty-state";
import { ErrorState } from "../shared/ui/error-state";
import { Skeleton } from "../shared/ui/skeleton";

const CREATE_PATH = "/organiser/events/new";

const linkButton = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
  "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)",
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
);

/** "Showing 21–40 of 45 events". */
function showingMessage(data: EventPage): string {
  if (data.items.length === 0) return "No events found";
  const first = data.offset + 1;
  const last = data.offset + data.items.length;
  return `Showing ${first}–${last} of ${data.total} ${data.total === 1 ? "event" : "events"}`;
}

/** Says which events the toggles are hiding, so an empty list isn't mistaken for "nothing at all". */
function hiddenHint({ includePast, includeCancelled }: EventFilters): string {
  if (!includePast && !includeCancelled) return "Past and cancelled events are hidden. ";
  if (!includePast) return "Past events are hidden. ";
  if (!includeCancelled) return "Cancelled events are hidden. ";
  return "";
}

function CreateEventLink() {
  return (
    <Link to={CREATE_PATH} className={linkButton}>
      <Plus aria-hidden="true" className="size-4" />
      Create event
    </Link>
  );
}

export default function OrganiserEventsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { filters, queryArgs, setToggle, setOffset } = useEventFilters({
    organiserId: isAdmin ? undefined : user?.id,
  });
  const { data, error, isLoading, isFetching, isError, refetch } = useListEventsQuery(queryArgs);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  // Move to the top of the new page, so keyboard and screen reader users start reading there.
  function goToOffset(offset: number) {
    setOffset(offset);
    resultsHeadingRef.current?.focus();
  }

  const refreshing = isFetching && !isLoading;

  function renderResults(): ReactNode {
    if (isLoading) {
      return (
        <ul className="grid gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
              <Skeleton lines={2} />
            </li>
          ))}
        </ul>
      );
    }

    if (isError) {
      const apiError = toApiError(error);
      const advice = apiError.isConnectionProblem
        ? "Check your connection and try again."
        : "Something went wrong on our side. Try again in a moment.";
      return (
        <ErrorState
          headingLevel="h3"
          title="We couldn't load events"
          description={`${advice} Reference: ${apiError.requestId}`}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      );
    }

    if (!data) return null;

    if (data.items.length === 0) {
      // ?offset points past the end, e.g. an old link after events were cancelled.
      if (data.offset > 0 && data.total > 0) {
        return (
          <EmptyState
            headingLevel="h3"
            title="This page is empty"
            description={`There are ${data.total} matching events, but none on this page.`}
            action={{ label: "Go to the first page", onClick: () => goToOffset(0) }}
          />
        );
      }
      const hint = hiddenHint(filters);
      return (
        <div className="flex flex-col items-center">
          <EmptyState
            headingLevel="h3"
            title={isAdmin ? "There are no events yet" : "You haven't created any events yet"}
            description={`${hint}Create an event and it will show up here.`}
          />
          <CreateEventLink />
        </div>
      );
    }

    const hasPrevious = data.offset > 0;
    const hasNext = data.offset + data.items.length < data.total;

    return (
      <div className={cn("transition-opacity", refreshing && "opacity-60")}>
        <ul className="grid gap-4">
          {data.items.map((event) => (
            <li key={event.id} className="min-w-0">
              <OrganiserEventRow event={event} showOrganiser={isAdmin} />
            </li>
          ))}
        </ul>

        {(hasPrevious || hasNext) && (
          <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              className="min-h-11"
              disabled={!hasPrevious}
              onClick={() => goToOffset(Math.max(0, data.offset - PAGE_SIZE))}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Previous
            </Button>
            <Button
              variant="secondary"
              className="min-h-11"
              disabled={!hasNext}
              onClick={() => goToOffset(data.offset + PAGE_SIZE)}
            >
              Next
              <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </nav>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-(--color-text)">
            {isAdmin ? "All events" : "My organised events"}
          </h1>
          <p className="mt-2 text-(--color-text-muted)">
            {isAdmin ? "Every event on FairSeat, soonest first." : "The events you run, soonest first."}
          </p>
        </div>
        <CreateEventLink />
      </header>

      <section aria-labelledby="options-heading" className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
        <h2 id="options-heading" className="sr-only">
          Options
        </h2>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Checkbox
            label="Show past events"
            checked={filters.includePast}
            onCheckedChange={(on) => setToggle("includePast", on)}
          />
          <Checkbox
            label="Show cancelled events"
            checked={filters.includeCancelled}
            onCheckedChange={(on) => setToggle("includeCancelled", on)}
          />
        </div>
        {/* Always rendered: a live region must exist before its text changes to be announced. */}
        <p aria-live="polite" aria-atomic="true" className="mt-3 min-h-5 text-sm text-(--color-text-muted)">
          {data && !isFetching && !isError ? showingMessage(data) : ""}
        </p>
      </section>

      <section aria-labelledby="results-heading" aria-busy={isFetching} className="mt-8">
        <h2
          id="results-heading"
          ref={resultsHeadingRef}
          tabIndex={-1}
          className="mb-4 rounded-sm text-xl font-semibold text-(--color-text) focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)]"
        >
          Events
        </h2>
        {renderResults()}
      </section>
    </main>
  );
}
