// CategoryCover: the fallback event image. A tint, a big word and a simple icon per category.
//
//   <CategoryCover category="TECH" />                // 16:9
//   <CategoryCover category="DESIGN" ratio="1 / 1" />
//
// - Decorative (aria-hidden): the card or page names the category in text.
// - The cover is a size container, so the word and icon scale with its width (cqw units) and
//   read the same in an 88px thumbnail and a 400px card.
// - Record<Category, …> makes TypeScript fail here if the contract adds a category without a cover.
// - Colours are tokens from styles/tokens.css; the tints live in coverTints.ts (the Event detail
//   band uses them too). Ink strokes take the word's colour; the one accent is copper.

import type { ReactNode } from "react";
import type { Category } from "../../api/types";
import { cn } from "../../lib/cn";
import { COVER_TINTS } from "./coverTints";

export type CoverRatio = "16 / 9" | "16 / 10" | "1 / 1";

type CoverStyle = {
  word: string;
  icon: ReactNode;
};

const COPPER = "var(--color-copper)";

// Icons are drawn on a 48×48 grid with heavy round strokes in currentColor.
const COVERS: Record<Category, CoverStyle> = {
  TECH: {
    word: "Tech",
    icon: (
      <>
        <path d="M15 11 4 24l11 13M33 11l11 13-11 13" />
        <path d="M24 10v28" stroke={COPPER} />
      </>
    ),
  },
  DESIGN: {
    word: "Design",
    icon: (
      <>
        <circle cx="18" cy="28" r="12" />
        <circle cx="32" cy="17" r="9" fill={COPPER} stroke="none" />
      </>
    ),
  },
  PRODUCT: {
    word: "Product",
    icon: (
      <>
        <path d="M8 36h32M8 26h32" />
        <path d="M8 16h32" stroke={COPPER} />
      </>
    ),
  },
  CAREER: {
    word: "Career",
    icon: (
      <>
        <path d="M5 41h11V31h11V21h11" />
        <circle cx="41" cy="11" r="5" fill={COPPER} stroke="none" />
      </>
    ),
  },
  BUSINESS: {
    word: "Business",
    icon: (
      <>
        <path d="M9 40V30M19 40V22M29 40V26" />
        <path d="M39 40V10" stroke={COPPER} />
      </>
    ),
  },
  COMMUNITY: {
    word: "People",
    icon: (
      <>
        <circle cx="16" cy="16" r="6" />
        <path d="M5 41c0-7 5-12 11-12s11 5 11 12" />
        <circle cx="33" cy="19" r="5" fill={COPPER} stroke="none" />
        <path d="M27 41c0-6 3-10 7-10s9 4 9 10" stroke={COPPER} />
      </>
    ),
  },
};

export type CategoryCoverProps = {
  category: Category;
  ratio?: CoverRatio;
  className?: string;
};

export function CategoryCover({ category, ratio = "16 / 9", className }: CategoryCoverProps) {
  const cover = COVERS[category];
  // Light word and strokes on the dark Business cover.
  const tint = COVER_TINTS[category];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "@container relative w-full overflow-hidden select-none",
        tint.dark ? "text-(--color-on-dark)" : "text-(--color-text)",
        className,
      )}
      style={{ aspectRatio: ratio, background: tint.background }}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-[7cqw] right-[7cqw] size-[24cqw]"
      >
        {cover.icon}
      </svg>
      <span className="absolute bottom-[5cqw] left-[7cqw] text-[17cqw] leading-none font-bold tracking-[-0.045em]">
        {cover.word}
      </span>
    </div>
  );
}
