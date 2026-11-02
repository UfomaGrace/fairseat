import { lazy, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router";
import type { Role } from "../api/types";
import { loginReturnState } from "../auth/returnPath";
import { sessionSyncChange } from "../auth/sessionSync";
import { useAuth } from "../auth/useAuth";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";
import { Layout } from "../components/Layout";
import { useFairSeatToast } from "../lib/useFairSeatToast";
import { clearTabUser, hasExpired, parseSession, rememberTabUser, SESSION_ENDED_NOTICE, STORAGE_KEY, TAB_USER_KEY } from "../store/authSlice";
import EventsPage from "../pages/EventsPage";
import { RouteChunkLoadError } from "./RouteChunkLoadError";
import { RouteContent } from "./RouteContent";

function lazyRoutePage<T extends { default: ComponentType }>(load: () => Promise<T>) {
  return lazy(() =>
    load().catch((error: unknown) => {
      throw new RouteChunkLoadError(error);
    }),
  );
}

const CreateEventPage = lazyRoutePage(() => import("../pages/CreateEventPage"));
const EditEventPage = lazyRoutePage(() => import("../pages/EditEventPage"));
const EventDetailPage = lazyRoutePage(() => import("../pages/EventDetailPage"));
const HowItWorksPage = lazyRoutePage(() => import("../pages/HowItWorksPage"));
const LoginPage = lazyRoutePage(() => import("../pages/LoginPage"));
const MyEventsPage = lazyRoutePage(() => import("../pages/MyEventsPage"));
const NoticesPage = lazyRoutePage(() => import("../pages/NoticesPage"));
const NotFoundPage = lazyRoutePage(() => import("../pages/NotFoundPage"));
const OrganiserEventsPage = lazyRoutePage(() => import("../pages/OrganiserEventsPage"));

const ATTENDEE_ROLES = ["ATTENDEE"] as const satisfies readonly Role[];
const ORGANISER_ROLES = ["ORGANISER", "ADMIN"] as const satisfies readonly Role[];

function Titled({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · FairSeat`;
  }, [title]);
  return <>{children}</>;
}

function SessionEndHandler() {
  const { notice, signedOutUserId, user, signIn, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useFairSeatToast();
  const handled = useRef(false);
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname;
      let frame = 0;
      const focusHeading = () => {
        const heading = document.querySelector<HTMLElement>("main h1");
        if (!heading) return false;
        heading.tabIndex = -1;
        heading.focus();
        return true;
      };
      const observer = new MutationObserver(() => {
        if (focusHeading()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      frame = window.requestAnimationFrame(() => {
        if (focusHeading()) observer.disconnect();
      });
      return () => {
        observer.disconnect();
        window.cancelAnimationFrame(frame);
      };
    }
    return undefined;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    let previousUserId: string | null = null;
    try {
      previousUserId = sessionStorage.getItem(TAB_USER_KEY);
    } catch {
      // The per-tab hint is best-effort; localStorage remains the source of the session.
    }
    rememberTabUser(user.id);
    if (previousUserId && previousUserId !== user.id) {
      toast({ variant: "info", title: `You're now signed in as ${user.displayName}.` });
      navigate("/events", { replace: true });
    }
  }, [navigate, toast, user]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;

      const session = event.newValue ? parseSession(event.newValue) : null;
      const change = session && !hasExpired(session.expiresAt)
        ? sessionSyncChange(user?.id ?? null, session)
        : "signed-out";

      if (change === "signed-out") {
        if (user) {
          clearTabUser();
          signOut("You've signed out in another tab.");
          navigate("/login", { replace: true, state: null });
        }
        return;
      }

      if (!session) return;
      rememberTabUser(session.user.id);
      signIn(session);
      if (change === "different-user") {
        navigate("/events", { replace: true });
        toast({ variant: "info", title: `You're now signed in as ${session.user.displayName}.` });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [navigate, signIn, signOut, toast, user]);

  useEffect(() => {
    if (notice !== SESSION_ENDED_NOTICE) {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;
    toast({ variant: "info", title: SESSION_ENDED_NOTICE });
    if (location.pathname !== "/login") {
      navigate("/login", {
        replace: true,
        state: loginReturnState(
          `${location.pathname}${location.search}${location.hash}`,
          signedOutUserId,
        ),
      });
    }
  }, [location.hash, location.pathname, location.search, navigate, notice, signedOutUserId, toast]);

  return <Outlet />;
}

function Guarded({ roles, redirectTo }: { roles: readonly Role[]; redirectTo?: string }) {
  return (
    <RequireAuth>
      <RequireRole roles={roles} redirectTo={redirectTo}>
        <Outlet />
      </RequireRole>
    </RequireAuth>
  );
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route element={<SessionEndHandler />}>
        <Route
          path="login"
          element={
            <RouteContent>
              <Titled title="Sign in"><LoginPage /></Titled>
            </RouteContent>
          }
        />

        <Route element={<Layout />}>
          <Route index element={<Navigate to="/events" replace />} />

          <Route path="events" element={<Titled title="Discover"><EventsPage /></Titled>} />
          <Route path="events/:eventId" element={<Titled title="Event details"><EventDetailPage /></Titled>} />
          <Route path="how-it-works" element={<Titled title="How it works"><HowItWorksPage /></Titled>} />

          <Route
            path="me/notices"
            element={
              <RequireAuth>
                <Titled title="Notices"><NoticesPage /></Titled>
              </RequireAuth>
            }
          />

          <Route element={<Guarded roles={ATTENDEE_ROLES} />}>
            <Route path="me/events" element={<Titled title="My events"><MyEventsPage /></Titled>} />
          </Route>

          <Route element={<Guarded roles={ORGANISER_ROLES} redirectTo="/events" />}>
            <Route path="organiser/events" element={<Titled title="Your events"><OrganiserEventsPage /></Titled>} />
          </Route>

          <Route element={<Guarded roles={ORGANISER_ROLES} />}>
            <Route path="organiser/events/new" element={<Titled title="Create event"><CreateEventPage /></Titled>} />
            <Route
              path="organiser/events/:eventId/edit"
              element={<Titled title="Edit event"><EditEventPage /></Titled>}
            />
          </Route>

          <Route path="*" element={<Titled title="Page not found"><NotFoundPage /></Titled>} />
        </Route>
      </Route>
    </>,
  ),
);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
