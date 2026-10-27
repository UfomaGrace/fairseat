// baseApi: the one RTK Query api. It has no endpoints of its own; each feature adds its
// operations from contract/openapi.yaml with injectEndpoints, named by operationId:
//
//   features/auth/sessionApi.ts      getHealth, createSession
//   features/events/eventsApi.ts     listEvents, createEvent, getEvent, updateEvent, cancelEvent
//   features/signups/signupsApi.ts   createSignup, cancelSignup, acceptOffer, listMySignups
//   features/notices/noticesApi.ts   listMyNotices
//
// - The baseQuery wraps apiFetch: it adds the token from the store and returns errors as plain
//   data. It never throws, so invalidatesTags also runs on errors: after a 409 the screens
//   refetch and show what the server decided.
// - No optimistic updates: the server decides who gets a seat.
// - Add nothing that is not in the yaml.

import type { Dispatch } from "@reduxjs/toolkit";
import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { apiFetch, toApiError, type ApiErrorResult, type RequestOptions } from "../api/client";
import { hasExpired, signedOut, type AuthRootState } from "./authSlice";

/** What each endpoint's query() returns: a path plus apiFetch options (auth defaults to 'required'). */
export interface FairseatArgs extends Omit<RequestOptions, "signal" | "token"> {
  path: string;
}

/** Sign out and drop every cached response, so the next user never sees the last one's data. */
export function endSession(dispatch: Dispatch, reason?: string): void {
  dispatch(signedOut(reason));
  dispatch(baseApi.util.resetApiState());
}

const fairseatBaseQuery: BaseQueryFn<FairseatArgs, unknown, ApiErrorResult> = async (
  { path, ...opts },
  { getState, dispatch, signal },
) => {
  // RTK Query types getState() as unknown; our store always has the auth slice.
  const { auth } = getState() as AuthRootState;
  let token = auth.token;
  // The expiry timer in store.ts can run late (e.g. a sleeping laptop), so check here too.
  if (token && auth.expiresAt && hasExpired(auth.expiresAt)) {
    endSession(dispatch, "Your session expired. Sign in again.");
    token = null;
  }

  try {
    const res = await apiFetch<unknown>(path, { ...opts, token, signal });
    return { data: res.data };
  } catch (e) {
    const error = toApiError(e);
    // Only a token we sent can have been rejected; a wrong password (INVALID_CREDENTIALS) is not this.
    if (error.code === "UNAUTHENTICATED" && token && opts.auth !== "none") {
      endSession(dispatch, "Your session has ended. Sign in again to continue.");
    }
    const { status, code, message, requestId, details } = error;
    return {
      error: {
        status,
        data: Object.keys(details).length > 0 ? { code, message, requestId, details } : { code, message, requestId },
      },
    };
  }
};

export const baseApi = createApi({
  reducerPath: "fairseatApi",
  baseQuery: fairseatBaseQuery,
  tagTypes: ["Event", "EventList", "MySignup", "Notice"],
  endpoints: () => ({}),
});
