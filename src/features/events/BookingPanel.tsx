// BookingPanel: the Event detail page's booking box, one state at a time (bookingState).
//
//   <BookingPanel event={event} state={state} actions={actions} now={now} />   // ≥768px, sticky
//   <BookingBar … onOpenDetails={() => setSheetOpen(true)} />                  // <768px, fixed bottom
//   <BookingSheet open={sheetOpen} onOpenChange={setSheetOpen} … />            // <768px, the full panel
//
// States (the design's "Booking panel · All states"):
//   free / low / full   seats left, the room, Book a seat or Join the line
//   going               You're going, Give up my seat
//   waiting             You're #N in line, the line as a row of people, Leave the line
//   offer               copper banner, time left to accept (whole minutes), Accept seat, Decline
//   expired             your offer expired, Join the line again
//   organiser           You're hosting, Going / Offered / In line, Edit event, Cancel event
//   viewer              another organiser or an admin: the seats, and a note that only attendees book
//   started / cancelled booking is closed
// - Signed out, Book / Join are links to /login?returnTo=<this page>.
// - Give up, Leave, Decline and Cancel event can't be undone, so each asks first (ConfirmDialog).
// - Copper text on the copper wash is --color-copper-deep (small text needs 6.0:1, see tokens.css).

import { CircleAlert, CircleCheck, ChevronUp, Info } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import type { FairEvent, Signup } from "../../api/types";
import { Button } from "../../components/ui/button";
import { ConfirmDialog, Dialog } from "../../components/ui/dialog";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../lib/format";
import { baseApi } from "../../store/baseApi";
import { useAppDispatch } from "../../store/hooks";
import type { BookingState } from "./bookingState";
import { bookingStatusText, formatTimeLeft, lineRow, offerMsLeft, plural } from "./bookingText";
import { useGetEventQuery } from "./eventsApi";
import { SeatMap } from "./SeatMap";
import type { BookingActions } from "./useBookingActions";

const OFFER_POLL_MS = 30_000;

/** How long a seat offer is held, for the notes. The contract's acceptOffer speaks of a 24-hour window. */
const OFFER_HOURS = 24;

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

const primaryLink = cn(
  "inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-base font-semibold",
  "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)",
  focusRing,
);

const pill = "rounded-full";

export type BookingPanelProps = {
  event: FairEvent;
  state: BookingState;
  actions: BookingActions;
  now: number;
  /** /login?returnTo=… for visitors. */
  signInHref: string;
  /** Signed in? Visitors get sign-in links instead of buttons. */
  signedIn: boolean;
};

// ---------- Actions ----------

function BookButton({ state, actions, signedIn, signInHref, className }: Omit<BookingPanelProps, "event" | "now"> & { className?: string }) {
  const label = state.kind === "full" ? "Join the line" : state.kind === "expired" ? "Join the line again" : "Book a seat";
  if (!signedIn) {
    return (
      <Link to={signInHref} className={cn(primaryLink, className)}>
        {label}
      </Link>
    );
  }
  return (
    <Button size="lg" className={cn("w-full", pill, className)} loading={actions.booking} onClick={() => void actions.book()}>
      {label}
    </Button>
  );
}

type CancelCopy = { label: string; title: string; description: string; confirmLabel: string; keepLabel: string; doneTitle: string };

const GIVE_UP: CancelCopy = {
  label: "Give up my seat",
  title: "Give up your seat?",
  description: "Your seat goes to the next person in line. To come back, you'd book again. You can't undo this.",
  confirmLabel: "Give up seat",
  keepLabel: "Keep my seat",
  doneTitle: "You've given up your seat",
};

const LEAVE_LINE: CancelCopy = {
  label: "Leave the line",
  title: "Leave the line?",
  description: "You'll lose your place. To come back, you'd join at the back. You can't undo this.",
  confirmLabel: "Leave the line",
  keepLabel: "Stay in line",
  doneTitle: "You've left the line",
};

const DECLINE: CancelCopy = {
  label: "Decline",
  title: "Decline this seat?",
  description: "The seat goes to the next person in line and you leave the line. You can't undo this.",
  confirmLabel: "Decline seat",
  keepLabel: "Keep the offer",
  doneTitle: "You've declined the seat",
};

function CancelSignupButton({ signup, actions, copy }: { signup: Signup; actions: BookingActions; copy: CancelCopy }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" size="lg" className={cn("w-full", pill)} loading={actions.cancellingSignup}>
          {copy.label}
        </Button>
      }
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      cancelLabel={copy.keepLabel}
      tone="danger"
      loading={actions.cancellingSignup}
      onConfirm={() => actions.cancelSignup(signup, copy.doneTitle)}
    />
  );
}

function CancelEventButton({ actions }: { actions: BookingActions }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" size="lg" className={cn("w-full", pill)} loading={actions.cancellingEvent}>
          Cancel event
        </Button>
      }
      title="Cancel this event?"
      description="Every booking and place in line is cancelled, and everyone gets a notice. You can't undo this."
      confirmLabel="Cancel event"
      cancelLabel="Keep event"
      tone="danger"
      loading={actions.cancellingEvent}
      onConfirm={actions.cancelEvent}
    />
  );
}

function EditEventLink({ eventId, className }: { eventId: string; className?: string }) {
  return (
    <Link to={`/organiser/events/${encodeURIComponent(eventId)}/edit`} className={cn(primaryLink, className)}>
      Edit event
    </Link>
  );
}

// ---------- Pieces ----------

function Headline({ id, tone = "ink", children }: { id: string; tone?: "ink" | "copper"; children: ReactNode }) {
  return (
    <h2
      id={id}
      className={cn(
        "text-[1.75rem] leading-tight font-semibold tracking-tight",
        tone === "copper" ? "text-(--color-copper)" : "text-(--color-text)",
      )}
    >
      {children}
    </h2>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-(--color-text-muted)">{children}</p>;
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-(--color-text-muted)">{children}</p>;
}

/** A tinted strip across the top of the panel: copper for an offer, grey for news. */
function Banner({ id, tone, icon, children }: { id: string; tone: "copper" | "grey"; icon: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cn(
        "-mx-6 -mt-6 mb-5 flex items-center gap-2.5 rounded-t-[inherit] px-6 py-4",
        tone === "copper" ? "bg-(--color-copper-wash) text-(--color-copper-deep)" : "bg-(--color-surface) text-(--color-text)",
      )}
    >
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      <h2 id={id} className="text-base font-semibold tracking-normal">
        {children}
      </h2>
    </div>
  );
}

function LineOfPeople({ position, waiting }: { position: number; waiting: number }) {
  return (
    <ol aria-hidden="true" className="mt-4 flex items-center gap-1.5">
      {lineRow(position, waiting).map((spot, i) => (
        <li
          key={i}
          className={cn(
            "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
            spot === "you"
              ? "w-12 bg-(--color-primary) text-(--color-on-primary)"
              : spot === "gap"
                ? "text-(--color-text-muted)"
                : "bg-(--color-surface-darker) text-(--color-text)",
          )}
        >
          {spot === "you" ? "You" : spot === "gap" ? "…" : spot}
        </li>
      ))}
    </ol>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-(--color-surface) px-3 py-2.5">
      <dt className="text-xs text-(--color-text-muted)">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums text-(--color-text)">{value}</dd>
    </div>
  );
}

// ---------- The panel ----------

function PanelBody({ event, state, actions, now, signInHref, signedIn }: BookingPanelProps) {
  const headingId = `booking-heading-${event.id}`;
  const shared = { state, actions, signInHref, signedIn };
  const room = <SeatMap event={event} decorative className="my-5" />;

  switch (state.kind) {
    case "free":
    case "low":
    case "full":
    case "viewer": {
      const full = event.seatsAvailable <= 0;
      const kind = state.kind === "viewer" ? (full ? "full" : "free") : state.kind;
      return (
        <>
          {kind === "full" ? (
            <>
              <Headline id={headingId}>Full</Headline>
              <Sub>
                {event.seatsTaken} of {event.seats} taken · {event.waitingCount} in line
              </Sub>
            </>
          ) : kind === "low" ? (
            <>
              <Headline id={headingId} tone="copper">
                Only {plural(event.seatsAvailable, "seat", "seats")} left
              </Headline>
              <Sub>
                of {event.seats} · {event.goingCount} going
                {event.offeredCount > 0 && ` · ${event.offeredCount} offered`}
              </Sub>
            </>
          ) : (
            <>
              <Headline id={headingId}>{plural(event.seatsAvailable, "seat left", "seats left")}</Headline>
              <Sub>
                of {event.seats} · {event.goingCount} going
              </Sub>
            </>
          )}
          {room}
          {state.kind === "viewer" ? (
            <Note>Only attendee accounts book seats.</Note>
          ) : (
            <div className="flex flex-col gap-3">
              <BookButton {...shared} />
              <Note>
                {kind === "full"
                  ? `You'd be #${event.waitingCount + 1}. When someone gives up their seat, it's offered to the next person in line, with ${OFFER_HOURS} hours to accept.`
                  : kind === "low"
                    ? "Free to attend. Seats go to the first people to book."
                    : signedIn
                      ? "Free to attend."
                      : "Free to attend. You'll sign in first."}
              </Note>
            </div>
          )}
        </>
      );
    }

    case "going":
      return (
        <>
          <Banner id={headingId} tone="grey" icon={<CircleCheck className="size-5" />}>
            You're going
          </Banner>
          <p className="text-sm text-(--color-text)">
            {formatDateTime(event.startsAt, { now })} · {event.location}. See you there.
          </p>
          {room}
          <div className="flex flex-col gap-3">
            <CancelSignupButton signup={state.signup} actions={actions} copy={GIVE_UP} />
            <Note>Can't make it? Give up your seat and it goes straight to the next person in line.</Note>
          </div>
        </>
      );

    case "waiting": {
      const position = state.signup.waitingPosition;
      const waiting = Math.max(event.waitingCount, position ?? 0);
      return (
        <>
          <Headline id={headingId}>{position ? `You're #${position} in line` : "You're in line"}</Headline>
          <Sub>{plural(waiting, "person", "people")} waiting</Sub>
          {position && <LineOfPeople position={position} waiting={waiting} />}
          <p className="mt-4 mb-5 text-sm leading-6 text-(--color-text)">
            {position && position > 1
              ? `${plural(position - 1, "person is", "people are")} ahead of you. `
              : "You're next. "}
            This is a place in line, not a time estimate.
          </p>
          <div className="flex flex-col gap-3">
            <CancelSignupButton signup={state.signup} actions={actions} copy={LEAVE_LINE} />
            <Note>
              We'll tell you here and in your notices when a seat opens. You'll have {OFFER_HOURS} hours to accept it.
            </Note>
          </div>
        </>
      );
    }

    case "offer": {
      const { signup } = state;
      const ms = offerMsLeft(signup, now);
      const open = !(ms <= 0);
      return (
        <>
          <Banner id={headingId} tone="copper" icon={<CircleAlert className="size-5" />}>
            A seat opened up for you
          </Banner>
          {open ? (
            <>
              <p className="text-[2.5rem] leading-none font-semibold tracking-tight tabular-nums text-(--color-text)">
                {Number.isNaN(ms) ? "Held for you" : formatTimeLeft(ms)}
              </p>
              {signup.offerExpiresAt && (
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  left to accept · until{" "}
                  <time dateTime={signup.offerExpiresAt}>{formatDateTime(signup.offerExpiresAt, { now })}</time>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-(--color-text)">This offer has ended. Checking for the latest details…</p>
          )}
          <div className="mt-5 flex flex-col gap-3">
            <Button
              size="lg"
              className={cn("w-full", pill)}
              disabled={!open}
              loading={actions.accepting}
              onClick={() => void actions.accept(signup)}
            >
              Accept seat
            </Button>
            <CancelSignupButton signup={signup} actions={actions} copy={DECLINE} />
            <Note>If you don't accept in time, the seat goes to the next person in line.</Note>
          </div>
        </>
      );
    }

    case "expired":
      return (
        <>
          <Banner id={headingId} tone="grey" icon={<Info className="size-5" />}>
            Your offer expired
          </Banner>
          <p className="mb-5 text-sm leading-6 text-(--color-text)">
            {state.signup.offerExpiresAt ? (
              <>
                It ended <time dateTime={state.signup.offerExpiresAt}>{formatDateTime(state.signup.offerExpiresAt, { now })}</time>,
                and the seat went to the next person in line.
              </>
            ) : (
              "The seat went to the next person in line."
            )}
          </p>
          <div className="flex flex-col gap-3">
            <BookButton {...shared} />
            <Note>{event.seatsAvailable > 0 ? "A seat is free right now." : "You'll join at the back of the line."}</Note>
          </div>
        </>
      );

    case "organiser":
      return (
        <>
          <Headline id={headingId}>You're hosting</Headline>
          <Sub>
            {event.seatsTaken} of {event.seats} seats taken
          </Sub>
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Going" value={event.goingCount} />
            <Stat label="Offered" value={event.offeredCount} />
            <Stat label="In line" value={event.waitingCount} />
          </dl>
          {room}
          <div className="flex flex-col gap-3">
            <EditEventLink eventId={event.id} />
            <CancelEventButton actions={actions} />
            <Note>Everyone signed up gets a notice when you change or cancel the event.</Note>
          </div>
        </>
      );

    case "started":
      return (
        <>
          <Banner id={headingId} tone="grey" icon={<Info className="size-5" />}>
            {state.ended ? "This event has ended" : "This event has started"}
          </Banner>
          <Note>Booking is closed.</Note>
        </>
      );

    case "cancelled":
      return (
        <>
          <Banner id={headingId} tone="grey" icon={<Info className="size-5" />}>
            This event was cancelled
          </Banner>
          <Note>Everyone who booked or joined the line has been told in their notices.</Note>
        </>
      );
  }
}

export function BookingPanel(props: BookingPanelProps & { className?: string; bare?: boolean }) {
  const { className, bare, ...rest } = props;
  return (
    <section
      aria-labelledby={`booking-heading-${rest.event.id}`}
      className={cn(
        !bare && "rounded-[20px] border border-(--color-border) bg-(--color-bg) p-6 shadow-(--shadow-panel)",
        bare && "p-6",
        "overflow-hidden",
        className,
      )}
    >
      <PanelBody {...rest} />
    </section>
  );
}

// ---------- Phone ----------

/** The one action the phone bar shows, or null when the sheet holds them all. */
function BarAction(props: BookingPanelProps & { onOpenDetails: () => void }) {
  const { event, state, actions, onOpenDetails } = props;
  const size = "h-11 shrink-0 px-5 text-sm";
  switch (state.kind) {
    case "free":
    case "low":
    case "full":
    case "expired":
      return <BookButton {...props} className={cn(size, "w-auto")} />;
    case "offer":
      return (
        <Button
          className={cn(size, pill)}
          disabled={offerMsLeft(state.signup, props.now) <= 0}
          loading={actions.accepting}
          onClick={() => void actions.accept(state.signup)}
        >
          Accept seat
        </Button>
      );
    case "organiser":
      return <EditEventLink eventId={event.id} className={cn(size, "w-auto")} />;
    case "going":
    case "waiting":
      return (
        <Button variant="secondary" className={cn(size, pill)} onClick={onOpenDetails}>
          Manage
        </Button>
      );
    default:
      return null;
  }
}

export function BookingBar(props: BookingPanelProps & { onOpenDetails: () => void; className?: string }) {
  const { event, state, now, onOpenDetails, className } = props;
  const status = bookingStatusText(event, state, now);
  const tone = state.kind === "low" || state.kind === "offer" ? "text-(--color-copper)" : "text-(--color-text)";

  return (
    <div
      // index.css pads the page by the bar's height while it is shown.
      data-booking-bar=""
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-(--color-border) bg-(--color-bg) px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenDetails}
          aria-haspopup="dialog"
          className={cn("flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md text-left", focusRing)}
        >
          <span className="min-w-0">
            <span className={cn("block truncate text-sm font-semibold", tone)}>{status}</span>
            <span className="block text-xs text-(--color-text-muted)">See booking details</span>
          </span>
          <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-(--color-text-muted)" />
        </button>
        <BarAction {...props} />
      </div>
    </div>
  );
}

export function BookingSheet(props: BookingPanelProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { open, onOpenChange, ...panel } = props;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Booking"
      description={bookingStatusText(panel.event, panel.state, panel.now)}
      className={cn(
        "top-auto bottom-0 left-0 max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0",
        "rounded-none rounded-t-[24px] bg-(--color-bg) px-0 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        "[&>div:first-child]:px-6",
      )}
    >
      <BookingPanel {...panel} bare />
    </Dialog>
  );
}

// ---------- Offer upkeep ----------

/**
 * While an offer shows: poll the event every 30s (a second subscriber to the page's query; RTK
 * Query polls at the shortest interval asked for), and refetch once as soon as our clock passes
 * the deadline instead of waiting for the next poll. Renders nothing.
 */
export function OfferWatch({ eventId, signup, now }: { eventId: string; signup: Signup; now: number }) {
  useGetEventQuery(eventId, { pollingInterval: OFFER_POLL_MS });
  const dispatch = useAppDispatch();
  const expired = offerMsLeft(signup, now) <= 0;

  useEffect(() => {
    if (expired) dispatch(baseApi.util.invalidateTags([{ type: "Event", id: eventId }, "MySignup"]));
  }, [expired, eventId, dispatch]);

  return null;
}
