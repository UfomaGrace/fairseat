import { Link } from "react-router";
import { useAuth } from "../auth/useAuth";
import { cn } from "../lib/cn";

const SEAT_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="28"><rect x="5" y="5" width="26" height="18" rx="5" fill="white"/></svg>',
)}")`;

const STEPS = [
  ["Find an event", "Browse free tech and networking meetups around Lagos."],
  ["Book a seat", "If there's a seat, it's yours. You'll see it in My events."],
  ["Full? Join the line", "You get a place in line. Nobody can skip ahead of you."],
  ["Get an offer", "When a seat opens, the first person in line gets it for 24 hours. Accept it or it goes to the next person."],
] as const;

const focusRing =
  "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)";

export default function HowItWorksPage() {
  const { user } = useAuth();
  const canHost = user?.role === "ORGANISER" || user?.role === "ADMIN";

  return (
    <main className="relative isolate flex min-h-[calc(100dvh-68px)] items-center justify-center overflow-hidden bg-(--color-surface) px-0 py-4 sm:px-8 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundColor: "var(--color-border)",
          maskImage: SEAT_PATTERN,
          maskSize: "36px 28px",
          maskRepeat: "repeat",
        }}
      />
      <span aria-hidden="true" className="pointer-events-none absolute top-12 left-[12%] -z-10 hidden h-4.5 w-6.5 rounded-[5px] bg-(--color-copper-wash) md:block" />
      <span aria-hidden="true" className="pointer-events-none absolute right-[10%] bottom-16 -z-10 hidden h-4.5 w-6.5 rounded-[5px] bg-(--color-copper) md:block" />

      <div className="w-full max-w-3xl rounded-none border-y border-(--color-border) bg-(--color-bg) px-5 py-8 shadow-[0_12px_40px_rgb(17_17_17/0.06)] sm:rounded-[28px] sm:border sm:px-8 sm:py-10 md:px-12 md:py-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How FairSeat works</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-(--color-text-muted) sm:text-lg">
            Free meetups, fair seats. First come, first served, with no favourites.
          </p>
        </header>

        <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 sm:gap-y-7">
          {STEPS.map(([title, description], index) => (
            <li key={title} className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-[6px] text-sm font-semibold",
                  index === 3 ? "bg-(--color-copper) text-(--color-on-warning)" : "bg-(--color-surface) text-(--color-text)",
                )}
              >
                {index + 1}
              </span>
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-(--color-text-muted)">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        <section aria-labelledby="hosting-heading" className="mt-8 rounded-2xl bg-(--color-surface) p-5 sm:mt-10 sm:p-6">
          <h2 id="hosting-heading" className="text-lg font-semibold">Hosting an event?</h2>
          <p className="mt-1 text-sm leading-6 text-(--color-text-muted)">
            Set your seats and FairSeat handles the bookings, the line and the offers.
          </p>
          <Link
            to={canHost ? "/organiser/events/new" : "/login"}
            className={cn(
              "mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-(--color-border-input) bg-(--color-bg) px-5 text-sm font-semibold text-(--color-text) hover:bg-(--color-border)",
              focusRing,
            )}
          >
            {canHost ? "Create an event" : "Sign in to host"}
          </Link>
        </section>

        <Link
          to="/events"
          className={cn(
            "mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-(--color-primary) px-7 font-semibold text-(--color-on-primary) hover:bg-(--color-primary-hover)",
            focusRing,
          )}
        >
          Find an event
        </Link>
      </div>
    </main>
  );
}
