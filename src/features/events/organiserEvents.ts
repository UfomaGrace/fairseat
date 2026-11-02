// organiserEvents: the organiser's other events for "More from <first name>".
// GET /events?organiserId=<id>&limit=4; this event is dropped and the first three kept.
import type { FairEvent } from "../../api/types";
import { useListEventsQuery } from "./eventsApi";

const SHOWN = 3;

export function useMoreFromOrganiser(event: FairEvent | undefined): FairEvent[] {
  const { data } = useListEventsQuery(event ? { organiserId: event.organiser.id, limit: SHOWN + 1 } : undefined, {
    skip: !event,
  });
  if (!event || !data) return [];
  return data.items.filter((other) => other.id !== event.id).slice(0, SHOWN);
}

/** "Tolu Adebayo" → "Tolu". */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}
