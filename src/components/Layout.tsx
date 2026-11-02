// Layout: the frame around every page (skip link, header, footer). Used as a layout route:
//
//   <Route element={<Layout />}> ...pages... </Route>
//
// - Header ("Site header component"): white, 68px, a hairline under it, three equal zones.
//   Logo left; nav centred (Discover, My events when signed in, How it works) as 40px pills, the
//   current page filled grey; right: the notices bell (copper dot when there are unseen notices)
//   and an avatar button that opens the account menu. Signed out: a black "Sign in".
// - Pills, bell and avatar are 40px to the eye; an invisible ::after stretches each to a 44px target.
// - Below 768px: logo left, a Menu button right that opens everything (nav, notices, account).
// - Both menus remember the page they were opened on, so moving to another page closes them.
//   Escape closes them and returns focus to their button; a click outside closes the account menu.
// - NavLink sets aria-current="page" on the active link; the styles hang off that.
// - Pages render their own <main>, so the skip-link target here is a <div>.
// - No keyword search in the header. Discover still reads ?q= from the URL, but has no field for it yet.

import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { IS_MOCK } from "../api/client";
import type { Role, User } from "../api/types";
import { ROLE_LABEL } from "../auth/roles";
import { useAuth } from "../auth/useAuth";
import { useHasUnseenNotices } from "../features/notices/noticesSeen";
import { cn } from "../lib/cn";
import { Avatar } from "./avatar/Avatar";
import { FairSeatLogo } from "./FairSeatLogo";

interface NavItem {
  to: string;
  label: string;
  /** Only active on this exact path, not on paths below it. */
  end?: boolean;
}

const DISCOVER: NavItem = { to: "/events", label: "Discover" };
const HOW_IT_WORKS: NavItem = { to: "/how-it-works", label: "How it works" };

// Record<Role, …> makes TypeScript complain if a new role is added without its pages.
const MY_EVENTS: Record<Role, NavItem> = {
  ATTENDEE: { to: "/me/events", label: "My events" },
  ORGANISER: { to: "/organiser/events", label: "My events", end: true },
  ADMIN: { to: "/organiser/events", label: "My events", end: true },
};

/** The account menu's links, under the name. Sign out is added after them. */
const NOTICES: NavItem = { to: "/me/notices", label: "Notices" };
const CREATE_EVENT: NavItem = { to: "/organiser/events/new", label: "Create event" };

const ACCOUNT_LINKS: Record<Role, readonly NavItem[]> = {
  ATTENDEE: [NOTICES],
  ORGANISER: [NOTICES, CREATE_EVENT],
  ADMIN: [NOTICES, CREATE_EVENT],
};

function navFor(user: User | null): NavItem[] {
  return user ? [DISCOVER, MY_EVENTS[user.role], HOW_IT_WORKS] : [DISCOVER, HOW_IT_WORKS];
}

const focusRing =
  "focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-(--color-focus) focus-visible:outline-solid";

/** A 40px control with a 44px target. */
const target44 = "relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']";

const pillClass = cn(
  "flex h-10 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap",
  "text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-text)",
  // Active: a filled grey pill in ink, so it isn't shown by colour alone.
  "aria-[current=page]:bg-(--color-surface) aria-[current=page]:text-(--color-text)",
  target44,
  focusRing,
);

const menuRowClass = cn(
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-(--radius-md) px-3 text-left text-sm font-medium",
  "text-(--color-text) hover:bg-(--color-surface) aria-[current=page]:bg-(--color-surface)",
  focusRing,
);

function NewDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("size-2 rounded-full bg-(--color-copper)", className)} />;
}

export function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const unseen = useHasUnseenNotices(user);

  // The path each menu was opened on. Any other path means it's closed.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [accountOpenOn, setAccountOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === location.pathname;
  const accountOpen = accountOpenOn === location.pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const nav = navFor(user);

  // A click (or tap) outside the account menu closes it.
  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountOpenOn(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    if (accountOpen) {
      setAccountOpenOn(null);
      accountButtonRef.current?.focus();
    } else if (menuOpen) {
      setMenuOpenOn(null);
      menuButtonRef.current?.focus();
    }
  }

  function closeMenus() {
    setMenuOpenOn(null);
    setAccountOpenOn(null);
  }

  const signInLink = (className: string) => (
    <NavLink
      to="/login"
      // Sign in returns to the page the visitor was on.
      state={{ from: location }}
      onClick={closeMenus}
      className={cn(
        "flex items-center justify-center rounded-full bg-(--color-primary) px-5 text-sm font-semibold whitespace-nowrap",
        "text-(--color-on-primary) hover:bg-(--color-primary-hover)",
        focusRing,
        className,
      )}
    >
      Sign in
    </NavLink>
  );

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
        <div className="mx-auto grid h-[68px] max-w-7xl grid-cols-[1fr_auto] items-center gap-x-4 px-4 sm:px-8 md:grid-cols-3">
          <Link
            to="/events"
            onClick={closeMenus}
            className={cn("flex min-h-11 items-center justify-self-start rounded-(--radius-sm)", focusRing)}
          >
            <FairSeatLogo size={24} withWordmark />
          </Link>

          <nav aria-label="Main" className="hidden justify-self-center md:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={pillClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* ≥768px: bell and account, or Sign in. */}
          <div className="hidden items-center gap-2 justify-self-end md:flex">
            {user ? (
              <>
                <Link
                    to="/me/notices"
                    aria-label={unseen ? "Notices, new notices" : "Notices"}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border border-(--color-border)",
                      "text-(--color-text) hover:bg-(--color-surface)",
                      target44,
                      focusRing,
                    )}
                  >
                    <Bell aria-hidden="true" className="size-[18px]" />
                    {unseen && <NewDot className="absolute top-2 right-2.5 ring-2 ring-(--color-bg)" />}
                  </Link>

                <div ref={accountRef} className="relative">
                  <button
                    ref={accountButtonRef}
                    type="button"
                    aria-label={`Account: ${user.displayName}`}
                    aria-expanded={accountOpen}
                    aria-controls="account-menu"
                    onClick={() => setAccountOpenOn(accountOpen ? null : location.pathname)}
                    className={cn(
                      "flex h-10 items-center gap-1 rounded-full py-1 pr-2 pl-1 hover:bg-(--color-surface)",
                      target44,
                      focusRing,
                    )}
                  >
                    <Avatar id={user.id} name={user.displayName} size={32} decorative />
                    <ChevronDown
                      aria-hidden="true"
                      className={cn("size-4 text-(--color-text-muted) transition-transform motion-reduce:transition-none", accountOpen && "rotate-180")}
                    />
                  </button>

                  <div
                    id="account-menu"
                    className={cn(
                      "absolute top-full right-0 z-50 mt-2 w-64 flex-col rounded-xl border border-(--color-border) bg-(--color-bg) p-2 shadow-(--shadow-panel)",
                      accountOpen ? "flex" : "hidden",
                    )}
                  >
                    <div className="px-3 pt-2 pb-3">
                      <p className="truncate text-sm font-semibold">{user.displayName}</p>
                      <p className="truncate text-xs text-(--color-text-muted)">
                        {ROLE_LABEL[user.role]} · {user.email}
                      </p>
                    </div>
                    <ul className="flex flex-col border-t border-(--color-border) pt-2">
                      {ACCOUNT_LINKS[user.role].map((item) => (
                        <li key={item.to}>
                          <NavLink to={item.to} end onClick={closeMenus} className={menuRowClass}>
                            {item.label}
                            {item.to === "/me/notices" && unseen && <NewDot />}
                          </NavLink>
                        </li>
                      ))}
                      <li>
                        <button type="button" className={menuRowClass} onClick={() => signOut("You've signed out.")}>
                          Sign out
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              signInLink("h-10")
            )}
          </div>

          {/* <768px: one Menu button. */}
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpenOn(menuOpen ? null : location.pathname)}
            className={cn(
              "relative flex min-h-11 items-center gap-2 justify-self-end rounded-full px-3 text-sm font-medium hover:bg-(--color-surface) md:hidden",
              focusRing,
            )}
          >
            {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            Menu
            {unseen && !menuOpen && <NewDot className="absolute top-2 right-2" />}
          </button>
        </div>

        <div
          id="site-menu"
          className={cn("mx-auto max-w-7xl flex-col gap-3 px-4 pb-4 sm:px-8 md:hidden", menuOpen ? "flex" : "hidden")}
        >
          <nav aria-label="Main">
            <ul className="flex flex-col gap-1">
              {nav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={closeMenus} className={menuRowClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          {user ? (
            <div className="flex flex-col gap-1 border-t border-(--color-header-border) pt-3">
              <div className="flex items-center gap-3 px-3 pb-2">
                <Avatar id={user.id} name={user.displayName} size={32} decorative />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.displayName}</p>
                  <p className="text-xs text-(--color-text-muted)">{ROLE_LABEL[user.role]}</p>
                </div>
              </div>
              <ul className="flex flex-col gap-1">
                {ACCOUNT_LINKS[user.role].map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end onClick={closeMenus} className={menuRowClass}>
                      {item.label}
                      {item.to === "/me/notices" && unseen && (
                        <span className="flex items-center gap-1.5 text-xs text-(--color-copper)">
                          <NewDot /> New
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <button type="button" className={menuRowClass} onClick={() => signOut("You've signed out.")}>
                    Sign out
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            signInLink("min-h-11")
          )}
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
