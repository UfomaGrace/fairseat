// NoticesPage: the attendee's in-platform notices (GET /me/notices).
//
// - Newest first. The contract already promises that order; sorting by createdAt again is cheap
//   and keeps the page right if a mock or a future version doesn't.
// - The endpoint has no limit/offset (it returns at most 50), so there is no paging.
// - No read/unread state: the contract has no endpoint for it.
// - Read-only page, so there are no 409s here; the sign-up actions live on My events.

import type { ReactNode } from "react";
import { toApiError } from "../api/client";
import type { Notice } from "../api/types";
import { NoticeItem } from "../features/notices/NoticeItem";
import { useListMyNoticesQuery } from "../features/notices/noticesApi";
import { EmptyState } from "../shared/ui/empty-state";
import { ErrorState } from "../shared/ui/error-state";
import { Skeleton } from "../shared/ui/skeleton";

const newestFirst = (a: Notice, b: Notice) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

export default function NoticesPage() {
  const { data, error, isLoading, isError, isFetching, refetch } = useListMyNoticesQuery();

  if (isLoading) {
    return (
      <Page busy>
        <p className="sr-only">Loading your notices…</p>
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
          title="We couldn't load your notices"
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
        <EmptyState
          title="No notices yet"
          description="We'll let you know here when a seat opens up for you or an event you signed up for changes."
        />
      </Page>
    );
  }

  return (
    <Page busy={isFetching}>
      <ol className="grid gap-4">
        {[...data.items].sort(newestFirst).map((notice) => (
          <NoticeItem key={notice.id} notice={notice} />
        ))}
      </ol>
    </Page>
  );
}

function Page({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <main aria-busy={busy} className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight text-(--color-text)">Notices</h1>
      <p className="mt-2 mb-6 text-(--color-text-muted)">Your latest notices, newest first. Times are Lagos time.</p>
      {children}
    </main>
  );
}
