// noticesSeen: which notices the person has already seen, for the copper dot on the header's bell.
//
//   const unseen = useHasUnseenNotices(user);   // header
//   markNoticesSeen(user.id, notices);          // Notices page, once they are on screen
//
// - The contract has no read/unread state, so "seen" is kept in this browser only: the newest
//   createdAt the person has had on their Notices page. Anything newer is unseen.
// - Stored per user in localStorage. Storage can be blocked (private windows), so every read and
//   write is wrapped; without it the dot shows whenever there are notices.
// - useSyncExternalStore keeps the header in step when the Notices page marks them seen.

import { useSyncExternalStore } from "react";
import type { Notice, User } from "../../api/types";
import { useListMyNoticesQuery } from "./noticesApi";

// Per browser, not per account: the contract has no read flag on notices, so there is nothing to sync.
const KEY_PREFIX = "fairseat.noticesSeenAt.";
const CHANGED = "fairseat:notices-seen";

function read(userId: string): number {
  try {
    const value = Number(window.localStorage.getItem(KEY_PREFIX + userId));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The newest createdAt among the notices, in ms (0 when there are none). */
export function newestNoticeTime(notices: readonly Notice[]): number {
  return notices.reduce((newest, notice) => Math.max(newest, Date.parse(notice.createdAt) || 0), 0);
}

export function hasUnseen(notices: readonly Notice[], seenAt: number): boolean {
  return newestNoticeTime(notices) > seenAt;
}

export function markNoticesSeen(userId: string, notices: readonly Notice[]): void {
  const newest = newestNoticeTime(notices);
  if (newest <= read(userId)) return;
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, String(newest));
  } catch {
    // Storage blocked: the dot just stays until it works.
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** True when the signed-in user has a notice newer than the last one they saw. */
export function useHasUnseenNotices(user: User | null): boolean {
  const { data } = useListMyNoticesQuery(undefined, { skip: !user });
  const seenAt = useSyncExternalStore(subscribe, () => (user ? read(user.id) : 0));
  return !!user && !!data && hasUnseen(data.items, seenAt);
}
