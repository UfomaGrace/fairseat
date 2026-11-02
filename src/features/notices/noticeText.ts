import type { Signup } from "../../api/types";
import { lagosDaysFromToday } from "../../lib/format";

export function matchSignupForNotice(eventId: string, signups: readonly Signup[]): Signup | undefined {
  return signups.find((signup) => signup.event.id === eventId);
}

/** Rounds up so an active offer never displays 0m while time remains. */
export function offerCountdownText(millisecondsLeft: number): string {
  const minutes = Math.max(0, Math.ceil(millisecondsLeft / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m left` : `${minutes}m left`;
}

export function offerEndsSoon(millisecondsLeft: number): boolean {
  return millisecondsLeft > 0 && millisecondsLeft < 3 * 60 * 60 * 1000;
}

export function relativeNoticeTime(createdAt: string, now: number): string {
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return createdAt;
  const minutesAgo = Math.floor(Math.max(0, now - created) / 60_000);
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  if (lagosDaysFromToday(createdAt, now) === -1) return "Yesterday";
  return "";
}
