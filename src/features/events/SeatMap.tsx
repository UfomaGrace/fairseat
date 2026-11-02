// SeatMap: the room as seats, for "The room" and the booking panel.
//
//   <SeatMap event={event} />            // role="img" named by the counts, with a legend
//   <SeatMap event={event} decorative /> // the booking panel: its text already gives the counts
//
// - Up to ROOM_GRID_MAX_SEATS: a 10-column grid of seats with rounded tops, under a short bar for
//   the front of the room. Seat order comes from roomLayout (shuffled by event id).
// - More seats: one proportion bar in the same three colours.
// - Going is stone, offered pale copper, free solid copper. Free seats pulse once on load; the
//   pulse is off under prefers-reduced-motion.
// - Colour is never the only signal: the image is named in words and the legend is text.

import type { FairEvent } from "../../api/types";
import { cn } from "../../lib/cn";
import { ROOM_GRID_MAX_SEATS, roomCounts, roomLabel, roomLayout, type SeatKind } from "./roomSeats";

const SEAT_COLOURS: Record<SeatKind, string> = {
  going: "bg-(--color-surface-darker)",
  offered: "bg-(--color-copper-pale)",
  free: "bg-(--color-copper)",
};

const PULSE = "motion-safe:animate-[seat-pulse_1.4s_ease-out_500ms_1] motion-reduce:animate-none";

type SeatMapEvent = Pick<FairEvent, "id" | "seats" | "goingCount" | "offeredCount" | "seatsAvailable" | "status">;

export type SeatMapProps = {
  event: SeatMapEvent;
  decorative?: boolean;
  /** Hide the legend (the panel shows it once, under the grid, only when there is room). */
  legend?: boolean;
  className?: string;
};

export function SeatMap({ event, decorative = false, legend = true, className }: SeatMapProps) {
  const counts = roomCounts(event);
  const label = roomLabel(counts);

  // A cancelled event has no room to book: empty outlines, no colours, no legend.
  if (event.status === "CANCELLED") {
    return (
      <div
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "The room: this event was cancelled" })}
        className={cn("mx-auto grid w-full max-w-[420px] grid-cols-10 gap-1.5 sm:gap-2", className)}
      >
        {Array.from({ length: Math.min(counts.total, ROOM_GRID_MAX_SEATS) }, (_, i) => (
          <span key={i} className="aspect-[1/0.9] rounded-t-[45%] rounded-b-[3px] border border-(--color-border-input)" />
        ))}
      </div>
    );
  }

  const imageProps = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `The room: ${label}` };

  return (
    <div className={cn("min-w-0", className)}>
      {counts.total > ROOM_GRID_MAX_SEATS ? (
        <div {...imageProps} className="flex h-4 w-full overflow-hidden rounded-full bg-(--color-surface-darker)">
          {(["going", "offered", "free"] as const).map((kind) =>
            counts[kind] > 0 ? (
              <span
                key={kind}
                className={cn("h-full", SEAT_COLOURS[kind])}
                style={{ width: `${(counts[kind] / counts.total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      ) : (
        // Capped at 420px so seats stay seat-sized (about 34px) in a wide column.
        <div {...imageProps} className="mx-auto max-w-[420px]">
          <div className="mx-auto mb-3 h-1.5 w-1/3 rounded-full bg-(--color-surface-darker)" />
          <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
            {roomLayout(event).map((kind, i) => (
              <span
                key={i}
                className={cn(
                  "aspect-[1/0.9] rounded-t-[45%] rounded-b-[3px]",
                  SEAT_COLOURS[kind],
                  kind === "free" && PULSE,
                )}
              />
            ))}
          </div>
        </div>
      )}

      {legend && <SeatLegend className="mt-4" />}
    </div>
  );
}

export function SeatLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-(--color-text-muted)", className)}>
      <LegendItem kind="going">Going</LegendItem>
      <LegendItem kind="offered">Offered to someone in line</LegendItem>
      <LegendItem kind="free">Free</LegendItem>
    </ul>
  );
}

function LegendItem({ kind, children }: { kind: SeatKind; children: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className={cn("size-3 rounded-t-[45%] rounded-b-[2px]", SEAT_COLOURS[kind])} />
      {children}
    </li>
  );
}
