// CreateEventPage: a new event (POST /events), for organisers and admins.
//
// - EventForm does the fields, checks and error display; this page only sends the body.
// - Success → the new event's page with an "Event created" toast. createEvent invalidates
//   "EventList", so the organiser's list is fresh when they go back to it.

import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";
import type { EventCreate } from "../api/types";
import { EventForm } from "../features/events/EventForm";
import { useCreateEventMutation } from "../features/events/eventsApi";
import { cn } from "../shared/cn";
import { useToast } from "../shared/ui/toast";

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export default function CreateEventPage() {
  const [createEvent] = useCreateEventMutation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Throws on failure; EventForm shows the error.
  async function create(body: EventCreate) {
    const event = await createEvent(body).unwrap();
    toast({ variant: "success", title: "Event created" });
    navigate(`/events/${encodeURIComponent(event.id)}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <Link
        to="/organiser/events"
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-(--color-text-muted) hover:text-(--color-text)",
          focusRing,
        )}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to my events
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-(--color-text)">Create event</h1>
        <p className="mt-2 text-(--color-text-muted)">You'll be the organiser. Fields marked * are required.</p>
      </header>

      <EventForm mode="create" submitLabel="Create event" onSubmit={create} />
    </main>
  );
}
