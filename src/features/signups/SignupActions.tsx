// SignupActions: the sign-up buttons on My events (MySignupItem).
//
// - GiveUpSeatButton / LeaveLineButton / DeclineOfferButton: cancelSignup, each behind a
//   ConfirmDialog, worded as on the Event detail page (cancelCopy).
// - OfferedActions: countdown and "Accept seat". Polling is the page's job: it knows which query
//   holds the offer.
// - Each button shows its spinner while its request runs, so it can't be sent twice.
// - Success → toast. Failure → the page's alert with "Reference: …". The mutations' tags refetch
//   either way, so after a 409 the page already shows the new state.
// - The Event detail page has its own panel (features/events/BookingPanel).

import { useEffect } from "react";
import type { Signup } from "../../api/types";
import { useNow } from "../../lib/useNow";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/dialog";
import { useToast } from "../../components/ui/toast";
import { baseApi } from "../../store/baseApi";
import { useAppDispatch } from "../../store/hooks";
import { DECLINE_COPY, GIVE_UP_COPY, LEAVE_LINE_COPY, type CancelCopy } from "./cancelCopy";
import { OfferCountdown } from "./OfferCountdown";
import { useAcceptOfferMutation, useCancelSignupMutation } from "./signupsApi";

/** What every action gets from its page: clear the old alert, or show a new one. */
export type ActionCallbacks = {
  onStart: () => void;
  onError: (e: unknown) => void;
};

export type CancelButtonProps = ActionCallbacks & { signup: Signup; eventId: string };

export function GiveUpSeatButton(props: CancelButtonProps) {
  return <CancelSignupButton {...props} {...GIVE_UP_COPY} />;
}

export function LeaveLineButton(props: CancelButtonProps) {
  return <CancelSignupButton {...props} {...LEAVE_LINE_COPY} />;
}

export function DeclineOfferButton(props: CancelButtonProps) {
  return <CancelSignupButton {...props} {...DECLINE_COPY} />;
}

type CancelSignupButtonProps = CancelButtonProps & CancelCopy;

/** Give up, Leave the line or Decline: all three are cancelSignup, behind a ConfirmDialog. */
function CancelSignupButton({
  signup,
  eventId,
  label,
  confirmLabel,
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
      confirmLabel={confirmLabel}
      cancelLabel={keepLabel}
      tone="danger"
      loading={isLoading}
      onConfirm={cancel}
    />
  );
}

type OfferedActionsProps = ActionCallbacks & { signup: Signup; eventId: string };

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
