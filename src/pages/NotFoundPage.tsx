// NotFoundPage: any address no route matches.

import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-(--color-text)">Page not found</h1>
      <p className="text-(--color-text-muted)">This address doesn't match any page in FairSeat.</p>
      <Link
        to="/events"
        className="mt-2 inline-flex min-h-11 items-center rounded-(--radius-md) bg-(--color-primary) px-4 text-sm font-medium text-(--color-on-primary) hover:bg-(--color-primary-hover) focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-(--color-focus) focus-visible:outline-solid"
      >
        Go to events
      </Link>
    </main>
  );
}
