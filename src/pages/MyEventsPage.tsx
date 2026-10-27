// MyEventsPage: the attendee's sign-ups (GET /me/signups?scope=all), in sections.
//
// - Sections, in order: Action needed (open offers), Booked, Waitlisted, Past and cancelled.
//   Empty sections are hidden. A sign-up counts as past once its event has ended or been
//   cancelled, judged against the list's asOf (the server's clock, not the device's).
// - Upcoming sections are soonest first; Past and cancelled keeps the server's most-recent-first.
// - Polls every 30s only while an offer is open (PollWhileOffered, the Event detail pattern).
// - The endpoint has no limit/offset, so there is no paging.
// - A failed action shows one alert above the list, with the event's title and the 409 words
//   from lib/labels. The mutations refetch the list either way.

import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toApiError, type ApiError } from "../api/client";
import type { MySignupsQuery, Signup } from "../api/types";
import { FormAlert } from "../components/form/FormAlert";
import { MySignupItem } from "../features/signups/MySignupItem";
import { useListMySignupsQuery } from "../features/signups/signupsApi";
import { conflictMessage } from "../lib/labels";
import { cn } from "../shared/cn";
import { EmptyState } from "../shared/ui/empty-state";
import { ErrorState } from "../shared/ui/error-state";
import { Skeleton } from "../shared/ui/skeleton";

const OFFER_POLL_MS = 30_000;

// One query for every section; both subscribers below pass the same arg, so they share one cache entry.
const SIGNUPS_QUERY: MySignupsQuery = { scope: "all" };

type SectionKey = "action" | "booked" | "waitlisted" | "past";

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "action", title: "Action needed" },
  { key: "booked", title: "Booked" },
  { key: "waitlisted", title: "Waitlisted" },
  { key: "past", title: "Past and cancelled" },
];

const linkButton = cn(
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium",
  "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)",
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
);

function sectionOf(signup: Signup, asOf: number): SectionKey {
  const { event } = signup;
  if (event.status === "CANCELLED" || Date.parse(event.endsAt) <= asOf) return "past";
  switch (signup.status) {
    case "OFFERED":
      return "action";
    case "GOING":
      return "booked";
    case "WAITING":
      return "waitlisted";
    default:
      return "past";
  }
}

function groupSignups(items: Signup[], asOf: number): Record<SectionKey, Signup[]> {
  const groups: Record<SectionKey, Signup[]> = { action: [], booked: [], waitlisted: [], past: [] };
  for (const signup of items) groups[sectionOf(signup, asOf)].push(signup);
  const soonestFirst = (a: Signup, b: Signup) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt);
  groups.action.sort(soonestFirst);
  groups.booked.sort(soonestFirst);
  groups.waitlisted.sort(soonestFirst);
  return groups;
}

type ActionError = { error: ApiError; eventTitle: string };

export default function MyEventsPage() {
  const [actionError, setActionError] = useState<ActionError | null>(null);
  const { data, error, isLoading, isError, isFetching, refetch } = useListMySignupsQuery(SIGNUPS_QUERY);

  if (isLoading) {
    return (
      <Page busy>
        <p className="sr-only">Loading your events…</p>
        <div className="grid gap-4">
          <Skeleton lines={3} />
          <Skeleton lines={3} />
          <Skeleton lines={3} />
        </div>
      </Page>
    );
  }

  if (isError || !data) {
    const apiError = toApiError(error);
    const advice = apiError.isConnectionProblem
      ? "Check your connection and try again."
      : "Something went wrong on our side. Try again in a moment.";
    return (
      <Page>
        <ErrorState
          title="We couldn't load your events"
          description={`${advice} Reference: ${apiError.requestId}`}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </Page>
    );
  }

  if (data.items.length === 0) {
    return (
      <Page>
        <div className="flex flex-col items-center">
          <EmptyState
            title="You haven't booked any events yet"
            description="Find an event you like and book a seat. It will show up here."
          />
          <Link to="/events" className={linkButton}>
            Browse events
          </Link>
        </div>
      </Page>
    );
  }

  const asOf = Date.parse(data.asOf);
  const groups = groupSignups(data.items, asOf);

  return (
    <Page busy={isFetching}>
      {groups.action.length > 0 && <PollWhileOffered />}
      {actionError && (
        <FormAlert
          className="mb-6"
          error={actionError.error}
          title={actionError.eventTitle}
          message={actionError.error.status === 409 ? conflictMessage(actionError.error.code) : undefined}
        />
      )}
      <div className="grid gap-10">
        {SECTIONS.filter(({ key }) => groups[key].length > 0).map(({ key, title }) => (
          <section key={key} aria-labelledby={`section-${key}`}>
            <h2 id={`section-${key}`} className="text-xl font-semibold text-(--color-text)">
              {title} <span className="text-(--color-text-muted)">({groups[key].length})</span>
            </h2>
            <ul className="mt-4 grid gap-4">
              {groups[key].map((signup) => (
                <MySignupItem
                  key={signup.id}
                  signup={signup}
                  canChange={key !== "past" && Date.parse(signup.event.startsAt) > asOf}
                  onStart={() => setActionError(null)}
                  onError={(e) => setActionError({ error: toApiError(e), eventTitle: signup.event.title })}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}

/**
 * A second subscriber to the same list, rendered only while an offer is open. RTK Query polls
 * at the shortest interval any subscriber asks for, so the list refreshes every 30s; when the
 * offer is gone (accepted, expired, cancelled) this unmounts and the polling stops.
 */
function PollWhileOffered() {
  useListMySignupsQuery(SIGNUPS_QUERY, { pollingInterval: OFFER_POLL_MS });
  return null;
}

function Page({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <main aria-busy={busy} className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-(--color-text)">My events</h1>
      {children}
    </main>
  );
}
