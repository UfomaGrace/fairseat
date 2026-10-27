// RequireAuth: signed out → /login, remembering where the user was going.
//
//   <RequireAuth><MyEventsPage /></RequireAuth>
//
// The login page reads state.from and returns there after sign-in. This also covers
// being signed out mid-page (expiry or a 401): signing in again lands back on the same page.

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
