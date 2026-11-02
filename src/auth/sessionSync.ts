import type { Session } from "../api/types";

export type SessionSyncChange = "signed-out" | "same-user" | "different-user";

export function sessionSyncChange(currentUserId: string | null, incoming: Session | null): SessionSyncChange {
  if (!incoming) return "signed-out";
  return incoming.user.id === currentUserId ? "same-user" : "different-user";
}
