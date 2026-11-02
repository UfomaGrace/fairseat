// Layout: the frame around every page (skip link, header, footer). Used as a layout route:
//
//   <Route element={<Layout />}> ...pages... </Route>
//
// - Header: logo, nav (Discover, How it works, plus the role's own pages), keyword search, and
//   Sign in or the signed-in person. Sticky on phones, where it is short; static from 768px.
// - Search: a field from 1100px; below that a search button opens the field under the header.
// - Nav links depend on the role: visitor, ATTENDEE, or ORGANISER/ADMIN. Visitors see the two
//   public links inline from 768px. Signed-in people get them inline from 1100px, and behind a
//   Menu button below that (they have more links, plus Sign out).
// - The menu remembers the page it was opened on, so moving to another page (link, back button)
//   closes it. Escape closes the menu or the search row.
// - NavLink sets aria-current="page" on the active link; the styles hang off that.
// - Pages render their own <main>, so the skip-link target here is a <div>.
// - Colours, fonts and the focus ring come from styles/tokens.css. Sign in is drawn as a black button.

import { Menu, Search, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { IS_MOCK } from "../api/client";
import type { Role } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/ui/button";
import { cn } from "../lib/cn";
import { FairSeatLogo } from "./FairSeatLogo";
import { HeaderSearch } from "./HeaderSearch";

interface NavItem {
  to: string;
  label: string;
  /** Only active on this exact path, not on paths below it. */
  end?: boolean;
}

const PUBLIC_NAV: readonly NavItem[] = [
  { to: "/events", label: "Discover" },
  { to: "/how-it-works", label: "How it works" },
];

const ORGANISER_NAV: readonly NavItem[] = [
  ...PUBLIC_NAV,
  { to: "/organiser/events", label: "My organised events", end: true },
  { to: "/organiser/events/new", label: "Create event" },
];

// Record<Role, …> makes TypeScript complain if a new role is added without a nav.
const NAV_BY_ROLE: Record<Role, readonly NavItem[]> = {
  ATTENDEE: [...PUBLIC_NAV, { to: "/me/events", label: "My events" }, { to: "/me/notices", label: "Notices" }],
  ORGANISER: ORGANISER_NAV,
  ADMIN: ORGANISER_NAV,
};

const focusRing =
  "focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-(--color-focus) focus-visible:outline-solid";

const navLinkClass = cn(
  "flex min-h-11 items-center rounded-(--radius-md) px-4 font-semibold whitespace-nowrap",
  "text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)",
  // Active: a filled grey pill in ink, so it isn't shown by colour alone.
  "aria-[current=page]:bg-(--color-surface) aria-[current=page]:text-(--color-text)",
  focusRing,
);

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  // The path the menu was opened on. Any other path means it's closed.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === location.pathname;
  const [searchOpen, setSearchOpen] = useState(false);

  const nav = user ? NAV_BY_ROLE[user.role] : PUBLIC_NAV;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    if (menuOpen) {
      setMenuOpenOn(null);
      menuButtonRef.current?.focus();
    } else if (searchOpen) {
      setSearchOpen(false);
      searchButtonRef.current?.focus();
    }
  }

  function navList(className: string) {
    return (
      <ul className={className}>
        {nav.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end} onClick={() => setMenuOpenOn(null)} className={navLinkClass}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-(--color-bg) font-(family-name:--font-sans) text-(--color-text)">
      <a
        href="#main"
        className={cn(
          "sr-only z-50 rounded-(--radius-md) bg-(--color-bg) px-4 py-3 font-semibold text-(--color-text)",
          "focus:not-sr-only focus:fixed focus:top-2 focus:left-2",
          focusRing,
        )}
      >
        Skip to main content
      </a>

      <header
        onKeyDown={handleKeyDown}
        className="sticky top-0 z-40 border-b border-(--color-header-border) bg-(--color-bg) text-(--color-text) md:static"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-x-2 px-4 py-2 sm:px-8 md:gap-x-6 md:py-4">
          <Link to="/events" className={cn("flex min-h-11 shrink-0 items-center rounded-(--radius-sm)", focusRing)}>
            <FairSeatLogo size={26} withWordmark />
          </Link>

          <nav aria-label="Main" className={cn("hidden", user ? "min-[1100px]:block" : "md:block")}>
            {navList("flex items-center gap-1")}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <HeaderSearch className="hidden w-60 min-[1100px]:block xl:w-72" />
            <Button
              ref={searchButtonRef}
              variant="ghost"
              iconOnly
              aria-label="Search events"
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? "header-search" : undefined}
              onClick={() => setSearchOpen(!searchOpen)}
              className="size-11 rounded-full min-[1100px]:hidden"
            >
              {searchOpen ? <X aria-hidden="true" className="size-5" /> : <Search aria-hidden="true" className="size-5" />}
            </Button>

            {user ? (
              <>
                <div className="hidden items-center gap-3 min-[1100px]:flex">
                  <p className="hidden text-sm font-medium xl:block">{user.displayName}</p>
                  <Button variant="secondary" className="min-h-11 rounded-full px-5" onClick={() => signOut("You've signed out.")}>
                    Sign out
                  </Button>
                </div>
                <Button
                  ref={menuButtonRef}
                  variant="ghost"
                  aria-expanded={menuOpen}
                  aria-controls="site-menu"
                  onClick={() => setMenuOpenOn(menuOpen ? null : location.pathname)}
                  className="min-h-11 min-[1100px]:hidden"
                >
                  {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
                  Menu
                </Button>
              </>
            ) : (
              <NavLink
                to="/login"
                // Sign in returns to the page the visitor was on.
                state={{ from: location }}
                className={cn(
                  "flex min-h-11 items-center rounded-full bg-(--color-primary) px-5 text-sm font-semibold whitespace-nowrap",
                  "text-(--color-on-primary) hover:bg-(--color-primary-hover)",
                  focusRing,
                )}
              >
                Sign in
              </NavLink>
            )}
          </div>
        </div>

        {searchOpen && (
          <div id="header-search" className="mx-auto max-w-7xl px-4 pb-3 sm:px-8 min-[1100px]:hidden">
            <HeaderSearch autoFocus onSearched={() => setSearchOpen(false)} />
          </div>
        )}

        {user && (
          <div
            id="site-menu"
            className={cn(
              "mx-auto max-w-7xl flex-col gap-3 px-4 pb-3 sm:px-8 min-[1100px]:hidden",
              menuOpen ? "flex" : "hidden",
            )}
          >
            <nav aria-label="Main">{navList("flex flex-col gap-1")}</nav>
            <div className="flex items-center justify-between gap-3 border-t border-(--color-header-border) pt-3">
              <p className="text-sm font-medium">{user.displayName}</p>
              <Button variant="secondary" className="min-h-11" onClick={() => signOut("You've signed out.")}>
                Sign out
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* tabIndex={-1} lets the skip link move focus here, not just scroll. */}
      <div id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </div>

      <footer className="border-t border-(--color-border) bg-(--color-surface)">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 sm:px-8">
          <FairSeatLogo size={22} withWordmark />
          <p className="text-sm text-(--color-text-muted)">
            <Link to="/how-it-works" className={cn("rounded-sm underline underline-offset-4", focusRing)}>
              How it works
            </Link>
            {" · "}Demonstration product. All data is fictional.
            {IS_MOCK && " This build is running against a mock server (VITE_MOCK=true), so data changes are not saved."}
          </p>
        </div>
      </footer>
    </div>
  );
}
