
import { Link } from "react-router";
import type { Event } from "../../types/event";

interface EventCardProps {
  event: Event;
  variant?: "default" | "featured";
  showDescription?: boolean;
}

function EventCard({
  event,
  variant = "default",
  showDescription = true,
}: EventCardProps) {
  const isFeatured = variant === "featured";
  const isSoldOut = event.availableSeats <= 0;

  const formattedDate = new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(event.startDateTime));

  const formattedTime = new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date(event.startDateTime));

  const image = event.imageUrl?.trim();

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md sm:flex-row ${
        isFeatured ? "shadow-md" : "shadow-sm"
      }`}
    >
      {/* Event image */}
      <div
        className={`relative shrink-0 overflow-hidden bg-teal-50 sm:w-[38%] ${
          isFeatured ? "h-56 sm:h-auto" : "h-44 sm:h-auto"
        }`}
      >
        {image ? (
          <img
            src={image}
            alt={event.title}
            className="h-full min-h-44 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full min-h-44 items-center justify-center bg-linear-to-br from-teal-50 to-slate-100">
            <span className="text-sm font-semibold text-teal-800">
              {event.category}
            </span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
          {event.category}
        </span>
      </div>

      {/* Event information */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>
              <span aria-hidden="true">◷ </span>
              {formattedDate} · {formattedTime}
            </span>

            <span>
              <span aria-hidden="true">⌖ </span>
              {event.venue}
            </span>
          </div>

          <h2
            className={`font-bold tracking-tight text-slate-900 ${
              isFeatured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
            }`}
          >
            {event.title}
          </h2>

          {showDescription && (
            <p
              className={`text-sm leading-6 text-slate-600 ${
                isFeatured ? "" : "line-clamp-2"
              }`}
            >
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {event.format && (
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {event.format.replace("_", " ")}
              </span>
            )}

            <span
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                isSoldOut
                  ? "bg-red-50 text-red-700"
                  : "bg-teal-50 text-teal-800"
              }`}
            >
              {isSoldOut
                ? "Sold out"
                : `${event.availableSeats} seats available`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center justify-center w-full sm:w-auto rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            View details
          </Link>

          {!isSoldOut && (
            <Link
              to={`/events/${event.id}`}
              className="inline-flex items-center justify-center w-full sm:w-auto rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
            >
              Book a seat <span className="ml-2" aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default EventCard;
