// useEventFilters: an events list's filters and page, kept in the URL.
//
//   Public list:     const { filters, queryArgs, dateError, update, setOffset, clearFilters } = useEventFilters();
//                    useListEventsQuery(queryArgs, { skip: dateError !== null });
//   Organiser list:  const { filters, queryArgs, setToggle, setOffset } = useEventFilters({ organiserId });
//
// - URL → EventQuery: ?q=react&category=TECH&location=Yaba&from=2026-11-01&to=2026-11-30&offset=20
//   becomes { q, category, location, from, to, limit: 20, offset: 20 }. Empty or unknown values
//   are left out, so the API applies its own defaults.
// - Passing organiser options switches to the organiser list: only ?includePast=true,
//   ?includeCancelled=true and ?offset are read, plus organiserId (left out for admins, who see
//   every event). The public list ignores the two toggles, so /events?includePast=true changes nothing.
// - Any filter or toggle change drops ?offset, so the list starts again at page one.
// - dateError is set when a date isn't a real "YYYY-MM-DD" day or `to` is before `from`.
//   The page skips the query then: the service would only answer 400.

import { useSearchParams } from "react-router";
import type { Category, EventQuery } from "../../api/types";
import { isDateOnly } from "../../lib/format";
import { CATEGORY_LABELS, isKeyOf } from "../../lib/labels";

export const PAGE_SIZE = 20;
/** maxLength of q and location in the yaml. */
export const TEXT_MAX = 100;

const FILTER_PARAMS = ["q", "category", "location", "from", "to"] as const;
export type FilterParam = (typeof FILTER_PARAMS)[number];

const TOGGLE_PARAMS = ["includePast", "includeCancelled"] as const;
export type ToggleParam = (typeof TOGGLE_PARAMS)[number];

export type EventFilters = {
  q: string;
  category: Category | undefined;
  location: string;
  /** Raw from the URL, so a bad value can be shown with an error. */
  from: string;
  to: string;
  includePast: boolean;
  includeCancelled: boolean;
  offset: number;
};

/** The organiser list. organiserId is undefined for admins, so they get every event. */
export type OrganiserListOptions = { organiserId: string | undefined };

export type DateError = { field: "from" | "to"; message: string };

export function readEventFilters(params: URLSearchParams): EventFilters {
  const category = params.get("category");
  const offset = Number(params.get("offset"));
  return {
    q: (params.get("q") ?? "").trim(),
    category: isKeyOf(CATEGORY_LABELS, category) ? category : undefined,
    location: (params.get("location") ?? "").trim(),
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    includePast: params.get("includePast") === "true",
    includeCancelled: params.get("includeCancelled") === "true",
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

export function findDateError({ from, to }: EventFilters): DateError | null {
  if (from && !isDateOnly(from)) return { field: "from", message: "Enter a real date for From." };
  if (to && !isDateOnly(to)) return { field: "to", message: "Enter a real date for To." };
  // "YYYY-MM-DD" strings sort in date order, so a plain comparison works.
  if (from && to && to < from) return { field: "to", message: "To must be on or after From." };
  return null;
}

export function toEventQuery(filters: EventFilters, organiser?: OrganiserListOptions): EventQuery {
  const query: EventQuery = { limit: PAGE_SIZE, offset: filters.offset };
  if (organiser) {
    if (organiser.organiserId) query.organiserId = organiser.organiserId;
    if (filters.includePast) query.includePast = true;
    if (filters.includeCancelled) query.includeCancelled = true;
    return query;
  }
  if (filters.q) query.q = filters.q;
  if (filters.category) query.category = filters.category;
  if (filters.location) query.location = filters.location;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  return query;
}

export function useEventFilters(organiser?: OrganiserListOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readEventFilters(searchParams);
  const activeCount = [filters.q, filters.category, filters.location, filters.from, filters.to].filter(
    Boolean,
  ).length;

  /** Set or clear some filters ("" clears one) and go back to page one. */
  function update(changes: Partial<Record<FilterParam, string>>) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      for (const [name, value] of Object.entries(changes)) {
        if (value) params.set(name, value);
        else params.delete(name);
      }
      params.delete("offset");
      return params;
    });
  }

  /** Turn ?includePast / ?includeCancelled on or off and go back to page one. */
  function setToggle(name: ToggleParam, on: boolean) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (on) params.set(name, "true");
      else params.delete(name);
      params.delete("offset");
      return params;
    });
  }

  function setOffset(offset: number) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (offset > 0) params.set("offset", String(offset));
      else params.delete("offset");
      return params;
    });
  }

  function clearFilters() {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      for (const name of [...FILTER_PARAMS, ...TOGGLE_PARAMS, "offset"]) params.delete(name);
      return params;
    });
  }

  return {
    filters,
    queryArgs: toEventQuery(filters, organiser),
    dateError: organiser ? null : findDateError(filters),
    activeCount,
    update,
    setToggle,
    setOffset,
    clearFilters,
  };
}
