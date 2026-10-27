import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../api/types";
import { authReducer, signedIn } from "./authSlice";
import { sessionApi } from "../features/auth/sessionApi";
import { eventsApi } from "../features/events/eventsApi";
import { noticesApi } from "../features/notices/noticesApi";
import { signupsApi } from "../features/signups/signupsApi";
import { baseApi } from "./baseApi";

const SESSION: Session = {
  token: "t0k3n",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  user: { id: "u1", email: "amaka.attendee@fairseat.demo", displayName: "Amaka", role: "ATTENDEE" },
};

const EVENT_ID = "e1";

function makeStore() {
  const store = configureStore({
    reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
  store.dispatch(signedIn(SESSION));
  return store;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = vi.fn<typeof fetch>();

/** How many GET /events/e1 calls were made. */
function eventFetches(): number {
  return fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith(`/events/${EVENT_ID}`) && init?.method === "GET")
    .length;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // apiFetch builds URLs against window.location.origin.
  vi.stubGlobal("window", { location: { origin: "http://localhost" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("baseApi", () => {
  it("refetches the event after a 409 on createSignup (invalidation runs on errors too)", async () => {
    fetchMock.mockImplementation(async (_url, init) => {
      if (init?.method === "POST") return json(409, { code: "EVENT_CANCELLED", message: "Cancelled.", requestId: "r1" });
      return json(200, { id: EVENT_ID });
    });
    const store = makeStore();
    const sub = store.dispatch(eventsApi.endpoints.getEvent.initiate(EVENT_ID));
    await sub;
    expect(eventFetches()).toBe(1);

    const result = await store.dispatch(signupsApi.endpoints.createSignup.initiate(EVENT_ID));
    expect(result.error).toEqual({ status: 409, data: { code: "EVENT_CANCELLED", message: "Cancelled.", requestId: "r1" } });

    await vi.waitFor(() => expect(eventFetches()).toBe(2));
    sub.unsubscribe();
  });

  it("signs out on a 401 for a token we sent", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "UNAUTHENTICATED", message: "Sign in.", requestId: "r2" }));
    const store = makeStore();

    await store.dispatch(noticesApi.endpoints.listMyNotices.initiate());

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer t0k3n");
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.notice).toMatch(/session has ended/);
  });

  it("does not sign out on a wrong password (createSession sends no token)", async () => {
    fetchMock.mockResolvedValue(json(401, { code: "INVALID_CREDENTIALS", message: "Wrong.", requestId: "r3" }));
    const store = makeStore();

    await store.dispatch(sessionApi.endpoints.createSession.initiate({ email: "a@b.co", password: "x" }));

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(store.getState().auth.token).toBe("t0k3n");
  });
});
