// safeReturnPath: where to send someone after sign-in, if the requested place is safe.
//
//   safeReturnPath("/me/events?tab=past")  → "/me/events?tab=past"
//   safeReturnPath("https://evil.example")  → null
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
