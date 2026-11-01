// HowItWorksPage: how seats and the waiting line work. Linked from the header and footer.
// Moved here from the old Events intro when Discover was rebuilt: same seat grid, legend and steps.

import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "../lib/cn";

const SEAT_COUNT = 32;
/** Seats before this index are going, this one is offered, the rest are free. */
const OFFERED_SEAT = 23;

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-8 md:py-16">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">How it works</h1>
      <p className="mt-3 text-lg text-(--color-text-muted)">First come, first served. Nobody skips the line.</p>

      <section
        aria-label="Seats at an event"
        className="mt-8 rounded-(--radius-card) bg-(--color-dark) p-6 text-(--color-on-dark) sm:p-9"
      >
        <div aria-hidden="true" className="grid grid-cols-8 gap-2 sm:gap-3">
          {Array.from({ length: SEAT_COUNT }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-6 rounded-md sm:h-7",
                i < OFFERED_SEAT && "bg-(--color-on-dark)",
                i === OFFERED_SEAT && "bg-(--color-seat-offered)",
                i > OFFERED_SEAT && "border border-(--color-seat-free-border)",
              )}
            />
          ))}
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-(--color-on-dark-muted)">
          <LegendItem swatch="bg-(--color-on-dark)">Going</LegendItem>
          <LegendItem swatch="bg-(--color-seat-offered)">Offered (up to 24h to accept)</LegendItem>
          <LegendItem swatch="border border-(--color-seat-free-border)">Free</LegendItem>
        </ul>

        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          <Step number={1}>Sign up. If there's a seat, you're going.</Step>
          <Step number={2}>Full? Join the line in sign-up order.</Step>
          <Step number={3}>A seat frees up? The next person gets the offer, with 24 hours to accept.</Step>
        </ol>
      </section>

      <p className="mt-8">
        <Link
          to="/events"
          className={cn(
            "inline-flex min-h-11 items-center rounded-full bg-(--color-primary) px-6 font-semibold text-(--color-on-primary) hover:bg-(--color-primary-hover)",
            focusRing,
          )}
        >
          Find a meetup
        </Link>
      </p>
    </main>
  );
}

function LegendItem({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cn("size-4 shrink-0 rounded-sm", swatch)} />
      {children}
    </li>
  );
}

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="sm:text-lg">
      {/* The <ol> already numbers the steps for screen readers. */}
      <span aria-hidden="true" className="block text-3xl font-bold text-(--color-on-dark-accent)">
        {number}
      </span>
      <span className="mt-2 block">{children}</span>
    </li>
  );
}
