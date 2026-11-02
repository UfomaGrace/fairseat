import { useEffect, type ReactNode } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from "react-router";
import type { Role } from "../api/types";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";
import { Layout } from "../components/Layout";
import CreateEventPage from "../pages/CreateEventPage";
import EditEventPage from "../pages/EditEventPage";
import EventDetailPage from "../pages/EventDetailPage";
import EventsPage from "../pages/EventsPage";
import HowItWorksPage from "../pages/HowItWorksPage";
import LoginPage from "../pages/LoginPage";
import MyEventsPage from "../pages/MyEventsPage";
import NoticesPage from "../pages/NoticesPage";
import NotFoundPage from "../pages/NotFoundPage";
import OrganiserEventsPage from "../pages/OrganiserEventsPage";

const ATTENDEE_ROLES = ["ATTENDEE"] as const satisfies readonly Role[];
const ORGANISER_ROLES = ["ORGANISER", "ADMIN"] as const satisfies readonly Role[];

function Titled({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · FairSeat`;
  }, [title]);
  return <>{children}</>;
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
      <Route path="login" element={<Titled title="Sign in"><LoginPage /></Titled>} />

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
    </>,
  ),
);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
