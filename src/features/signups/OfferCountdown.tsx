// OfferCountdown: how long an offered seat is held for, e.g. "5h 12m 03s".
//
//   const now = useNow(1000);
//   <OfferCountdown expiresAt={signup.offerExpiresAt} now={now} />
//
// - now comes from the caller, so the caller (which disables "Accept seat") and the countdown
//   always agree on when the offer has expired.
// - The ticking number is not a live region: a screen reader would read it out every second.
//   The fixed deadline sits under it in Lagos time, and the "expired" line is role="status",
//   so it is announced once when it appears.

import { formatDateTime } from "../../lib/format";

export type OfferCountdownProps = {
  expiresAt: string;
  /** Milliseconds since 1970, from useNow. */
  now: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** 18_723_000 → "5h 12m 03s"; under an hour → "12m 03s". */
function formatTimeLeft(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s` : `${minutes}m ${pad(seconds)}s`;
}

export function OfferCountdown({ expiresAt, now }: OfferCountdownProps) {
  const msLeft = Date.parse(expiresAt) - now;
  if (Number.isNaN(msLeft)) return null;

  if (msLeft <= 0) {
    return (
      <p role="status" className="text-sm font-medium text-(--color-warning)">
        This offer has expired. Checking for the latest details…
      </p>
    );
  }

  return (
    <div className="rounded-md border border-(--color-border) bg-(--color-warning-subtle) p-3">
      <p className="text-sm text-(--color-text-muted)">Seat held for you for</p>
      <p className="text-2xl font-semibold tabular-nums text-(--color-warning)">{formatTimeLeft(msLeft)}</p>
      <p className="mt-1 text-sm text-(--color-text)">
        Accept by <time dateTime={expiresAt}>{formatDateTime(expiresAt)}</time>
      </p>
    </div>
  );
}
