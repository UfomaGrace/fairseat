// MoreFromOrganiser: "More from Tolu", up to three of the organiser's other events.
//
//   const more = useMoreFromOrganiser(event);   // organiserEvents.ts; [] while loading, on error or when none
//   <MoreFromOrganiser events={more} name="Tolu" now={now} />
//
// - GET /events?organiserId=<id>&limit=4, then this event is dropped and the first three shown.
//   Four are asked for so three are left when this event is among them.
// - The page hides the section (and the host card's link to it) when the list is empty. A failed
//   load hides it too: it is extra, and the rest of the page still works.

import { Link } from "react-router";
import type { FairEvent } from "../../api/types";
import { EventImage } from "../../components/event-image/EventImage";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../lib/format";
import { CATEGORY_LABELS } from "../../lib/labels";

export const MORE_FROM_ID = "more-from-organiser";

export function MoreFromOrganiser({ events, name, now }: { events: FairEvent[]; name: string; now: number }) {
  if (events.length === 0) return null;

  return (
    <section id={MORE_FROM_ID} aria-labelledby="more-from-heading" className="scroll-mt-24">
      <h2 id="more-from-heading" className="text-xl font-semibold text-(--color-text)">
        More from {name}
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-4 min-[480px]:grid-cols-3">
        {events.map((other) => (
          <li key={other.id} className="group relative min-w-0">
            <div className="overflow-hidden rounded-xl">
              <EventImage category={other.category} ratio="16 / 10" />
            </div>
            <p className="mt-2 text-xs text-(--color-text-muted)">
              <time dateTime={other.startsAt}>{formatDateTime(other.startsAt, { now, relative: true })}</time>
            </p>
            <h3 className="mt-0.5 text-sm leading-snug font-semibold wrap-break-word text-(--color-text)">
              {/* The link covers the card, so the whole card is one target. */}
              <Link
                to={`/events/${encodeURIComponent(other.id)}`}
                className={cn(
                  "rounded-sm underline-offset-2 group-hover:underline after:absolute after:inset-0",
                  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
                )}
              >
                {other.title}
              </Link>
            </h3>
            <p className="sr-only">Category: {CATEGORY_LABELS[other.category]}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
