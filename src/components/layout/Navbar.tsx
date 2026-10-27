
import { Link, NavLink, useLocation } from "react-router";
import { ROLE_LABEL } from "../../auth/roles";
import { useAuth } from "../../auth/useAuth";

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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8"
      >
        <Link to="/events" className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F2928] text-white">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <path
                d="M5 4h14v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 12v3m10-3v3M5 20h14M8 15h8l2 5H6l2-5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-950">
            FairSeat
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? "text-teal-800"
                    : "text-slate-600 hover:text-slate-950"
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
            className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
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
              <p className="text-sm text-slate-600">
                <span className="font-medium text-slate-950">{user.displayName}</span> · {ROLE_LABEL[user.role]}
              </p>
              <button
                type="button"
                onClick={() => signOut("You've signed out.")}
                className="min-h-11 rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              // Come back to this page after signing in.
              state={{ from: location }}
              className="inline-flex min-h-11 items-center rounded-full bg-[#0F2928] px-5 text-sm font-semibold text-white transition hover:bg-[#17413F] focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
            >
              Sign in
            </Link>
          )}
        </div>

        <Link
          to="/events"
          aria-label="Open event discovery"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 md:hidden"
        >
          Events
        </Link>
      </nav>
    </header>
  );
}

export default Navbar;
