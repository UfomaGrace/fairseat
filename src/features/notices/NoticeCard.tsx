import { Armchair, Check, CircleX, Clock3, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Notice, Signup } from "../../api/types";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/dialog";
import { useBookingActions } from "../events/useBookingActions";
import { useGetEventQuery } from "../events/eventsApi";
import { useNow } from "../../lib/useNow";
import { CATEGORY_LABELS } from "../../lib/labels";
import { formatClock, formatDateTime, lagosDaysFromToday } from "../../lib/format";
import { offerCountdownText, offerEndsSoon, relativeNoticeTime } from "./noticeText";
import { baseApi } from "../../store/baseApi";
import { useAppDispatch } from "../../store/hooks";

const OFFERED: Notice["kind"] = "SEAT_OFFERED";
const CANCELLED: Notice["kind"] = "EVENT_CANCELLED";
const EXPIRED: Notice["kind"] = "OFFER_EXPIRED";

function NoticeIcon({ kind }: { kind: Notice["kind"] }) {
  const Icon = {
    SEAT_OFFERED: Armchair,
    EVENT_CHANGED: Pencil,
    EVENT_CANCELLED: CircleX,
    OFFER_EXPIRED: Clock3,
  }[kind];
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-(--color-border) bg-(--color-bg) text-(--color-text)">
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
    </span>
  );
}

export function NoticeCard({
  notice,
  signup,
  earlier = false,
  first = false,
}: {
  notice: Notice;
  signup?: Signup;
  earlier?: boolean;
  first?: boolean;
}) {
  const cardRef = useRef<HTMLLIElement>(null);
  const [nearViewport, setNearViewport] = useState(() => typeof IntersectionObserver === "undefined");
  const [announcement, setAnnouncement] = useState("");
  const dispatch = useAppDispatch();
  const now = useNow(60_000);
  const detailsNeeded = notice.kind === CANCELLED || notice.kind === EXPIRED;
  const eventQuery = useGetEventQuery(notice.eventId, {
    skip: !detailsNeeded || !nearViewport,
  });
  const event = eventQuery.data;
  const actions = useBookingActions({ id: notice.eventId });

  useEffect(() => {
    if (!detailsNeeded || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [detailsNeeded]);

  const expiry = signup?.offerExpiresAt;
  const millisecondsLeft = expiry ? Date.parse(expiry) - now : Number.NaN;
  const urgent = offerEndsSoon(millisecondsLeft);
  const offerExpired = signup?.status === "OFFERED" && millisecondsLeft <= 0;
  const title = signup?.event.title ?? "Event update";
  const eventLink = `/events/${encodeURIComponent(notice.eventId)}`;
  const relativeTime = relativeNoticeTime(notice.createdAt, now) || formatDateTime(notice.createdAt, { now });
  const offerCard = notice.kind === OFFERED && signup?.status === "OFFERED";

  useEffect(() => {
    if (offerExpired) {
      dispatch(baseApi.util.invalidateTags([{ type: "Event", id: notice.eventId }, "MySignup", "Notice"]));
    }
  }, [offerExpired, notice.eventId, dispatch]);

  function reportAction(succeeded: boolean, successMessage: string) {
    setAnnouncement(
      succeeded ? successMessage : "That action did not go through. The latest status has been refreshed.",
    );
  }

  const offerEndIsToday = expiry && lagosDaysFromToday(expiry, now) === 0;

  return (
    <li
      ref={cardRef}
      className={
        earlier
          ? `relative ${first ? "" : "border-t border-(--color-border)"}`
          : `relative overflow-hidden rounded-(--radius-notice) border bg-(--color-bg) ${
              offerCard ? (urgent ? "border-2 border-(--color-copper)" : "border-(--color-copper)") : "border-(--color-border)"
            }`
      }
    >
      <Link
        to={eventLink}
        aria-label={`View ${title}`}
        className="absolute inset-0 z-0 rounded-(--radius-notice) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
      />
      <div className={`relative z-10 pointer-events-none ${earlier ? "px-4 py-5 sm:px-5" : "p-5 sm:p-6"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <NoticeIcon kind={notice.kind} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <h3 className="break-words text-lg font-semibold leading-snug text-(--color-text)">{title}</h3>
              <time
                dateTime={notice.createdAt}
                className="shrink-0 text-sm text-(--color-text-muted) sm:pt-1"
              >
                {relativeTime}
              </time>
            </div>
            <p className="mt-2 wrap-break-word text-sm leading-6 text-(--color-text-muted)">{notice.message}</p>
            <div className="pointer-events-auto mt-4 space-y-3">
              {offerCard && signup && expiry && (
                <div className="rounded-(--radius-md) bg-(--color-copper-wash) p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xl font-semibold tabular-nums text-(--color-copper-deep)">
                      {millisecondsLeft > 0 ? offerCountdownText(millisecondsLeft) : "Offer ended"}
                    </p>
                    {urgent && (
                      <span className="rounded-full border border-(--color-copper) px-2.5 py-1 text-xs font-semibold text-(--color-copper-deep)">
                        Ends soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-(--color-text)">
                    to accept · until <time dateTime={expiry}>{formatDateTime(expiry, { now })}</time>
                  </p>
                  {urgent && offerEndIsToday && (
                    <p className="mt-1 text-sm font-medium text-(--color-copper-deep)">
                      Ends today at <time dateTime={expiry}>{formatClock(expiry)}</time>
                    </p>
                  )}
                  {millisecondsLeft <= 0 ? (
                    <p role="status" className="mt-3 text-sm text-(--color-text-muted)">
                      Checking for the latest details…
                    </p>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        className="mt-4 min-h-11 w-full sm:w-auto"
                        loading={actions.accepting}
                        onClick={() =>
                          void actions.accept(signup, (succeeded) =>
                            reportAction(succeeded, "You accepted your seat."),
                          )
                        }
                      >
                        Accept seat
                      </Button>
                      <p className="mt-3 text-sm text-(--color-text-muted)">
                        If you don&apos;t answer, the seat goes to the next person in line.
                      </p>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            className="mt-1 min-h-11 w-full justify-start px-0 text-sm underline underline-offset-4 sm:w-auto"
                            loading={actions.cancellingSignup}
                          >
                            Can&apos;t make it? Decline
                          </Button>
                        }
                        title="Decline this seat offer?"
                        description="The seat will go to the next person in line."
                        confirmLabel="Decline offer"
                        cancelLabel="Keep my offer"
                        tone="danger"
                        loading={actions.cancellingSignup}
                        onConfirm={() =>
                          actions.cancelSignup(signup, "Offer declined", (succeeded) =>
                            reportAction(succeeded, "You declined the seat offer."),
                          )
                        }
                      />
                    </>
                  )}
                </div>
              )}

              {notice.kind === OFFERED && signup?.status === "GOING" && (
                <p className="flex min-h-11 items-center gap-2 font-medium text-(--color-text)">
                  <Check aria-hidden="true" className="size-5" /> You accepted it
                </p>
              )}
              {notice.kind === OFFERED && signup?.status === "OFFER_EXPIRED" && (
                <p className="min-h-11 content-center font-medium text-(--color-text)">This offer has ended.</p>
              )}
              {notice.kind === "EVENT_CHANGED" && signup?.status === "GOING" && (
                <>
                  <p className="flex min-h-11 items-center gap-2 font-medium text-(--color-text)">
                    <Check aria-hidden="true" className="size-5" /> You&apos;re still going
                  </p>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="secondary"
                        size="lg"
                        className="min-h-11 w-full sm:w-auto"
                        loading={actions.cancellingSignup}
                      >
                        Can&apos;t make the new time? Give up your seat
                      </Button>
                    }
                    title="Give up your seat?"
                    description="Your seat will be released for someone else."
                    confirmLabel="Give up my seat"
                    cancelLabel="Keep my seat"
                    tone="danger"
                    loading={actions.cancellingSignup}
                    onConfirm={() =>
                      actions.cancelSignup(signup, "Seat released", (succeeded) =>
                        reportAction(succeeded, "You gave up your seat."),
                      )
                    }
                  />
                </>
              )}
              {notice.kind === "EVENT_CHANGED" && signup?.status === "WAITING" && (
                <p className="min-h-11 content-center font-medium text-(--color-text)">
                  {signup.waitingPosition
                    ? `You're still #${signup.waitingPosition} in line`
                    : "You're still in line"}
                </p>
              )}
              {notice.kind === CANCELLED && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {signup && (
                    <p className="min-h-11 content-center font-medium text-(--color-text)">
                      Cancelled by the organiser. Your place was released.
                    </p>
                  )}
                  <Link
                    to={event ? `/events?category=${encodeURIComponent(event.category)}` : "/events"}
                    className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
                  >
                    {event ? `Find similar ${CATEGORY_LABELS[event.category]} events` : "Find similar events"}
                  </Link>
                </div>
              )}
              {notice.kind === EXPIRED && signup?.status === "OFFER_EXPIRED" && (
                <>
                  <p className="min-h-11 content-center font-medium text-(--color-text)">
                    Your offer ended and the seat went to the next person.
                  </p>
                  {event && event.status !== "CANCELLED" && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {event.seatsAvailable <= 0 ? (
                        <>
                          <p className="text-sm text-(--color-text-muted)">The event is still full.</p>
                          <Button
                            size="lg"
                            className="min-h-11 w-full sm:w-auto"
                            loading={actions.booking}
                            onClick={() =>
                              void actions.book((succeeded) =>
                                reportAction(succeeded, "You joined the line again."),
                              )
                            }
                          >
                            Join the line again
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="lg"
                          className="min-h-11 w-full sm:w-auto"
                          loading={actions.booking}
                          onClick={() =>
                            void actions.book((succeeded) =>
                              reportAction(succeeded, "Your event place has been updated."),
                            )
                          }
                        >
                          Book a seat
                        </Button>
                      )}
                    </div>
                  )}
                  {!event && (
                    <Link
                      to={eventLink}
                      className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
                    >
                      View event
                    </Link>
                  )}
                </>
              )}
              {notice.kind === EXPIRED && !signup && (
                <Link
                  to={eventLink}
                  className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
                >
                  View event
                </Link>
              )}
              <p aria-live="polite" aria-atomic="true" className="sr-only">
                {announcement}
              </p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
