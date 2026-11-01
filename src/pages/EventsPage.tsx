// EventsPage: the public home page. An intro (what FairSeat is, how the waitlist works), then the
// list of upcoming events (GET /events) with filters and paging.
//
// - Filters and the page live in the URL (useEventFilters), so links and Back work.
//   Keyword and location apply on Search; category and dates apply as soon as they change.
// - isLoading: no data yet (first visit) → skeletons.
//   isFetching: a request is running, maybe with old data still on screen → dim the old results.
// - The query is skipped while a date is invalid; the date error says why.
// - "Explore meetups" and the pager move focus to the "Upcoming events" heading, so keyboard and
//   screen reader users start reading there.
// - "Create an event" is hidden for attendees (they can't create). Visitors are sent to sign in first.

import { ArrowRight } from "lucide-react";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import type { EventPage } from "../api/types";
import { toApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { UrlFilterSelect } from "../components/UrlFilterSelect";
import { EventCard } from "../features/events/EventCard";
import { useListEventsQuery } from "../features/events/eventsApi";
import { PAGE_SIZE, TEXT_MAX, useEventFilters, type EventFilters } from "../features/events/useEventFilters";
import { CATEGORY_OPTIONS } from "../lib/labels";
import { cn } from "../lib/cn";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { ErrorState } from "../components/ui/error-state";
import { FormField } from "../components/ui/form-field";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";

/** "Showing 21–40 of 45 events". */
function showingMessage(data: EventPage): string {
  if (data.items.length === 0) return "No events found";
  const first = data.offset + 1;
  const last = data.offset + data.items.length;
  return `Showing ${first}–${last} of ${data.total} ${data.total === 1 ? "event" : "events"}`;
}

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export default function EventsPage() {
  const { user } = useAuth();
  const { filters, queryArgs, dateError, activeCount, update, setOffset, clearFilters } = useEventFilters();
  const { data, error, isLoading, isFetching, isError, refetch } = useListEventsQuery(queryArgs, {
    skip: dateError !== null,
  });
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  function focusResults() {
    resultsHeadingRef.current?.focus();
  }

  function goToOffset(offset: number) {
    setOffset(offset);
    focusResults();
  }

  const refreshing = isFetching && !isLoading;
  const canCreate = !user || user.role !== "ATTENDEE";

  function renderResults() {
    if (dateError) return null;

    if (isLoading) {
      return (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-bg)">
              <div className="h-32 bg-(--color-bg)" />
              <div className="p-5">
                <Skeleton lines={4} />
              </div>
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
      // ?offset points past the end, e.g. an old link after events ended.
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
      return activeCount > 0 ? (
        <EmptyState
          headingLevel="h3"
          title="No events match these filters"
          description="Try a different keyword, category, location or dates."
          action={{ label: "Clear filters", onClick: clearFilters }}
        />
      ) : (
        <EmptyState
          headingLevel="h3"
          title="No upcoming events yet"
          description="New meetups are added often. Check back soon."
        />
      );
    }

    const hasPrevious = data.offset > 0;
    const hasNext = data.offset + data.items.length < data.total;
    const page = Math.floor(data.offset / PAGE_SIZE) + 1;
    const pageCount = Math.max(page, Math.ceil(data.total / PAGE_SIZE));

    return (
      <div className={cn("transition-opacity", refreshing && "opacity-60")}>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((event) => (
            <li key={event.id} className="min-w-0">
              <EventCard event={event} />
            </li>
          ))}
        </ul>

        {(hasPrevious || hasNext) && (
          <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="secondary"
              className="min-h-11 px-6 text-base"
              disabled={!hasPrevious}
              onClick={() => goToOffset(Math.max(0, data.offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <p className="text-(--color-text-muted)">
              Page {page} of {pageCount}
            </p>
            <Button
              variant="secondary"
              className="min-h-11 px-6 text-base"
              disabled={!hasNext}
              onClick={() => goToOffset(data.offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </nav>
        )}
      </div>
    );
  }

  return (
    <main>
      <Intro onExplore={focusResults} canCreate={canCreate} />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <section
          aria-labelledby="filters-heading"
          className="rounded-(--radius-card) border border-(--color-border) bg-(--color-bg) p-5 sm:p-6"
        >
          <h2 id="filters-heading" className="sr-only">
            Filters
          </h2>

          <FilterFields
            filters={filters}
            onSearch={(q, location) => update({ q, location })}
            category={
              <UrlFilterSelect label="Category" param="category" anyLabel="All categories" options={CATEGORY_OPTIONS} />
            }
            dates={
              <>
                <DateFilter
                  label="From"
                  value={filters.from}
                  max={dateError ? undefined : filters.to}
                  invalid={dateError?.field === "from"}
                  onChange={(from) => update({ from })}
                />
                <DateFilter
                  label="To"
                  value={filters.to}
                  min={dateError ? undefined : filters.from}
                  invalid={dateError?.field === "to"}
                  onChange={(to) => update({ to })}
                />
              </>
            }
            clear={
              activeCount > 0 && (
                <Button
                  variant="ghost"
                  className="min-h-11 px-2 underline underline-offset-4 hover:bg-transparent hover:decoration-2"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )
            }
          />

          {dateError && (
            <p id="date-error" role="alert" className="mt-3 text-sm font-medium text-(--color-danger)">
              <span aria-hidden="true">! </span>
              {dateError.message}
            </p>
          )}
        </section>

        <section aria-labelledby="results-heading" aria-busy={isFetching} className="mt-12">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              id="results-heading"
              ref={resultsHeadingRef}
              tabIndex={-1}
              className={cn(
                "scroll-mt-6 rounded-sm font-(family-name:--font-sans) text-3xl font-bold tracking-tight text-(--color-text) sm:text-4xl",
                focusRing,
              )}
            >
              Upcoming events
            </h2>
            {/* Always rendered: a live region must exist before its text changes to be announced. */}
            <p aria-live="polite" aria-atomic="true" className="text-(--color-text-muted)">
              {data && !isFetching && !isError && !dateError ? showingMessage(data) : ""}
            </p>
          </div>
          {renderResults()}
        </section>
      </div>
    </main>
  );
}

type IntroProps = {
  onExplore: () => void;
  canCreate: boolean;
};

/** The dark intro: heading and calls to action on the left, "How it works" on the right. Stacks on phones. */
function Intro({ onExplore, canCreate }: IntroProps) {
  return (
    <section aria-labelledby="intro-heading" className="bg-(--color-dark) text-(--color-on-dark)">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-(--color-on-dark-accent) uppercase">
            Free meetups across Lagos
          </p>
          <h1
            id="intro-heading"
            className="mt-5 font-(family-name:--font-sans) text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="block">Free meetups.</span>
            <span className="block">Fair seats.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg sm:text-xl">
            Find your next meetup, book your seat, and connect with people who share your interests.
          </p>
          <p className="mt-6 max-w-xl text-(--color-on-dark-muted) sm:text-lg">
            If an event is full, join the waitlist. When a seat opens up, the next person in line gets an offer with up
            to 24 hours to accept.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button
              className="min-h-14 bg-(--color-on-dark) px-7 text-base font-semibold text-(--color-text) hover:bg-(--color-surface)"
              onClick={onExplore}
            >
              Explore meetups
              <ArrowRight aria-hidden="true" className="size-5" />
            </Button>
            {canCreate && (
              <Link
                to="/organiser/events/new"
                className={cn(
                  "inline-flex min-h-14 items-center rounded-(--radius-md) border border-(--color-on-dark-muted) px-7 font-semibold",
                  "hover:bg-(--color-dark-panel)",
                  focusRing,
                )}
              >
                Create an event
              </Link>
            )}
          </div>
        </div>

        <HowItWorks />
      </div>
    </section>
  );
}

const SEAT_COUNT = 32;
/** Seats before this index are going, this one is offered, the rest are free. */
const OFFERED_SEAT = 23;

function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="min-w-0 rounded-(--radius-card) border border-(--color-dark-border) bg-(--color-dark-panel) p-6 sm:p-9"
    >
      <h2 id="how-heading" className="font-(family-name:--font-sans) text-2xl font-semibold sm:text-3xl">
        How it works
      </h2>
      <p className="mt-2 text-(--color-on-dark-muted) sm:text-lg">First come, first served. Nobody skips the line.</p>

      <div aria-hidden="true" className="mt-8 grid grid-cols-8 gap-2 sm:gap-3">
        {Array.from({ length: SEAT_COUNT }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-6 rounded-md sm:h-7",
              i < OFFERED_SEAT && "bg-(--color-seat-going)",
              i === OFFERED_SEAT && "bg-(--color-seat-offered)",
              i > OFFERED_SEAT && "border border-(--color-seat-free-border)",
            )}
          />
        ))}
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-(--color-on-dark-muted)">
        <LegendItem swatch="bg-(--color-seat-going)">Going</LegendItem>
        <LegendItem swatch="bg-(--color-seat-offered)">Offered (up to 24h to accept)</LegendItem>
        <LegendItem swatch="border border-(--color-seat-free-border)">Free</LegendItem>
      </ul>

      <ol className="mt-10 grid gap-6 sm:grid-cols-3">
        <Step number={1}>Sign up. If there's a seat, you're going.</Step>
        <Step number={2}>Full? Join the line in sign-up order.</Step>
        <Step number={3}>A seat frees up? The next person gets the offer.</Step>
      </ol>
    </section>
  );
}

function LegendItem({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cn("size-4 shrink-0 rounded-sm", swatch)} />
      {children}
    </li>
  );
}

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="sm:text-lg">
      {/* The <ol> already numbers the steps for screen readers. */}
      <span aria-hidden="true" className="block font-(family-name:--font-sans) text-3xl font-bold text-(--color-on-dark-accent)">
        {number}
      </span>
      <span className="mt-2 block">{children}</span>
    </li>
  );
}

type FilterFieldsProps = {
  filters: EventFilters;
  onSearch: (q: string, location: string) => void;
  /** The category select; sits between keyword and location. Applies on change, not on Search. */
  category: ReactNode;
  /** The From and To date inputs. Apply on change, not on Search. */
  dates: ReactNode;
  /** Shown after the Search button. */
  clear: ReactNode;
};

/**
 * The filter grid. Keyword and location are sent on submit so typing doesn't fire a request per key.
 * They join the form through the `form` attribute, so the fields can sit in design order
 * (keyword, category, location, dates) while Enter in a date or the category still doesn't submit.
 */
function FilterFields({ filters, onSearch, category, dates, clear }: FilterFieldsProps) {
  const formId = useId();
  const [q, setQ] = useState(filters.q);
  const [location, setLocation] = useState(filters.location);
  // When the URL changes from outside (Clear filters, Back), show its values again.
  const [shown, setShown] = useState({ q: filters.q, location: filters.location });
  if (shown.q !== filters.q || shown.location !== filters.location) {
    setShown({ q: filters.q, location: filters.location });
    setQ(filters.q);
    setLocation(filters.location);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(q.trim(), location.trim());
  }

  return (
    <>
      {/* No accessible name, so it isn't announced as an empty landmark. */}
      <form id={formId} onSubmit={handleSubmit} />
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
        <FormField label="Search events" className="sm:col-span-2">
          {(control) => (
            <Input
              {...control}
              form={formId}
              type="search"
              name="q"
              enterKeyHint="search"
              autoComplete="off"
              maxLength={TEXT_MAX}
              placeholder="Keyword, e.g. React"
              className="h-11 text-base"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          )}
        </FormField>
        {category}
        <FormField label="Location">
          {(control) => (
            <Input
              {...control}
              form={formId}
              name="location"
              autoComplete="off"
              maxLength={TEXT_MAX}
              placeholder="e.g. Yaba"
              className="h-11 text-base"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          )}
        </FormField>
        {dates}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          type="submit"
          form={formId}
          className="min-h-12 bg-(--color-text) px-6 text-base font-semibold hover:bg-(--color-primary-hover)"
        >
          Search
        </Button>
        {clear}
      </div>
    </>
  );
}

type DateFilterProps = {
  label: string;
  value: string;
  min?: string;
  max?: string;
  invalid: boolean;
  onChange: (value: string) => void;
};

function DateFilter({ label, value, min, max, invalid, onChange }: DateFilterProps) {
  return (
    <FormField label={label}>
      {(control) => (
        <Input
          {...control}
          type="date"
          className="h-11 text-base"
          value={value}
          min={min || undefined}
          max={max || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "date-error" : control["aria-describedby"]}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </FormField>
  );
}
