// EditEventPage: change an event (PATCH /events/{eventId}) or cancel it (POST …/cancellation).
//
// - getEvent fills the form. Only the event's organiser or an admin can edit, and only before
//   it starts; a cancelled, started or ended event shows why, with a link back. useNow(30s)
//   lets the page notice the start time passing while it is open.
// - EventForm sends only the changed fields. Success → the event's page with "Changes saved".
// - 409 SEATS_BELOW_TAKEN → wait for the refetched event, then "X seats are already taken"
//   on the seats field. Other 409s → the top alert, in words from lib/labels. updateEvent's
//   tags refetch the event after any result, so the page then shows the true state.
// - Cancel event sits in its own danger section, behind a ConfirmDialog. The yaml gives
//   cancelEvent no request body, so there is no reason to send.

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError, toApiError } from "../api/client";
import type { FairEvent, User } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { FormAlert } from "../components/form/FormAlert";
import { EventForm, type EventFormProps } from "../features/events/EventForm";
import { useCancelEventMutation, useGetEventQuery, useUpdateEventMutation } from "../features/events/eventsApi";
import { EVENT_EDIT_CONFLICT_MESSAGES, eventEditConflictMessage, seatsTakenMessage } from "../lib/labels";
import { useNow } from "../lib/useNow";
import { cn } from "../shared/cn";
import { Button } from "../shared/ui/button";
import { ConfirmDialog } from "../shared/ui/dialog";
import { ErrorState } from "../shared/ui/error-state";
import { Skeleton } from "../shared/ui/skeleton";
import { useToast } from "../shared/ui/toast";

const START_CHECK_MS = 30_000;

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

const backLinkClass = cn(
  "inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-(--color-text-muted) hover:text-(--color-text)",
  focusRing,
);

const linkButton = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
  "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)",
  focusRing,
);

const eventPath = (eventId: string) => `/events/${encodeURIComponent(eventId)}`;

/** Why this user can't edit this event right now, or null when they can. */
function whyNotEditable(user: User | null, event: FairEvent, now: number): string | null {
  if (!user || (user.role !== "ADMIN" && user.id !== event.organiser.id)) {
    return "Only this event's organiser or an admin can edit it.";
  }
  if (event.status === "CANCELLED") return EVENT_EDIT_CONFLICT_MESSAGES.EVENT_CANCELLED;
  if (Date.parse(event.endsAt) <= now) return "This event has ended, so it can't be edited.";
  if (Date.parse(event.startsAt) <= now) return EVENT_EDIT_CONFLICT_MESSAGES.EVENT_STARTED;
  return null;
}

/** Other 409s get the organiser's words; everything else keeps the service's message. */
function editErrorMessage(error: ApiError): string | undefined {
  return error.status === 409 ? eventEditConflictMessage(error.code) : undefined;
}

export default function EditEventPage() {
  const { eventId = "" } = useParams();
  const { user } = useAuth();
  const now = useNow(START_CHECK_MS);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updateEvent] = useUpdateEventMutation();
  const { data: event, error, isLoading, isError, isFetching, refetch } = useGetEventQuery(eventId, {
    skip: !eventId,
  });

  if (isLoading) {
    return (
      <main aria-busy="true" className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <p className="sr-only">Loading event…</p>
        <Skeleton lines={2} className="max-w-md" />
        <Skeleton lines={8} className="mt-8" />
      </main>
    );
  }

  if (isError || !event) {
    const apiError = toApiError(error);
    if (!eventId || apiError.status === 404) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
          <h1 className="text-2xl font-bold text-(--color-text)">Event not found</h1>
          <p className="mt-3 text-(--color-text-muted)">
            This event may have been removed, or the link may be wrong.
          </p>
          <Link to="/organiser/events" className={cn(linkButton, "mt-6")}>
            Back to my events
          </Link>
        </main>
      );
    }
    const advice = apiError.isConnectionProblem
      ? "Check your connection and try again."
      : "Something went wrong on our side. Try again in a moment.";
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <h1 className="sr-only">Edit event</h1>
        <ErrorState
          title="We couldn't load this event"
          description={`${advice} Reference: ${apiError.requestId}`}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </main>
    );
  }

  const blocked = whyNotEditable(user, event, now);

  if (blocked) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-8">
        <h1 className="text-2xl font-bold text-(--color-text)">You can't edit this event</h1>
        <p className="mt-3 text-(--color-text-muted)">{blocked}</p>
        <Link to={eventPath(event.id)} className={cn(linkButton, "mt-6")}>
          Back to the event
        </Link>
      </main>
    );
  }

  const save: Extract<EventFormProps, { mode: "edit" }>["onSubmit"] = async (changes, helpers) => {
    try {
      await updateEvent({ eventId: event.id, body: changes }).unwrap();
    } catch (e) {
      const apiError = toApiError(e);
      if (apiError.code !== "SEATS_BELOW_TAKEN") throw apiError;
      // The tags are already refetching the event; wait for it so the count is current.
      const latest = await refetch();
      helpers.setFieldError("seats", seatsTakenMessage(latest.data?.seatsTaken ?? event.seatsTaken));
      return;
    }
    toast({ variant: "success", title: "Changes saved" });
    navigate(eventPath(event.id));
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <Link to={eventPath(event.id)} className={backLinkClass}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to the event
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight wrap-break-word text-(--color-text)">Edit event</h1>
        <p className="mt-2 wrap-break-word text-(--color-text-muted)">
          {event.title}. Everyone signed up or waiting gets a notice when you save.
        </p>
      </header>

      {/* key: a different event (same page, new URL) starts a fresh form. */}
      <EventForm
        key={event.id}
        mode="edit"
        event={event}
        submitLabel="Save changes"
        errorMessage={editErrorMessage}
        onSubmit={save}
      />

      <CancelEventSection eventId={event.id} />
    </main>
  );
}

function CancelEventSection({ eventId }: { eventId: string }) {
  const [cancelEvent] = useCancelEventMutation();
  const [error, setError] = useState<ApiError | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  async function confirmCancel() {
    try {
      await cancelEvent(eventId).unwrap();
    } catch (e) {
      setError(toApiError(e));
      throw e; // keeps the dialog open so the error shows inside it
    }
    toast({ variant: "success", title: "Event cancelled" });
    navigate("/organiser/events");
  }

  return (
    <section
      aria-labelledby="cancel-heading"
      className="mt-12 rounded-lg border border-(--color-danger) bg-(--color-surface) p-5"
    >
      <h2 id="cancel-heading" className="text-lg font-semibold text-(--color-danger)">
        Cancel this event
      </h2>
      <p className="mt-2 text-sm text-(--color-text)">
        Everyone with a seat, a seat offer or a waitlist place loses it and gets a notice. You can't undo this.
      </p>
      <ConfirmDialog
        trigger={
          <Button variant="danger" className="mt-4 min-h-11">
            Cancel event
          </Button>
        }
        title="Cancel this event?"
        description="Everyone signed up or waiting loses their place and gets a notice. You can't undo this."
        confirmLabel="Cancel event"
        cancelLabel="Keep event"
        tone="danger"
        onOpenChange={(open) => {
          if (open) setError(null);
        }}
        onConfirm={confirmCancel}
      >
        <FormAlert error={error} />
      </ConfirmDialog>
    </section>
  );
}
