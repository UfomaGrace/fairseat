// coverTints: each category's cover colour, shared by CategoryCover and the Event detail band.
// dark: the tint needs light text on it (Business).
import type { Category } from "../../api/types";

export type CoverTint = { background: string; dark: boolean };

export const COVER_TINTS: Record<Category, CoverTint> = {
  TECH: { background: "var(--color-cover-tech)", dark: false },
  DESIGN: { background: "var(--color-cover-design)", dark: false },
  PRODUCT: { background: "var(--color-cover-product)", dark: false },
  CAREER: { background: "var(--color-cover-career)", dark: false },
  BUSINESS: { background: "var(--color-cover-business)", dark: true },
  COMMUNITY: { background: "var(--color-cover-community)", dark: false },
};
