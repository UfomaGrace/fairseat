// MySignupItem: one row on My events. Event title (links to the event), start time, status.
//
//   <MySignupItem signup={signup} canChange onStart={…} onError={…} />
//
// - canChange: the page says whether the event is still open (scheduled, not started). Only
//   then are the buttons shown, the same rule the Event detail page uses.
// - GOING → "Cancel my seat", WAITING → "Leave waitlist", OFFERED → countdown + "Accept seat".
//   These are the Event detail page's own components, so both pages ask and behave the same.
// - Errors go up to the page (onError): after a 409 the list refetches and the row may move to
//   another section, which remounts it, so an alert kept here would vanish.

import { Link } from "react-router";
import type { Signup } from "../../api/types";
import { formatDateTime } from "../../lib/format";
import { SIGNUP_STATUS_TONES, signupStatusLabel } from "../../lib/labels";
import { cn } from "../../shared/cn";
import { StatusBadge } from "../../shared/ui/status-badge";
import { CancelSeatButton, LeaveWaitlistButton, OfferedActions, type ActionCallbacks } from "./SignupActions";

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export type MySignupItemProps = ActionCallbacks & {
  signup: Signup;
  canChange: boolean;
};

export function MySignupItem({ signup, canChange, ...callbacks }: MySignupItemProps) {
  const { event } = signup;

  function renderActions() {
    if (!canChange) return null;
    switch (signup.status) {
      case "GOING":
        return <CancelSeatButton signup={signup} eventId={event.id} {...callbacks} />;
      case "WAITING":
        return <LeaveWaitlistButton signup={signup} eventId={event.id} {...callbacks} />;
      case "OFFERED":
        return <OfferedActions signup={signup} eventId={event.id} {...callbacks} />;
      default:
        return null;
    }
  }

  const actions = renderActions();

  return (
    <li className="rounded-lg border border-(--color-border) bg-(--color-surface) p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold wrap-break-word">
            <Link
              to={`/events/${encodeURIComponent(event.id)}`}
              className={cn("rounded-sm text-(--color-text) underline-offset-4 hover:underline", focusRing)}
            >
              {event.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            <time dateTime={event.startsAt}>{formatDateTime(event.startsAt)}</time>
            <span className="sr-only"> (Lagos time)</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone={SIGNUP_STATUS_TONES[signup.status]}>{signupStatusLabel(signup)}</StatusBadge>
            {event.status === "CANCELLED" && <StatusBadge tone="danger">Event cancelled</StatusBadge>}
          </div>
        </div>
        {actions && <div className="flex w-full shrink-0 flex-col gap-3 sm:w-72">{actions}</div>}
      </div>
    </li>
  );
}
