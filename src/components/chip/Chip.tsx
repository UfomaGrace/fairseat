// Chip: a toggle pill, e.g. a category filter.
//
//   <Chip pressed={category === "TECH"} onPressedChange={(on) => setCategory(on ? "TECH" : undefined)}>
//     Tech
//   </Chip>
//
// - A real <button> with aria-pressed, so screen readers announce "toggle button, pressed".
// - Off: white with a decorative border; on: primary (black) with white text, so the state is
//   shown by fill and by aria-pressed, not by the border alone.
// - 40px tall; an invisible ::after adds 2px above and below for a 44px tap area.
// - Defaults to type="button" so it never submits a form.

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed" | "onChange"> & {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
};

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { pressed, onPressedChange, onClick, type = "button", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onPressedChange(!pressed);
      }}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap",
        "after:absolute after:-inset-y-0.5 after:inset-x-0 after:content-['']",
        "transition-colors motion-reduce:transition-none",
        "focus-visible:[outline:var(--focus-ring-width)_solid_var(--color-focus)] focus-visible:outline-offset-(--focus-ring-offset)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        pressed
          ? "border-(--color-primary) bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)"
          : "border-(--color-border) bg-(--color-bg) text-(--color-text) hover:border-(--color-text-muted)",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
