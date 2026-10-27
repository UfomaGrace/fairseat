// The Redux store: the auth slice plus the RTK Query cache (baseApi).
//
// Also, outside React:
// - saves the session to localStorage whenever it changes;
// - signs out when expiresAt passes (8 hours after sign-in, no refresh).

import { configureStore } from "@reduxjs/toolkit";
import { authReducer, saveSession } from "./authSlice";
import { baseApi, endSession } from "./baseApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  // The api middleware runs the fetches, cache lifetimes and tag invalidation.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleExpiry(expiresAt: string | null) {
  clearTimeout(expiryTimer);
  if (!expiresAt) return;
  const ms = Date.parse(expiresAt) - Date.now();
  // setTimeout can't wait longer than about 24.8 days.
  expiryTimer = setTimeout(
    () => endSession(store.dispatch, "Your session expired. Sign in again."),
    Math.max(0, Math.min(ms, 2 ** 31 - 1)),
  );
}

let lastAuth = store.getState().auth;
scheduleExpiry(lastAuth.expiresAt);

store.subscribe(() => {
  const auth = store.getState().auth;
  if (auth === lastAuth) return;
  if (auth.expiresAt !== lastAuth.expiresAt) scheduleExpiry(auth.expiresAt);
  lastAuth = auth;
  saveSession(auth);
});
