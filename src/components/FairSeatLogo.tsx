// FairSeat logo: two overlapping seats with the shared copper overlap, plus an optional wordmark.
// - size is the mark's height in px; the wordmark scales with it.
// - variant="light" draws the ink circles in white, for dark backgrounds. Copper stays copper.
// - With the wordmark, the visible text is the accessible name and the mark is hidden.
//   Without it, the mark is an image named "FairSeat".

import { cn } from "../lib/cn";

type FairSeatLogoProps = {
  size?: number;
  withWordmark?: boolean;
  variant?: "dark" | "light";
  className?: string;
};

export function FairSeatLogo({
  size = 32,
  withWordmark = false,
  variant = "dark",
  className,
}: FairSeatLogoProps) {
  const ink = variant === "light" ? "#FFFFFF" : "#111111";

  const mark = (
    <svg
      viewBox="0 0 40 32"
      width={(size * 40) / 32}
      height={size}
      className="shrink-0"
      {...(withWordmark ? { "aria-hidden": true } : { role: "img", "aria-label": "FairSeat" })}
    >
      <circle cx="14" cy="20" r="11" fill={ink} />
      <circle cx="26" cy="12" r="11" fill={ink} />
      <path d="M15.39 9.09A11 11 0 0 1 24.61 22.91A11 11 0 0 1 15.39 9.09z" fill="#C24A0B" />
    </svg>
  );

  if (!withWordmark) {
    return <span className={cn("inline-flex", className)}>{mark}</span>;
  }

  return (
    <span
      className={cn("inline-flex items-center font-semibold leading-none tracking-tighter", className)}
      style={{ gap: size * 0.3, fontSize: size * 0.8, color: ink }}
    >
      {mark}
      FairSeat
    </span>
  );
}
