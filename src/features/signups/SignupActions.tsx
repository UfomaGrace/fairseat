// SignupActions: the booking box on the Event detail page.
//
//   <SignupActions event={event} />
//
// - The page only shows it while the event is bookable (scheduled and not started).
// - Visitor → "Sign in to book" (returns here after sign-in). Organiser / admin → a note:
//   only attendee accounts book seats.
// - Attendee, by event.mySignup.status:
//     none / CANCELLED  → "Book a seat", or "Join waitlist" when full
//     OFFER_EXPIRED     → says the offer lapsed, then the same Book / Join button
//     GOING             → "Cancel my seat" (asks first)
//     WAITING           → place in line, "Leave waitlist" (asks first)
//     OFFERED           → countdown and "Accept seat"; the event is polled every 30s meanwhile
// - Each button shows its spinner while its request runs, so it can't be sent twice.
// - Success → toast. Failure → alert under the buttons with "Reference: …". The mutations'
//   tags refetch the event either way, so after a 409 the page already shows the new state.
// - My events reuses CancelSeatButton, LeaveWaitlistButton and OfferedActions. Each page decides
//   what to poll: here the event, there the sign-up list.

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { toApiError, type ApiError } from "../../api/client";
import type { FairEvent, Signup } from "../../api/types";
import { useAuth } from "../../auth/useAuth";
import { FormAlert } from "../../components/form/FormAlert";
import { conflictMessage } from "../../lib/labels";
import { useNow } from "../../lib/useNow";
import { cn } from "../../shared/cn";
import { Button } from "../../shared/ui/button";
import { ConfirmDialog } from "../../shared/ui/dialog";
import { useToast, type ToastOptions } from "../../shared/ui/toast";
import { baseApi } from "../../store/baseApi";
import { useAppDispatch } from "../../store/hooks";
import { useGetEventQuery } from "../events/eventsApi";
import { OfferCountdown } from "./OfferCountdown";
import { useAcceptOfferMutation, useCancelSignupMutation, useCreateSignupMutation } from "./signupsApi";

const OFFER_POLL_MS = 30_000;

const linkButton = cn(
  "inline-flex h-12 w-full items-center justify-center rounded-md px-6 text-base font-medium",
  "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)",
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
);

/** What every action gets from its page: clear the old alert, or show a new one. */
export type ActionCallbacks = {
  onStart: () => void;
  onError: (e: unknown) => void;
};

export function SignupActions({ event }: { event: FairEvent }) {
  const { user } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<ApiError | null>(null);

  if (!user) {
    return (
      <Link to="/login" state={{ from: location }} className={linkButton}>
        Sign in to book
      </Link>
    );
  }

  if (user.role !== "ATTENDEE") {
    return <p className="text-sm text-(--color-text-muted)">Only attendee accounts can book seats.</p>;
  }

  const callbacks: ActionCallbacks = {
    onStart: () => setError(null),
    onError: (e) => setError(toApiError(e)),
  };
  const signup = event.mySignup ?? null;

  function renderActions() {
    if (!signup || signup.status === "CANCELLED") return <BookButton event={event} {...callbacks} />;

    switch (signup.status) {
      case "OFFER_EXPIRED":
        return (
          <>
            <p className="text-sm text-(--color-text)">
              Your seat offer expired and the seat went to the next person. You can still sign up again.
            </p>
            <BookButton event={event} {...callbacks} />
          </>
        );
      case "GOING":
        return (
          <>
            <p className="text-sm font-medium text-(--color-success)">You have a seat at this event.</p>
            <CancelSeatButton signup={signup} eventId={event.id} {...callbacks} />
          </>
        );
      case "WAITING":
        return (
          <>
            <p className="text-sm font-medium text-(--color-info)">
              {signup.waitingPosition
                ? `You're #${signup.waitingPosition} on the waitlist.`
                : "You're on the waitlist."}{" "}
              <span className="font-normal text-(--color-text-muted)">
                If a seat frees up, we'll hold it for you for a limited time.
              </span>
            </p>
            <LeaveWaitlistButton signup={signup} eventId={event.id} {...callbacks} />
          </>
        );
      case "OFFERED":
        return <EventOfferedActions signup={signup} eventId={event.id} {...callbacks} />;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {renderActions()}
      <FormAlert error={error} message={error?.status === 409 ? conflictMessage(error.code) : undefined} />
    </div>
  );
}

/** The toast after createSignup: the response says whether we got a seat or a waitlist place. */
function bookedToast(signup: Signup): ToastOptions {
  if (signup.status === "GOING") {
    return { variant: "success", title: "You're booked", description: "Your seat is saved." };
  }
  if (signup.status === "WAITING") {
    const place = signup.waitingPosition ? `You're #${signup.waitingPosition} in line. ` : "";
    return {
      variant: "info",
      title: "You're on the waitlist",
      description: `${place}The event was full, so we'll offer you a seat if one frees up.`,
    };
  }
  return { variant: "info", title: "We've updated your sign-up" };
}

function BookButton({ event, onStart, onError }: ActionCallbacks & { event: FairEvent }) {
  const [createSignup, { isLoading }] = useCreateSignupMutation();
  const { toast } = useToast();

  async function book() {
    onStart();
    try {
      toast(bookedToast(await createSignup(event.id).unwrap()));
    } catch (e) {
      onError(e);
    }
  }

  return (
    <Button size="lg" className="w-full" loading={isLoading} onClick={() => void book()}>
      {event.seatsAvailable > 0 ? "Book a seat" : "Join waitlist"}
    </Button>
  );
}

type CancelCopy = {
  label: string;
  keepLabel: string;
  title: string;
  description: string;
  doneTitle: string;
};

const CANCEL_SEAT_COPY: CancelCopy = {
  label: "Cancel my seat",
  keepLabel: "Keep my seat",
  title: "Cancel your seat?",
  description: "Your seat goes to the next person on the waitlist. To come back, you'd have to book again.",
  doneTitle: "Your seat is cancelled",
};

const LEAVE_WAITLIST_COPY: CancelCopy = {
  label: "Leave waitlist",
  keepLabel: "Stay on the waitlist",
  title: "Leave the waitlist?",
  description: "You'll lose your place in line. To come back, you'd join at the end.",
  doneTitle: "You've left the waitlist",
};

export type CancelButtonProps = ActionCallbacks & { signup: Signup; eventId: string };

export function CancelSeatButton(props: CancelButtonProps) {
  return <CancelSignupButton {...props} {...CANCEL_SEAT_COPY} />;
}

export function LeaveWaitlistButton(props: CancelButtonProps) {
  return <CancelSignupButton {...props} {...LEAVE_WAITLIST_COPY} />;
}

type CancelSignupButtonProps = CancelButtonProps & CancelCopy;

/** "Cancel my seat" or "Leave waitlist": both are cancelSignup, behind a ConfirmDialog. */
function CancelSignupButton({
  signup,
  eventId,
  label,
  keepLabel,
  title,
  description,
  doneTitle,
  onStart,
  onError,
}: CancelSignupButtonProps) {
  const [cancelSignup, { isLoading }] = useCancelSignupMutation();
  const { toast } = useToast();

  // Errors are caught here, not rethrown, so the dialog closes and the alert shows on the page.
  async function cancel() {
    onStart();
    try {
      await cancelSignup({ signupId: signup.id, eventId }).unwrap();
      toast({ variant: "success", title: doneTitle });
    } catch (e) {
      onError(e);
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" size="lg" className="w-full" loading={isLoading}>
          {label}
        </Button>
      }
      title={title}
      description={description}
      confirmLabel={label}
      cancelLabel={keepLabel}
      tone="danger"
      loading={isLoading}
      onConfirm={cancel}
    />
  );
}

type OfferedActionsProps = ActionCallbacks & { signup: Signup; eventId: string };

/** The Event detail page's offer: OfferedActions, plus polling the event while it shows. */
function EventOfferedActions(props: OfferedActionsProps) {
  // A second subscriber to the page's cached event, alive only while an offer shows.
  // RTK Query polls at the shortest interval any subscriber asks for, so the event (and
  // this offer's status) refreshes every 30s without a page reload.
  useGetEventQuery(props.eventId, { pollingInterval: OFFER_POLL_MS });
  return <OfferedActions {...props} />;
}

/** Countdown and "Accept seat". Polling is the page's job: it knows which query holds the offer. */
export function OfferedActions({ signup, eventId, onStart, onError }: OfferedActionsProps) {
  const [acceptOffer, { isLoading }] = useAcceptOfferMutation();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const now = useNow(1000);

  const expiresAt = signup.offerExpiresAt;
  const expired = expiresAt !== null && Date.parse(expiresAt) <= now;

  // When our clock passes the deadline, ask RTK Query to refetch once instead of waiting up to
  // 30s for the next poll. (This is a tag invalidation, not a hand-made fetch.) Both tags, so it
  // works on either page: only queries that are on screen refetch; the other tag costs nothing.
  useEffect(() => {
    if (expired) dispatch(baseApi.util.invalidateTags([{ type: "Event", id: eventId }, "MySignup"]));
  }, [expired, eventId, dispatch]);

  async function accept() {
    onStart();
    try {
      await acceptOffer({ signupId: signup.id, eventId }).unwrap();
      toast({ variant: "success", title: "Seat accepted", description: "You're going. See you there." });
    } catch (e) {
      onError(e);
    }
  }

  return (
    <>
      <p className="text-sm font-medium text-(--color-warning)">A seat has opened up and is held for you.</p>
      {expiresAt && <OfferCountdown expiresAt={expiresAt} now={now} />}
      <Button size="lg" className="w-full" disabled={expired} loading={isLoading} onClick={() => void accept()}>
        Accept seat
      </Button>
    </>
  );
}
