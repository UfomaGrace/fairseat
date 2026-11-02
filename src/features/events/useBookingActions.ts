// useBookingActions: every action on the Event detail page, in one place, so the booking panel,
// the phone bar and the phone sheet share one loading state.
//
//   const actions = useBookingActions(event);
//   <Button loading={actions.booking} onClick={actions.book}>Book a seat</Button>
//
// - book          POST /events/{id}/signups        (Book a seat / Join the line / Join the line again)
// - accept        POST /signups/{id}/acceptance
// - cancelSignup  POST /signups/{id}/cancellation  (Give up my seat / Leave the line / Decline)
// - cancelEvent   POST /events/{id}/cancellation   (organiser)
// - Each mutation writes the server's answer into the cached event, then its tags refetch the
//   event (also after a failure), so the panel always ends on what the server decided.
// - 409 (OFFER_EXPIRED, NO_ACTIVE_OFFER, EVENT_STARTED, EVENT_CANCELLED): a toast with the server's
//   message. Anything else: an error toast with "Reference: <requestId>".
// - The functions never throw, so a ConfirmDialog closes after them and the toast says what happened.

import { toApiError } from "../../api/client";
import { useNavigate } from "react-router";
import type { FairEvent, Signup } from "../../api/types";
import type { ToastOptions } from "../../components/ui/toast";
import { useFairSeatToast } from "../../lib/useFairSeatToast";
import { LATEST_DETAILS_LOADED } from "../../lib/labels";
import { bookedToast } from "../signups/bookedToast";
import { useAcceptOfferMutation, useCancelSignupMutation, useCreateSignupMutation } from "../signups/signupsApi";
import { useCancelEventMutation } from "./eventsApi";

export type BookingActions = {
  book: (onResult?: (succeeded: boolean) => void) => Promise<void>;
  accept: (signup: Signup, onResult?: (succeeded: boolean) => void) => Promise<void>;
  cancelSignup: (signup: Signup, doneTitle: string, onResult?: (succeeded: boolean) => void) => Promise<void>;
  cancelEvent: () => Promise<void>;
  booking: boolean;
  accepting: boolean;
  cancellingSignup: boolean;
  cancellingEvent: boolean;
};

export function failureToast(e: unknown): ToastOptions {
  const error = toApiError(e);
  if (error.status === 409) {
    return { variant: "error", title: LATEST_DETAILS_LOADED, description: error.message };
  }
  return {
    variant: "error",
    title: "That didn't go through",
    description: `${error.message} Reference: ${error.requestId}`,
  };
}

export function useBookingActions(event: Pick<FairEvent, "id">): BookingActions {
  const { toast } = useFairSeatToast();
  const navigate = useNavigate();
  const [createSignup, { isLoading: booking }] = useCreateSignupMutation();
  const [acceptOffer, { isLoading: accepting }] = useAcceptOfferMutation();
  const [cancelSignupMutation, { isLoading: cancellingSignup }] = useCancelSignupMutation();
  const [cancelEventMutation, { isLoading: cancellingEvent }] = useCancelEventMutation();

  async function run(action: () => Promise<ToastOptions>, onResult?: (succeeded: boolean) => void) {
    try {
      toast(await action());
      onResult?.(true);
    } catch (e) {
      toast(failureToast(e));
      onResult?.(false);
    }
  }

  return {
    book: (onResult) =>
      run(async () => bookedToast(await createSignup(event.id).unwrap(), () => navigate("/me/events")), onResult),
    accept: (signup, onResult) =>
      run(async () => {
        await acceptOffer({ signupId: signup.id, eventId: event.id }).unwrap();
        return { variant: "success", title: "Seat accepted", description: "You're going. See you there." };
      }, onResult),
    cancelSignup: (signup, doneTitle, onResult) =>
      run(async () => {
        await cancelSignupMutation({ signupId: signup.id, eventId: event.id }).unwrap();
        return { variant: "success", title: doneTitle };
      }, onResult),
    cancelEvent: () =>
      run(async () => {
        await cancelEventMutation(event.id).unwrap();
        return {
          variant: "success",
          title: "Event cancelled",
          description: "Everyone who booked or joined the line has been told.",
        };
      }),
    booking,
    accepting,
    cancellingSignup,
    cancellingEvent,
  };
}
