// authSlice: who is signed in. state.auth = { token, expiresAt, user, notice }.
//
//   dispatch(signedIn(session))              after POST /sessions
//   dispatch(signedOut("Your session expired.")) the reason is shown on the sign-in page
//
// - The session is kept in localStorage: loaded here when the store starts, saved by
//   store.ts whenever it changes.
// - The token lives 8 hours and can't be refreshed. A stored session that has expired is
//   dropped on load; store.ts signs out when expiresAt passes while the app is open.
// - notice is not saved: it only explains the last sign-out.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Session, User } from "../api/types";
import { isRole } from "../auth/roles";

const STORAGE_KEY = "fairseat.session";

export interface AuthState {
  token: string | null;
  expiresAt: string | null;
  user: User | null;
  /** Why the user was signed out, e.g. "Your session expired." */
  notice: string | null;
}

/** The part of the store this file knows about (avoids importing store.ts in a loop). */
export interface AuthRootState {
  auth: AuthState;
}

export function hasExpired(expiresAt: string): boolean {
  const time = Date.parse(expiresAt);
  return Number.isNaN(time) || time <= Date.now();
}

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
    "role" in value &&
    isRole(value.role)
  );
}

/** Storage can be edited by hand, so check its shape instead of trusting it. */
function isSession(value: unknown): value is Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "token" in value &&
    typeof value.token === "string" &&
    "expiresAt" in value &&
    typeof value.expiresAt === "string" &&
    "user" in value &&
    isUser(value.user)
  );
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed) || hasExpired(parsed.expiresAt)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    // No storage (private mode, tests) or bad JSON: start signed out.
    return null;
  }
}

export function saveSession(state: AuthState): void {
  try {
    if (state.token && state.expiresAt && state.user) {
      const session: Session = { token: state.token, expiresAt: state.expiresAt, user: state.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable. The session still lasts until reload.
  }
}

function initialAuthState(): AuthState {
  const session = loadSession();
  return {
    token: session?.token ?? null,
    expiresAt: session?.expiresAt ?? null,
    user: session?.user ?? null,
    notice: null,
  };
}

const authSlice = createSlice({
  name: "auth",
  // A function, so storage is read when the store is created.
  initialState: initialAuthState,
  reducers: {
    signedIn(state, action: PayloadAction<Session>) {
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt;
      state.user = action.payload.user;
      state.notice = null;
    },
    signedOut(state, action: PayloadAction<string | undefined>) {
      state.token = null;
      state.expiresAt = null;
      state.user = null;
      state.notice = action.payload ?? null;
    },
  },
});

export const { signedIn, signedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
