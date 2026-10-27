// NoticeItem: one notice. Kind as a badge, the message, when it was sent (Lagos time), and a
// link to its event.
//
//   <NoticeItem notice={notice} />
//
// - eventId is required by the contract, so every notice links to its event.
// - The link text is the same on every row, so aria-describedby adds the message for screen
//   readers that list links out of context.
// - No read/unread state: the contract has no endpoint to mark a notice read.

import { useId } from "react";
import { Link } from "react-router";
import type { Notice } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import { NOTICE_KIND_LABELS, NOTICE_KIND_TONES } from "../../lib/labels";
import { cn } from "../../shared/cn";
import { StatusBadge } from "../../shared/ui/status-badge";

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export function NoticeItem({ notice }: { notice: Notice }) {
  const messageId = useId();

  return (
    <li className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge tone={NOTICE_KIND_TONES[notice.kind]}>{NOTICE_KIND_LABELS[notice.kind]}</StatusBadge>
        <time dateTime={notice.createdAt} className="text-sm text-(--color-text-muted)">
          {formatDateTime(notice.createdAt)}
        </time>
      </div>
      <p id={messageId} className="mt-2 wrap-break-word text-(--color-text)">
        {notice.message}
      </p>
      <Link
        to={`/events/${encodeURIComponent(notice.eventId)}`}
        aria-describedby={messageId}
        className={cn(
          "mt-1 inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-(--color-primary) underline-offset-4 hover:underline",
          focusRing,
        )}
      >
        View event
      </Link>
    </li>
  );
}
