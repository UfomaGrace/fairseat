// RequireAuth: signed out → /login, remembering where the user was going.
//
//   <RequireAuth><MyEventsPage /></RequireAuth>
//
// The login page reads only this app-created state and validates it before returning.

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { loginReturnState } from "./returnPath";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={loginReturnState(`${location.pathname}${location.search}${location.hash}`)}
      />
    );
  }
  return <>{children}</>;
}
