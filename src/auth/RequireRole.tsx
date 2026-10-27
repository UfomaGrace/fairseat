// RequireRole: shows the page only to the given roles. Use inside RequireAuth.
//
//   <RequireAuth>
//     <RequireRole roles={["ORGANISER", "ADMIN"]}><OrganiserEventsPage /></RequireRole>
//   </RequireAuth>
//
// A wrong role stays on the same address and sees "Not available for your role",
// with a way back to the events list. The service still checks (403 FORBIDDEN_ROLE);
// this only saves the user from a page that would fail.

import type { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router";
import type { Role } from "../api/types";
import { Button } from "../shared/ui/button";
import { ROLE_LABEL } from "./roles";
import { useAuth } from "./useAuth";

export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-16 text-center text-(--color-text)">
        <h1 className="text-2xl font-semibold tracking-tight">Not available for your role</h1>
        <p className="text-(--color-text-muted)">
          You're signed in as {user.displayName} ({ROLE_LABEL[user.role]}). This page is for:{" "}
          {roles.map((r) => ROLE_LABEL[r]).join(", ")}.
        </p>
        <Button className="mt-2 min-h-11" onClick={() => navigate("/events")}>
          Go to events
        </Button>
      </main>
    );
  }

  return <>{children}</>;
}
