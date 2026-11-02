// Avatar: a person's initials in a circle.
//
//   <Avatar id={organiser.id} name={organiser.displayName} decorative />  // name is shown beside it
//   <Avatar id={organiser.id} name={organiser.displayName} />             // stands alone
//
// - The colour pair comes from the id (avatarParts), so the same organiser always looks the same.
// - decorative: aria-hidden, for when the name is already written next to it. Otherwise it is an
//   image named after the person.
// - Sizes 20, 24, 28, 32 (header) and 40px (host card).

import { cn } from "../../lib/cn";
import { avatarPalette, initials } from "./avatarParts";

export type AvatarSize = 20 | 24 | 28 | 32 | 40;

export type AvatarProps = {
  /** Stable id (e.g. the organiser id) that picks the colour. */
  id: string;
  name: string;
  size?: AvatarSize;
  decorative?: boolean;
  className?: string;
};

const sizeClasses: Record<AvatarSize, string> = {
  20: "size-5 text-[9px]",
  24: "size-6 text-[10px]",
  28: "size-7 text-xs",
  32: "size-8 text-xs",
  40: "size-10 text-sm",
};

export function Avatar({ id, name, size = 24, decorative = false, className }: AvatarProps) {
  const palette = avatarPalette(id);

  return (
    <span
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full leading-none font-semibold tracking-normal select-none",
        sizeClasses[size],
        className,
      )}
      style={{ background: palette.background, color: palette.color }}
    >
      {initials(name)}
    </span>
  );
}
