// safeReturnPath: validate an internal destination created by an in-app auth flow.
//
//   safeReturnPath("/me/events?tab=past") -> "/me/events?tab=past"
//   safeReturnPath("https://evil.example") -> null
//
// Only a path inside this app: starts with "/", not "//" or "/\" (which browsers treat as
// another site), resolves to this origin, and is never /login itself (that would loop).

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  let url: URL;
  try {
    url = new URL(value, "https://fairseat.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://fairseat.invalid") return null;
  if (url.pathname === "/login") return null;
  return url.pathname + url.search + url.hash;
}

export type LoginReturnState = {
  returnTo: string;
  expectedUserId: string | null;
};

/** Return state is created only by in-app auth guards, booking controls, and session expiry. */
export function loginReturnState(
  value: string | null | undefined,
  expectedUserId: string | null = null,
): LoginReturnState | null {
  const returnTo = safeReturnPath(value);
  return returnTo ? { returnTo, expectedUserId } : null;
}

/** Header sign-in and manual sign-out have no return state, so they always land on Discover. */
export function loginDestination(state: unknown, userId: string): string {
  if (
    typeof state !== "object" ||
    state === null ||
    !("returnTo" in state) ||
    !("expectedUserId" in state)
  ) {
    return "/events";
  }
  const { returnTo, expectedUserId } = state;
  if (typeof returnTo !== "string") return "/events";
  if (expectedUserId !== null && typeof expectedUserId !== "string") return "/events";
  if (typeof expectedUserId === "string" && expectedUserId !== userId) return "/events";
  return safeReturnPath(returnTo) ?? "/events";
}
