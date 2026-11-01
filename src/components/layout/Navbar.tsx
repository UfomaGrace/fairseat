
import { Link, NavLink, useLocation } from "react-router";
import { ROLE_LABEL } from "../../auth/roles";
import { useAuth } from "../../auth/useAuth";
import { FairSeatLogo } from "../FairSeatLogo";

const navItems = [
  { label: "Discover", to: "/events" },
  { label: "My Seats", to: "/my-seats" },
  { label: "Waitlist", to: "/waitlist" },
  { label: "Upcoming Events", to: "/upcoming-events" },
];

function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-(--color-header-border) bg-(--color-bg)">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8"
      >
        <Link to="/events" className="flex min-h-11 shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--color-focus)">
          <FairSeatLogo size={28} withWordmark />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center rounded-sm text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--color-focus) aria-[current=page]:underline aria-[current=page]:decoration-(--color-copper) aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8 ${
                  isActive
                    ? "text-(--color-text)"
                    : "text-(--color-text-muted) hover:text-(--color-text)"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="inline-flex size-11 items-center justify-center rounded-full text-(--color-text-muted) transition hover:bg-(--color-surface) hover:text-(--color-text) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--color-focus)"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-5 w-5"
            >
              <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {user ? (
            <>
              <p className="text-sm text-(--color-text-muted)">
                <span className="font-medium text-(--color-text)">{user.displayName}</span> · {ROLE_LABEL[user.role]}
              </p>
              <button
                type="button"
                onClick={() => signOut("You've signed out.")}
                className="min-h-11 rounded-full border border-(--color-border-input) px-5 text-sm font-semibold text-(--color-text) transition hover:bg-(--color-surface) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--color-focus)"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              // Come back to this page after signing in.
              state={{ from: location }}
              className="inline-flex min-h-11 items-center rounded-full bg-(--color-primary) px-5 text-sm font-semibold text-(--color-on-primary) transition hover:bg-(--color-primary-hover) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--color-focus)"
            >
              Sign in
            </Link>
          )}
        </div>

        <Link
          to="/events"
          aria-label="Open event discovery"
          className="inline-flex min-h-11 items-center rounded-lg border border-(--color-border) px-3 text-sm font-medium text-(--color-text) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--color-focus) md:hidden"
        >
          Events
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;
