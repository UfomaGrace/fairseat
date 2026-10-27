// EventsPage: the public list of upcoming events (GET /events), with filters and paging.
//
// - Filters and the page live in the URL (useEventFilters), so links and Back work.
//   Keyword and location apply on Search; category and dates apply as soon as they change.
// - isLoading: no data yet (first visit) → skeletons.
//   isFetching: a request is running, maybe with old data still on screen → dim the old results.
// - The query is skipped while a date is invalid; the date error says why.

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { EventPage } from "../api/types";
import { toApiError } from "../api/client";
import { UrlFilterSelect } from "../components/UrlFilterSelect";
import { EventCard } from "../features/events/EventCard";
import { useListEventsQuery } from "../features/events/eventsApi";
import { PAGE_SIZE, TEXT_MAX, useEventFilters, type EventFilters } from "../features/events/useEventFilters";
import { CATEGORY_OPTIONS } from "../lib/labels";
import { cn } from "../shared/cn";
import { Button } from "../shared/ui/button";
import { EmptyState } from "../shared/ui/empty-state";
import { ErrorState } from "../shared/ui/error-state";
import { FormField } from "../shared/ui/form-field";
import { Input } from "../shared/ui/input";
import { Skeleton } from "../shared/ui/skeleton";

/** "Showing 21–40 of 45 events". */
function showingMessage(data: EventPage): string {
  if (data.items.length === 0) return "No events found";
  const first = data.offset + 1;
  const last = data.offset + data.items.length;
  return `Showing ${first}–${last} of ${data.total} ${data.total === 1 ? "event" : "events"}`;
}

export default function EventsPage() {
  const { filters, queryArgs, dateError, activeCount, update, setOffset, clearFilters } = useEventFilters();
  const { data, error, isLoading, isFetching, isError, refetch } = useListEventsQuery(queryArgs, {
    skip: dateError !== null,
  });
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

  // Move to the top of the new page, so keyboard and screen reader users start reading there.
  function goToOffset(offset: number) {
    setOffset(offset);
    resultsHeadingRef.current?.focus();
  }

  const refreshing = isFetching && !isLoading;

  function renderResults() {
    if (dateError) return null;

    if (isLoading) {
      return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
              <Skeleton lines={4} />
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

    return (
      <div className={cn("transition-opacity", refreshing && "opacity-60")}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((event) => (
            <li key={event.id} className="min-w-0">
              <EventCard event={event} />
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
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-(--color-text)">Events</h1>
        <p className="mt-2 text-(--color-text-muted)">Find a meetup in Lagos and save your seat.</p>
      </header>

      <section aria-labelledby="filters-heading" className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4">
        <h2 id="filters-heading" className="sr-only">
          Filters
        </h2>

        <SearchForm filters={filters} onSearch={(q, location) => update({ q, location })} />

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <UrlFilterSelect label="Category" param="category" anyLabel="All" options={CATEGORY_OPTIONS} />
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
        </div>

        {dateError && (
          <p id="date-error" role="alert" className="mt-2 text-sm font-medium text-(--color-danger)">
            <span aria-hidden="true">! </span>
            {dateError.message}
          </p>
        )}

        <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {/* Always rendered: a live region must exist before its text changes to be announced. */}
          <p aria-live="polite" aria-atomic="true" className="text-sm text-(--color-text-muted)">
            {data && !isFetching && !isError && !dateError ? showingMessage(data) : ""}
          </p>
          {activeCount > 0 && (
            <Button variant="ghost" className="min-h-11" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </section>

      <section aria-labelledby="results-heading" aria-busy={isFetching} className="mt-8">
        <h2
          id="results-heading"
          ref={resultsHeadingRef}
          tabIndex={-1}
          className="mb-4 rounded-sm text-xl font-semibold text-(--color-text) focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)]"
        >
          Upcoming events
        </h2>
        {renderResults()}
      </section>
    </main>
  );
}

type SearchFormProps = {
  filters: EventFilters;
  onSearch: (q: string, location: string) => void;
};

/** Keyword and location, sent on submit so typing doesn't fire a request per key. */
function SearchForm({ filters, onSearch }: SearchFormProps) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <FormField label="Keyword" className="sm:flex-[2]">
        {(control) => (
          <Input
            {...control}
            type="search"
            name="q"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={TEXT_MAX}
            placeholder="e.g. React, design, careers"
            className="h-11"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        )}
      </FormField>
      <FormField label="Location" className="sm:flex-1">
        {(control) => (
          <Input
            {...control}
            name="location"
            autoComplete="off"
            maxLength={TEXT_MAX}
            placeholder="e.g. Yaba"
            className="h-11"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        )}
      </FormField>
      <Button type="submit" className="min-h-11">
        Search
      </Button>
    </form>
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
          className="h-11"
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
