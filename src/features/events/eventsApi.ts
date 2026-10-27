// eventsApi: browsing events (public) and managing them (organisers and admins).
import type { EventCreate, EventPage, EventQuery, EventUpdate, FairEvent } from "../../api/types";
import { baseApi } from "../../store/baseApi";

const id = encodeURIComponent;

export const eventsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** GET /events. Public; paged with limit/offset. */
    listEvents: build.query<EventPage, EventQuery | void>({
      query: (query) => ({ path: "/events", query: query ?? undefined, auth: "optional" }),
      providesTags: (result) => [
        "EventList",
        ...(result?.items ?? []).map((event) => ({ type: "Event" as const, id: event.id })),
      ],
    }),

    /** POST /events. Organisers and admins only. */
    createEvent: build.mutation<FairEvent, EventCreate>({
      query: (body) => ({ path: "/events", method: "POST", body }),
      invalidatesTags: ["EventList"],
    }),

    /** GET /events/{eventId}. Public; `mySignup` is filled only when signed in. */
    getEvent: build.query<FairEvent, string>({
      query: (eventId) => ({ path: `/events/${id(eventId)}`, auth: "optional" }),
      providesTags: (_result, _error, eventId) => [{ type: "Event", id: eventId }],
    }),

    /** PATCH /events/{eventId}. Send only changed fields; 409 SEATS_BELOW_TAKEN when seats drop too low. */
    updateEvent: build.mutation<FairEvent, { eventId: string; body: EventUpdate }>({
      query: ({ eventId, body }) => ({ path: `/events/${id(eventId)}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { eventId }) => [{ type: "Event", id: eventId }, "EventList"],
    }),

    /** POST /events/{eventId}/cancellation. Safe to repeat. */
    cancelEvent: build.mutation<FairEvent, string>({
      query: (eventId) => ({ path: `/events/${id(eventId)}/cancellation`, method: "POST" }),
      invalidatesTags: (_result, _error, eventId) => [{ type: "Event", id: eventId }, "EventList"],
    }),
  }),
});

export const {
  useListEventsQuery,
  useCreateEventMutation,
  useGetEventQuery,
  useUpdateEventMutation,
  useCancelEventMutation,
} = eventsApi;
