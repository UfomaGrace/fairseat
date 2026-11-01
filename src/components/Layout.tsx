// Layout: the frame around every page (skip link, header, footer). Used as a layout route:
//
//   <Route element={<Layout />}> ...pages... </Route>
//
// - Nav links depend on the role: visitor, ATTENDEE, or ORGANISER/ADMIN.
// - NavLink sets aria-current="page" on the active link; the styles hang off that.
// - Below md the links sit behind a Menu button. The menu remembers the page it was
//   opened on, so moving to another page (link, back button) closes it.
// - Pages render their own <main>, so the skip-link target here is a <div>.
// - Colours, fonts and the focus ring come from styles/tokens.css. Sign in is drawn as a black button.

import { Menu, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { IS_MOCK } from "../api/client";
import type { Role } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/ui/button";
import { cn } from "../lib/cn";
import { FairSeatLogo } from "./FairSeatLogo";

interface NavItem {
  to: string;
  label: string;
  /** Only active on this exact path, not on paths below it. */
  end?: boolean;
  /** Draw as a white button rather than a plain link (Sign in). */
  button?: boolean;
}

const VISITOR_NAV: readonly NavItem[] = [
  { to: "/events", label: "Events" },
  { to: "/login", label: "Sign in", button: true },
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
          "sr-only z-50 rounded-(--radius-md) bg-(--color-bg) px-4 py-3 font-semibold text-(--color-text)",
          "focus:not-sr-only focus:fixed focus:top-2 focus:left-2",
          focusRing,
        )}
      >
        Skip to main content
      </a>

      <header
        onKeyDown={handleKeyDown}
        className="border-b border-(--color-header-border) bg-(--color-bg) text-(--color-text)"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8 md:py-4">
          <Link to="/events" className={cn("flex min-h-11 items-center rounded-(--radius-sm)", focusRing)}>
            <FairSeatLogo size={28} withWordmark />
          </Link>

          <Button
            ref={menuButtonRef}
            variant="ghost"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpenOn(menuOpen ? null : location.pathname)}
            className="ml-auto min-h-11 md:hidden"
          >
            {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            Menu
          </Button>

          {/* Below md: hidden until Menu is pressed, then a full-width column. From md: always a row. */}
          <div
            id="site-menu"
            className={cn(
              "w-full flex-col gap-3 pb-3 md:ml-auto md:flex md:w-auto md:flex-row md:items-center md:pb-0",
              menuOpen ? "flex" : "hidden",
            )}
          >
            <nav aria-label="Main">
              <ul className="flex flex-col gap-2 md:flex-row md:items-center">
                {nav.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      // Sign in returns to the page the visitor was on.
                      state={item.to === "/login" ? { from: location } : undefined}
                      onClick={() => setMenuOpenOn(null)}
                      className={cn(
                        "flex min-h-11 items-center rounded-(--radius-md) px-4 font-semibold whitespace-nowrap",
                        item.button
                          ? "bg-(--color-primary) text-(--color-on-primary) hover:bg-(--color-primary-hover)"
                          : cn(
                              "text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)",
                              // Active: a filled grey pill in ink, so it isn't shown by colour alone.
                              "aria-[current=page]:bg-(--color-surface) aria-[current=page]:text-(--color-text)",
                            ),
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
              <div className="flex items-center gap-3 border-t border-(--color-header-border) pt-3 md:ml-auto md:border-0 md:pt-0">
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 sm:px-8">
          <FairSeatLogo size={22} withWordmark />
          <p className="text-sm text-(--color-text-muted)">
            Demonstration product. All data is fictional.
            {IS_MOCK && " This build is running against a mock server (VITE_MOCK=true), so data changes are not saved."}
          </p>
        </div>
      </footer>
    </div>
  );
}
