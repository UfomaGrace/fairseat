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
import { loginPathForReturn } from "../auth/returnPath";
import { useAuth } from "../auth/useAuth";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";
import { Layout } from "../components/Layout";
import { useToast } from "../components/ui/toast";
import { SESSION_ENDED_NOTICE } from "../store/authSlice";
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
  const { notice } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (notice !== SESSION_ENDED_NOTICE) {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;
    toast({ variant: "info", title: SESSION_ENDED_NOTICE });
    if (location.pathname !== "/login") {
      navigate(loginPathForReturn(`${location.pathname}${location.search}${location.hash}`), { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate, notice, toast]);

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
