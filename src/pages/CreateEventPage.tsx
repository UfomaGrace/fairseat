import { Link, useNavigate } from "react-router";
import type { EventCreate } from "../api/types";
import { toApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { EventForm } from "../features/events/EventForm";
import { useCreateEventMutation } from "../features/events/eventsApi";
import { cn } from "../lib/cn";
import { useToast } from "../components/ui/toast";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

export default function CreateEventPage() {
  const [createEvent] = useCreateEventMutation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  async function create(body: EventCreate) {
    try {
      const event = await createEvent(body).unwrap();
      toast({ variant: "success", title: "Event published" });
      navigate(`/events/${encodeURIComponent(event.id)}`);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === "NOT_EVENT_OWNER" || apiError.code === "FORBIDDEN_ROLE") {
        toast({ variant: "error", title: apiError.message });
        navigate("/organiser/events");
        return;
      }
      throw apiError;
    }
  }

  return (
    <main className="min-h-full bg-(--color-surface)">
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-(--color-text-muted)">
          <Link to="/organiser/events" className={cn("rounded-sm hover:text-(--color-text)", focusRing)}>
            Your events
          </Link>
          <span aria-hidden="true" className="mx-2">/</span>
          <span aria-current="page" className="text-(--color-text)">New event</span>
        </nav>

        <header className="mb-7 mt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-(--color-text)">Create an event</h1>
          <p className="mt-2 text-(--color-text-muted)">Free to host. Takes about two minutes.</p>
        </header>

        <EventForm
          mode="create"
          organiser={user}
          cancelPath="/organiser/events"
          submitLabel="Publish event"
          onSubmit={create}
        />
      </div>
    </main>
  );
}
