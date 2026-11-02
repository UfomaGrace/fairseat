// QuickBook: the Book / Join the line control on the Discover page (list rows and the featured panel).
//
//   <QuickBook event={event} />                     // a row: "Book", or "Join the line" when full
//   <QuickBook event={event} appearance="featured" /> // the dark panel: a white "Book a seat"
//
// - Visitor → a link to /login with an in-app return state, so they come back here.
// - Organiser / admin → nothing: only attendees book seats.
// - Attendee with an active sign-up (GOING, WAITING, OFFERED) → its status badge instead of a button.
// - Attendee otherwise → POST /events/{eventId}/signups. The mutation invalidates "EventList", so
//   the list refetches either way; after a 409 it shows the true state and a toast says why.
// - Every button's accessible name includes the event title ("Book: Lagos Dev Breakfast"), since a
//   list has many of them.

import { Link, useLocation, useNavigate } from "react-router";
import { toApiError } from "../../api/client";
import type { FairEvent } from "../../api/types";
import { useAuth } from "../../auth/useAuth";
import { loginReturnState } from "../../auth/returnPath";
import { conflictMessage, SIGNUP_STATUS_TONES, signupStatusLabel } from "../../lib/labels";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/ui/status-badge";
import { useFairSeatToast } from "../../lib/useFairSeatToast";
import { bookedToast } from "../signups/bookedToast";
import { useCreateSignupMutation } from "../signups/signupsApi";
import { activeSignup } from "./discover";

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

const appearances = {
  /** Rows: 44px pill. Black for Book, outlined for Join the line. */
  row: {
    primary: "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)",
    secondary: "border border-(--color-border-input) bg-(--color-bg) text-(--color-text) hover:bg-(--color-surface)",
    size: "h-11 rounded-full px-5 text-sm font-semibold",
  },
  /** The dark panel: a white button. */
  featured: {
    primary: "bg-(--color-on-dark) text-(--color-text) hover:bg-(--color-surface)",
    secondary: "bg-(--color-on-dark) text-(--color-text) hover:bg-(--color-surface)",
    size: "h-12 rounded-full px-6 text-base font-semibold",
  },
} as const;

export type QuickBookProps = {
  event: FairEvent;
  appearance?: keyof typeof appearances;
  className?: string;
};

export function QuickBook({ event, appearance = "row", className }: QuickBookProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [createSignup, { isLoading }] = useCreateSignupMutation();
  const { toast } = useFairSeatToast();

  if (user && user.role !== "ATTENDEE") return null;

  // Visitors never see a sign-up badge, even if a response carries one (the Prism mock's example does).
  const signup = user ? activeSignup(event) : null;
  if (signup) {
    return (
      <StatusBadge
        tone={SIGNUP_STATUS_TONES[signup.status]}
        className={cn("rounded-full px-3 py-1 text-sm font-semibold", className)}
      >
        {signupStatusLabel(signup)}
      </StatusBadge>
    );
  }

  const full = event.seatsAvailable <= 0;
  const label = full ? "Join the line" : appearance === "featured" ? "Book a seat" : "Book";
  const style = appearances[appearance];
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap",
    style.size,
    full ? style.secondary : style.primary,
    className,
  );
  const name = (
    <>
      {label}
      <span className="sr-only">: {event.title}</span>
    </>
  );

  if (!user) {
    return (
      <Link
        to="/login"
        state={loginReturnState(`${location.pathname}${location.search}${location.hash}`)}
        className={cn(classes, "transition-colors", focusRing)}
      >
        {name}
      </Link>
    );
  }

  async function book() {
    try {
      toast(bookedToast(await createSignup(event.id).unwrap(), () => navigate("/me/events")));
    } catch (e) {
      const error = toApiError(e);
      toast(
        error.status === 409
          ? { variant: "info", title: event.title, description: conflictMessage(error.code) }
          : {
              variant: "error",
              title: "We couldn't book that seat",
              description: `${error.message} Reference: ${error.requestId}`,
            },
      );
    }
  }

  return (
    // Button's own size and variant classes are replaced by the pill styles above.
    <Button loading={isLoading} onClick={() => void book()} className={classes}>
      {name}
    </Button>
  );
}
