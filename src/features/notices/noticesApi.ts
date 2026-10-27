// noticesApi: in-platform notices (seat offered, offer expired, event changed or cancelled).
import type { NoticeList } from "../../api/types";
import { baseApi } from "../../store/baseApi";

export const noticesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** GET /me/notices. Newest first, at most 50. */
    listMyNotices: build.query<NoticeList, void>({
      query: () => ({ path: "/me/notices" }),
      providesTags: ["Notice"],
    }),
  }),
});

export const { useListMyNoticesQuery } = noticesApi;
