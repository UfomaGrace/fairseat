// AppRoutes: every page, all inside Layout (header + footer).
//
// - Public: /events, /events/:eventId, /login
// - ATTENDEE: /me/…   ORGANISER/ADMIN: /organiser/…
//   Each guarded group is one parent route: RequireAuth + RequireRole wrap an <Outlet />,
//   and the child routes render into that Outlet.
// - <Titled> sets the browser tab title, e.g. "Events · FairSeat".

import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";
import type { Role } from "../api/types";
import { RequireAuth } from "../auth/RequireAuth";
import { RequireRole } from "../auth/RequireRole";
import { Layout } from "../components/Layout";
import CreateEventPage from "../pages/CreateEventPage";
import EditEventPage from "../pages/EditEventPage";
import EventDetailPage from "../pages/EventDetailPage";
import EventsPage from "../pages/EventsPage";
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

function Guarded({ roles }: { roles: readonly Role[] }) {
  return (
    <RequireAuth>
      <RequireRole roles={roles}>
        <Outlet />
      </RequireRole>
    </RequireAuth>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/events" replace />} />

        {/* Public */}
        <Route path="events" element={<Titled title="Events"><EventsPage /></Titled>} />
        <Route path="events/:eventId" element={<Titled title="Event details"><EventDetailPage /></Titled>} />
        <Route path="login" element={<Titled title="Sign in"><LoginPage /></Titled>} />

        {/* ATTENDEE */}
        <Route element={<Guarded roles={ATTENDEE_ROLES} />}>
          <Route path="me/events" element={<Titled title="My events"><MyEventsPage /></Titled>} />
          <Route path="me/notices" element={<Titled title="Notices"><NoticesPage /></Titled>} />
        </Route>

        {/* ORGANISER / ADMIN */}
        <Route element={<Guarded roles={ORGANISER_ROLES} />}>
          <Route
            path="organiser/events"
            element={<Titled title="My organised events"><OrganiserEventsPage /></Titled>}
          />
          <Route
            path="organiser/events/new"
            element={<Titled title="Create event"><CreateEventPage /></Titled>}
          />
          <Route
            path="organiser/events/:eventId/edit"
            element={<Titled title="Edit event"><EditEventPage /></Titled>}
          />
        </Route>

        <Route path="*" element={<Titled title="Page not found"><NotFoundPage /></Titled>} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
