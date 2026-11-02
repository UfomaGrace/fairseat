import type { FairEvent, EventQuery } from "../../api/types";

export type OrganiserTab = "upcoming" | "past" | "cancelled";

const DAY_MS = 24 * 60 * 60 * 1000;

export function readOrganiserTab(search: string): OrganiserTab {
  const tab = new URLSearchParams(search).get("tab");
  return tab === "past" || tab === "cancelled" ? tab : "upcoming";
}

export function organiserQuery(organiserId: string, tab: OrganiserTab): Omit<EventQuery, "offset"> {
  return {
    organiserId,
    limit: 20,
    ...(tab === "past" ? { includePast: true } : {}),
    ...(tab === "cancelled" ? { includePast: true, includeCancelled: true } : {}),
  };
}

export function eventsForTab(events: FairEvent[], tab: OrganiserTab, now: number): FairEvent[] {
  if (tab === "past") {
    return events.filter((event) => event.status === "SCHEDULED" && Date.parse(event.endsAt) < now);
  }
  if (tab === "cancelled") return events.filter((event) => event.status === "CANCELLED");
  return events.filter((event) => event.status === "SCHEDULED" && Date.parse(event.endsAt) >= now);
}

export type AttentionItem =
  | { kind: "waiting"; event: FairEvent }
  | { kind: "no-signups"; event: FairEvent; daysAway: number };

export function attentionItems(events: FairEvent[], now: number): AttentionItem[] {
  const waiting = events
    .filter((event) => event.status === "SCHEDULED" && event.waitingCount > 0)
    .sort((a, b) => b.waitingCount - a.waitingCount || Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((event): AttentionItem => ({ kind: "waiting", event }));

  const noSignups = events
    .filter(
      (event) =>
        event.status === "SCHEDULED" &&
        event.seatsTaken === 0 &&
        Date.parse(event.startsAt) - now > 2 * DAY_MS,
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((event): AttentionItem => ({
      kind: "no-signups",
      event,
      daysAway: Math.ceil((Date.parse(event.startsAt) - now) / DAY_MS),
    }));

  return [...waiting, ...noSignups].slice(0, 2);
}

export type SeatChip = {
  label: string;
  tone: "ink" | "copper" | "outline" | "neutral";
};

export function eventSeatChip(event: FairEvent, tab: OrganiserTab): SeatChip {
  if (tab === "cancelled" || event.status === "CANCELLED") return { label: "Cancelled", tone: "neutral" };
  if (tab === "past") return { label: "Ended", tone: "neutral" };
  if (event.seatsAvailable === 0) {
    return { label: `Full · ${event.waitingCount} in line`, tone: "ink" };
  }
  if (event.seatsAvailable <= 5) return { label: `${event.seatsAvailable} seats left`, tone: "copper" };
  if (event.seatsTaken === 0) return { label: "No sign-ups yet", tone: "outline" };
  return { label: `${event.seatsAvailable} seats left`, tone: "neutral" };
}
