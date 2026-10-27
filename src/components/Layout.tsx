// Layout: the frame around every page (skip link, header, footer). Used as a layout route:
//
//   <Route element={<Layout />}> ...pages... </Route>
//
// - Nav links depend on the role: visitor, ATTENDEE, or ORGANISER/ADMIN.
// - NavLink sets aria-current="page" on the active link; the styles hang off that.
// - Below md the links sit behind a Menu button. The menu remembers the page it was
//   opened on, so moving to another page (link, back button) closes it.
// - Pages render their own <main>, so the skip-link target here is a <div>.

import { Menu, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { IS_MOCK } from "../api/client";
import type { Role } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { Button } from "../shared/ui/button";
import { cn } from "../shared/cn";

interface NavItem {
  to: string;
  label: string;
  /** Only active on this exact path, not on paths below it. */
  end?: boolean;
}

const VISITOR_NAV: readonly NavItem[] = [
  { to: "/events", label: "Events" },
  { to: "/login", label: "Sign in" },
];

const ORGANISER_NAV: readonly NavItem[] = [
  { to: "/events", label: "Events" },
  { to: "/organiser/events", label: "My organised events", end: true },
  { to: "/organiser/events/new", label: "Create event" },
];

// Record<Role, …> makes TypeScript complain if a new role is added without a nav.
const NAV_BY_ROLE: Record<Role, readonly NavItem[]> = {
  ATTENDEE: [
    { to: "/events", label: "Events" },
    { to: "/me/events", label: "My events" },
    { to: "/me/notices", label: "Notices" },
  ],
  ORGANISER: ORGANISER_NAV,
  ADMIN: ORGANISER_NAV,
};

const focusRing =
  "focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-(--color-focus) focus-visible:outline-solid";

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // The path the menu was opened on. Any other path means it's closed.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === location.pathname;

  const nav = user ? NAV_BY_ROLE[user.role] : VISITOR_NAV;

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && menuOpen) {
      setMenuOpenOn(null);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-(--color-bg) font-(family-name:--font-sans) text-(--color-text)">
      <a
        href="#main"
        className={cn(
          "sr-only z-50 rounded-(--radius-md) bg-(--color-surface) px-4 py-3 font-semibold text-(--color-text)",
          "focus:not-sr-only focus:fixed focus:top-2 focus:left-2",
          focusRing,
        )}
      >
        Skip to main content
      </a>

      {/* The header is dark, so the focus ring switches to the light "on" colour here. */}
      <header
        onKeyDown={handleKeyDown}
        className="bg-(--color-secondary) text-(--color-on-secondary) [--color-focus:var(--color-on-secondary)]"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-8">
          <Link
            to="/events"
            className={cn("flex min-h-11 items-center rounded-(--radius-sm) text-xl font-bold tracking-tight", focusRing)}
          >
            FairSeat
          </Link>

          <Button
            ref={menuButtonRef}
            variant="ghost"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpenOn(menuOpen ? null : location.pathname)}
            className="ml-auto min-h-11 text-(--color-on-secondary) hover:bg-(--color-secondary-hover) md:hidden"
          >
            {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            Menu
          </Button>

          {/* Below md: hidden until Menu is pressed, then a full-width column. From md: always a row. */}
          <div
            id="site-menu"
            className={cn(
              "w-full flex-col gap-3 pb-3 md:flex md:w-auto md:flex-1 md:flex-row md:items-center md:pb-0",
              menuOpen ? "flex" : "hidden",
            )}
          >
            <nav aria-label="Main">
              <ul className="flex flex-col gap-1 md:flex-row">
                {nav.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      // Sign in returns to the page the visitor was on.
                      state={item.to === "/login" ? { from: location } : undefined}
                      onClick={() => setMenuOpenOn(null)}
                      className={cn(
                        "flex min-h-11 items-center rounded-(--radius-md) px-3 text-sm font-medium whitespace-nowrap",
                        "text-(--color-on-secondary-muted) hover:bg-(--color-secondary-hover) hover:text-(--color-on-secondary)",
                        // Active: brighter, bold and underlined, so it isn't shown by colour alone.
                        "aria-[current=page]:bg-(--color-secondary-hover) aria-[current=page]:font-semibold aria-[current=page]:text-(--color-on-secondary)",
                        "aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-4",
                        focusRing,
                      )}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {user && (
              <div className="flex items-center gap-3 border-t border-(--color-secondary-hover) pt-3 md:ml-auto md:border-0 md:pt-0">
                <p className="text-sm font-medium">{user.displayName}</p>
                <Button variant="secondary" className="min-h-11" onClick={() => signOut("You've signed out.")}>
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* tabIndex={-1} lets the skip link move focus here, not just scroll. */}
      <div id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </div>

      <footer className="border-t border-(--color-border) bg-(--color-surface)">
        <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-(--color-text-muted) sm:px-8">
          Demonstration product. All data is fictional.
          {IS_MOCK && " This build is running against a mock server (VITE_MOCK=true), so data changes are not saved."}
        </p>
      </footer>
    </div>
  );
}
