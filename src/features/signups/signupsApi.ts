// signupsApi: an attendee's seats. Every change here refreshes the event, the lists, my sign-ups
// and my notices, also when it fails (e.g. 409), so the screen shows what the server decided.
//
// Every change also writes the returned sign-up into the cached event (createSignup into the
// Discover lists too) as soon as the server answers, so the screen changes at once instead of
// after the refetch. Only the server's answer is written (no optimistic update); the refetch then
// brings the new seat counts.
import type { MySignupsQuery, Signup, SignupList } from "../../api/types";
import { baseApi } from "../../store/baseApi";
import { eventsApi } from "../events/eventsApi";

const id = encodeURIComponent;

/** What a sign-up change can affect: the event's seat counts, the lists, my sign-ups, my notices. */
function signupChanged(eventId: string) {
  return [{ type: "Event", id: eventId }, "EventList", "MySignup", "Notice"] as const;
}

export const signupsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** POST /events/{eventId}/signups. 201 new (GOING or WAITING), 200 when already signed up. */
    createSignup: build.mutation<Signup, string>({
      query: (eventId) => ({ path: `/events/${id(eventId)}/signups`, method: "POST", mockPreferCode: 201 }),
      invalidatesTags: (_result, _error, eventId) => signupChanged(eventId),
      async onQueryStarted(eventId, { dispatch, getState, queryFulfilled }) {
        let signup: Signup;
        try {
          signup = (await queryFulfilled).data;
        } catch {
          return; // The refetch from invalidatesTags shows the true state.
        }
        for (const args of eventsApi.util.selectCachedArgsForQuery(getState(), "listEventPages")) {
          dispatch(
            eventsApi.util.updateQueryData("listEventPages", args, (draft) => {
              for (const event of draft.pages.flatMap((page) => page.items)) {
                if (event.id === eventId) event.mySignup = signup;
              }
            }),
          );
        }
        dispatch(
          eventsApi.util.updateQueryData("getEvent", eventId, (draft) => {
            draft.mySignup = signup;
          }),
        );
      },
    }),

    /** POST /signups/{signupId}/cancellation. Safe to repeat. eventId is only for refreshing that event. */
    cancelSignup: build.mutation<Signup, { signupId: string; eventId: string }>({
      query: ({ signupId }) => ({ path: `/signups/${id(signupId)}/cancellation`, method: "POST" }),
      invalidatesTags: (_result, _error, { eventId }) => signupChanged(eventId),
      async onQueryStarted({ eventId }, { dispatch, queryFulfilled }) {
        try {
          const { data: signup } = await queryFulfilled;
          dispatch(
            eventsApi.util.updateQueryData("getEvent", eventId, (draft) => {
              draft.mySignup = signup;
            }),
          );
        } catch {
          // The refetch from invalidatesTags shows the true state.
        }
      },
    }),

    /** POST /signups/{signupId}/acceptance. 409 OFFER_EXPIRED once the 24-hour window has passed. */
    acceptOffer: build.mutation<Signup, { signupId: string; eventId: string }>({
      query: ({ signupId }) => ({ path: `/signups/${id(signupId)}/acceptance`, method: "POST" }),
      invalidatesTags: (_result, _error, { eventId }) => signupChanged(eventId),
      async onQueryStarted({ eventId }, { dispatch, queryFulfilled }) {
        try {
          const { data: signup } = await queryFulfilled;
          dispatch(
            eventsApi.util.updateQueryData("getEvent", eventId, (draft) => {
              draft.mySignup = signup;
            }),
          );
        } catch {
          // The refetch from invalidatesTags shows the true state.
        }
      },
    }),

    /** GET /me/signups. scope: upcoming (default), past or all. */
    listMySignups: build.query<SignupList, MySignupsQuery | void>({
      query: (query) => ({ path: "/me/signups", query: query ?? undefined }),
      providesTags: ["MySignup"],
    }),
  }),
});

export const {
  useCreateSignupMutation,
  useCancelSignupMutation,
  useAcceptOfferMutation,
  useListMySignupsQuery,
} = signupsApi;
