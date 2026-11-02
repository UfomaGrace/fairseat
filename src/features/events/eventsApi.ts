// eventsApi: browsing events (public) and managing them (organisers and admins).
//
// - listEvents: one page at a time (the organiser list pages with Previous / Next).
// - listEventPages: the same GET /events as an infinite query, for "Show more events" on Discover.
//   The filters are the cache key; each page's offset is a page param. When "EventList" is
//   invalidated (e.g. after booking), RTK Query refetches every loaded page in order.
import type { EventCreate, EventPage, EventQuery, EventUpdate, FairEvent } from "../../api/types";
import { baseApi } from "../../store/baseApi";
import { nextEventsOffset } from "./discover";

const id = encodeURIComponent;

/** GET /events filters without the offset: listEventPages supplies that page by page. */
export type EventPagesQuery = Omit<EventQuery, "offset">;

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

    /**
     * GET /events, page after page. The next offset is where the last page ended; paging stops at
     * `total` or when a page adds no new event (nextEventsOffset), which hides "Show more events".
     */
    listEventPages: build.infiniteQuery<EventPage, EventPagesQuery, number>({
      infiniteQueryOptions: {
        initialPageParam: 0,
        getNextPageParam: nextEventsOffset,
      },
      query: ({ queryArg, pageParam }) => ({
        path: "/events",
        query: { ...queryArg, offset: pageParam },
        auth: "optional",
      }),
      providesTags: (result) => [
        "EventList",
        ...(result?.pages ?? []).flatMap((page) => page.items).map((event) => ({ type: "Event" as const, id: event.id })),
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
  useListEventPagesInfiniteQuery,
  useCreateEventMutation,
  useGetEventQuery,
  useUpdateEventMutation,
  useCancelEventMutation,
} = eventsApi;
