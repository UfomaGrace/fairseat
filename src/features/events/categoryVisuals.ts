// Category visuals: the tint and icon on each event card's top panel.
//
// - Record<Category, …> makes TypeScript fail here if the contract adds a category without one.
// - Colours are tokens from styles/tokens.css. The icon is decorative: the card also writes the
//   category name in its pill.

import { Briefcase, CodeXml, PenTool, Rocket, TrendingUp, Users, type LucideIcon } from "lucide-react";
import type { Category } from "../../api/types";

export type CategoryVisual = {
  icon: LucideIcon;
  /** Tailwind classes for the panel's background and the icon's colour. */
  className: string;
};

export const CATEGORY_VISUALS: Record<Category, CategoryVisual> = {
  TECH: { icon: CodeXml, className: "bg-(--color-cat-tech-bg) text-(--color-cat-tech)" },
  DESIGN: { icon: PenTool, className: "bg-(--color-cat-design-bg) text-(--color-cat-design)" },
  PRODUCT: { icon: Rocket, className: "bg-(--color-cat-product-bg) text-(--color-cat-product)" },
  CAREER: { icon: TrendingUp, className: "bg-(--color-cat-career-bg) text-(--color-cat-career)" },
  BUSINESS: { icon: Briefcase, className: "bg-(--color-cat-business-bg) text-(--color-cat-business)" },
  COMMUNITY: { icon: Users, className: "bg-(--color-cat-community-bg) text-(--color-cat-community)" },
};
