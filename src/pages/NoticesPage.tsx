import { Bell } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toApiError } from "../api/client";
import type { Notice, Signup } from "../api/types";
import { EmptyState } from "../components/ui/empty-state";
import { ErrorState } from "../components/ui/error-state";
import { Skeleton } from "../components/ui/skeleton";
import { NoticeCard } from "../features/notices/NoticeCard";
import { matchSignupForNotice } from "../features/notices/noticeText";
import { useListMyNoticesQuery } from "../features/notices/noticesApi";
import { getNoticesSeenAt, markNoticesSeen } from "../features/notices/noticesSeen";
import { useListMySignupsQuery } from "../features/signups/signupsApi";
import { useAuth } from "../auth/useAuth";

export default function NoticesPage() {
  const noticesQuery = useListMyNoticesQuery();
  const signupsQuery = useListMySignupsQuery({ scope: "all" });
  const { user } = useAuth();
  const userId = user?.id;
  const [seenAtWhenOpened, setSeenAtWhenOpened] = useState(() => (user ? getNoticesSeenAt(user.id) : 0));
  const seenUserId = useRef(user?.id ?? null);

  useEffect(() => {
    if (userId && noticesQuery.data) markNoticesSeen(userId, noticesQuery.data.items);
  }, [userId, noticesQuery.data]);

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (seenUserId.current !== nextUserId) {
      seenUserId.current = nextUserId;
      setSeenAtWhenOpened(nextUserId ? getNoticesSeenAt(nextUserId) : 0);
    }
  }, [user?.id]);

  if (noticesQuery.isLoading || signupsQuery.isLoading) {
    return (
      <Page busy>
        <p className="sr-only">Loading your notices…</p>
        <div className="mt-8 grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} aria-hidden="true" className="rounded-(--radius-notice) border border-(--color-border) bg-(--color-bg) p-5">
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      </Page>
    );
  }

  if (
    (noticesQuery.isError && !noticesQuery.data) ||
    (signupsQuery.isError && !signupsQuery.data) ||
    !noticesQuery.data ||
    !signupsQuery.data
  ) {
    const apiError = toApiError(noticesQuery.error ?? signupsQuery.error);
    const advice = apiError.isConnectionProblem
      ? "Check your connection and try again."
      : "Something went wrong on our side. Try again in a moment.";
    return (
      <Page>
        <ErrorState
          title="We couldn't load your notices"
          description={`${advice} Reference: ${apiError.requestId}`}
          retryLabel="Retry"
          onRetry={() => {
            void Promise.all([noticesQuery.refetch(), signupsQuery.refetch()]);
          }}
          retrying={noticesQuery.isFetching || signupsQuery.isFetching}
        />
      </Page>
    );
  }

  const notices = [...noticesQuery.data.items].sort(
    (first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt),
  );
  const newNotices = notices.filter((notice) => Date.parse(notice.createdAt) > seenAtWhenOpened);
  const earlierNotices = notices.filter((notice) => Date.parse(notice.createdAt) <= seenAtWhenOpened);

  if (notices.length === 0) {
    return (
      <Page busy={noticesQuery.isFetching || signupsQuery.isFetching}>
        <section className="mt-8 rounded-(--radius-notice) border border-(--color-border) bg-(--color-bg)">
          <EmptyState
            icon={<Bell className="size-8" />}
            title="You're all caught up"
            description="When a seat opens up for you, or an event you're in changes, you'll hear about it here."
          />
          <div className="-mt-6 flex justify-center pb-10">
            <Link
              to="/me/events"
              className="inline-flex min-h-11 items-center justify-center rounded-(--radius-md) bg-(--color-primary) px-5 text-sm font-semibold text-(--color-on-primary) hover:bg-(--color-primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
            >
              Go to My events
            </Link>
          </div>
        </section>
      </Page>
    );
  }

  return (
    <Page busy={noticesQuery.isFetching || signupsQuery.isFetching}>
      <div className="mt-8 space-y-8">
        {newNotices.length > 0 && (
          <NoticeGroup title="New" notices={newNotices} signups={signupsQuery.data.items} />
        )}
        {earlierNotices.length > 0 && (
          <NoticeGroup title="Earlier" notices={earlierNotices} signups={signupsQuery.data.items} earlier />
        )}
      </div>
      <p className="mt-8 text-sm text-(--color-text-muted)">Showing your 50 most recent notices.</p>
    </Page>
  );
}

function NoticeGroup({
  title,
  notices,
  signups,
  earlier = false,
}: {
  title: string;
  notices: Notice[];
  signups: Signup[];
  earlier?: boolean;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-(--color-text)">{title}</h2>
      <ol className={earlier ? "overflow-hidden rounded-(--radius-notice) bg-(--color-bg)" : "grid gap-4"}>
        {notices.map((notice, index) => (
          <NoticeCard
            key={notice.id}
            notice={notice}
            signup={matchSignupForNotice(notice.eventId, signups)}
            earlier={earlier}
            first={index === 0}
          />
        ))}
      </ol>
    </section>
  );
}

function Page({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <main aria-busy={busy} className="min-h-full flex-1 bg-(--color-surface)">
      <div className="mx-auto max-w-[760px] px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-3xl font-bold tracking-tight text-(--color-text)">Notices</h1>
        <p className="mt-2 text-(--color-text-muted)">What changed, and anything that needs your answer.</p>
        {children}
      </div>
    </main>
  );
}
