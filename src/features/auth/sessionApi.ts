// sessionApi: the calls made before sign-in.
import type { Health, Session, SessionRequest } from "../../api/types";
import { baseApi } from "../../store/baseApi";

export const sessionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** GET /actuator/health. Also wakes a sleeping free-tier service before the demo. */
    getHealth: build.query<Health, void>({
      query: () => ({ path: "/actuator/health", auth: "none", timeoutMs: 60_000 }),
    }),

    /** POST /sessions (sign in). 201 with { token, expiresAt, user }; 401 INVALID_CREDENTIALS. No refresh. */
    createSession: build.mutation<Session, SessionRequest>({
      query: (body) => ({ path: "/sessions", method: "POST", body, auth: "none" }),
    }),
  }),
});

export const { useGetHealthQuery, useCreateSessionMutation } = sessionApi;
