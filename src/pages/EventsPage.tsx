// EventsPage: Discover, the public home page. "What's on in Lagos", category chips and the
// "Date and area" control, the featured "Next up" event, then "This week" and "Later".
//
// - Filters live in the URL (useEventFilters), so refresh, Back and shared links keep them:
//   ?q (header search) &category (chips) &location&from&to (Date and area).
// - Data: GET /events through listEventPages, an RTK Query infinite query. "Show more events"
//   asks for the next offset and is hidden once all `total` events are loaded. A booking
//   invalidates "EventList", so every loaded page refetches and shows the true seat counts.
// - Featured: the soonest loaded event with a free seat (pickFeatured). It isn't repeated in the
//   lists. "This week" is the next 7 Lagos days (groupByWeek). Empty groups are hidden.
// - isLoading: no data yet → skeleton rows. isFetching after that (a filter change or a refetch)
//   → the old results dim until the new ones arrive.
// - The request is skipped while a date in the URL is invalid; Date and area shows why.
// - "Show more events" moves focus to the first new event, so keyboard users carry on from there.

import { useEffect, useRef } from "react";
import { toApiError } from "../api/client";
import { Chip } from "../components/chip/Chip";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { ErrorState } from "../components/ui/error-state";
import { DateAreaFilter } from "../features/events/DateAreaFilter";
import { DiscoverEventRow, DiscoverEventRowSkeleton } from "../features/events/DiscoverEventRow";
import { groupByWeek, loadedEvents, pickFeatured } from "../features/events/discover";
import { useListEventPagesInfiniteQuery, type EventPagesQuery } from "../features/events/eventsApi";
import { FeaturedEvent } from "../features/events/FeaturedEvent";
import { useEventFilters } from "../features/events/useEventFilters";
import type { FairEvent } from "../api/types";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "../lib/labels";
import { useNow } from "../lib/useNow";
import { cn } from "../lib/cn";

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "event" : "events"}`;
}

export default function EventsPage() {
  const { filters, queryArgs, dateError, activeCount, update, clearFilters } = useEventFilters();
  // "Show more" pages with the API's offset, so a ?offset in the URL isn't used here.
  const { q, category, location, from, to, limit } = queryArgs;
  const listQuery: EventPagesQuery = { q, category, location, from, to, limit };

  const {
    data,
    error,
    isLoading,
    isFetching,
    isError,
    isFetchNextPageError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useListEventPagesInfiniteQuery(listQuery, { skip: dateError !== null });
  const now = useNow(60_000);
  const chipsRef = useRef<HTMLDivElement>(null);

  // On phones the chips scroll sideways: keep the chosen one in view (e.g. ?category=BUSINESS on load).
  useEffect(() => {
    chipsRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [filters.category]);

  const events = loadedEvents(data?.pages);
  const total = data?.pages.at(-1)?.total ?? 0;
  const featured = pickFeatured(events, now);
  const { thisWeek, later } = groupByWeek(events, now, featured?.id);
  const refreshing = isFetching && !isLoading && !isFetchingNextPage;

  async function showMore() {
    const firstNew = events.length;
    const result = await fetchNextPage();
    const next: FairEvent | undefined = loadedEvents(result.data?.pages)[firstNew];
    // Wait a frame for React to draw the new rows.
    if (next) requestAnimationFrame(() => document.getElementById(`event-${next.id}`)?.focus());
  }

  function renderResults() {
    if (dateError) return null;

    if (isLoading) {
      return (
        <ul aria-label="Loading events" className="mt-8 divide-y divide-(--color-border)">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <DiscoverEventRowSkeleton />
            </li>
          ))}
        </ul>
      );
    }

    if (isError && !data) {
      const apiError = toApiError(error);
      const advice = apiError.isConnectionProblem
        ? "Check your connection and try again."
        : "Something went wrong on our side. Try again in a moment.";
      return (
        <ErrorState
          headingLevel="h2"
          className="mt-8"
          title="We couldn't load events"
          description={`${advice} Reference: ${apiError.requestId}`}
          retryLabel="Retry"
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      );
    }

    if (!data) return null;

    if (events.length === 0) {
      if (filters.category) {
        return (
          <EmptyState
            className="mt-8"
            title={`Nothing in ${CATEGORY_LABELS[filters.category]} yet`}
            description="New meetups are added often. Check back soon, or see what's on in every category."
            action={{ label: "Show all events", onClick: clearFilters }}
          />
        );
      }
      return activeCount > 0 ? (
        <EmptyState
          className="mt-8"
          title="No events match your search"
          description="Try another keyword, area or date."
          action={{ label: "Show all events", onClick: clearFilters }}
        />
      ) : (
        <EmptyState
          className="mt-8"
          title="No upcoming events yet"
          description="New meetups are added often. Check back soon."
        />
      );
    }

    return (
      <div className={cn("transition-opacity motion-reduce:transition-none", refreshing && "opacity-60")}>
        {featured && (
          <div className="mt-8">
            <FeaturedEvent event={featured} now={now} />
          </div>
        )}

        <EventGroup title="This week" events={thisWeek} now={now} />
        <EventGroup title="Later" events={later} now={now} />

        {isFetchNextPageError && (
          <ErrorState
            headingLevel="h2"
            className="mt-6"
            title="We couldn't load more events"
            description={`Check your connection and try again. Reference: ${toApiError(error).requestId}`}
            retryLabel="Retry"
            onRetry={() => void showMore()}
            retrying={isFetchingNextPage}
          />
        )}

        {hasNextPage && !isFetchNextPageError && (
          <div className="mt-10 flex justify-center">
            <Button
              variant="secondary"
              className="h-12 rounded-full px-6 text-base font-semibold"
              loading={isFetchingNextPage}
              onClick={() => void showMore()}
            >
              Show more events
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-8 md:pt-10">
      <h1 className="text-3xl font-bold tracking-tight md:text-5xl">What's on in Lagos</h1>
      <p className="mt-2 text-(--color-text-muted) md:text-lg">
        Free tech and networking meetups. A fair seat for everyone.
      </p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
        <div
          ref={chipsRef}
          role="group"
          aria-label="Category"
          // Phones: one row that scrolls sideways from the screen's left edge to the Date and area
          // button. From 768px: wraps.
          className="-ml-4 flex gap-2 overflow-x-auto py-1 pl-4 scrollbar-none sm:-ml-8 sm:pl-8 md:ml-0 md:flex-wrap md:overflow-visible md:pl-0"
        >
          <Chip pressed={!filters.category} onPressedChange={() => update({ category: "" })}>
            All
          </Chip>
          {CATEGORY_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              pressed={filters.category === option.value}
              onPressedChange={(on) => update({ category: on ? option.value : "" })}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        {/* contents: the button sits in the row's second column, the form spans the row below. */}
        <DateAreaFilter
          filters={filters}
          dateError={dateError}
          onApply={update}
          className="contents [&>form]:col-span-2"
        />
      </div>

      {/* Always rendered: a live region must exist before its text changes to be announced. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {data && !isFetching && !dateError ? countLabel(total) : ""}
      </p>

      <div aria-busy={isFetching}>{renderResults()}</div>
    </main>
  );
}

type EventGroupProps = {
  title: string;
  events: FairEvent[];
  now: number;
};

/** "This week" or "Later" with its count. Hidden when empty. Two columns from 1100px. */
function EventGroup({ title, events, now }: EventGroupProps) {
  if (events.length === 0) return null;
  const headingId = `group-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={headingId} className="mt-10">
      <div className="flex items-baseline justify-between gap-4 border-b border-(--color-border) pb-3">
        <h2 id={headingId} className="text-xl font-bold tracking-tight md:text-2xl">
          {title}
        </h2>
        <p className="text-sm text-(--color-text-muted)">{countLabel(events.length)}</p>
      </div>
      <ul className="grid min-[1100px]:grid-cols-2 min-[1100px]:gap-x-10">
        {events.map((event) => (
          <li key={event.id} className="min-w-0 border-b border-(--color-border)">
            <DiscoverEventRow event={event} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}
