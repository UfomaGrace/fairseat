import { describe, expect, it } from "vitest";
import { loginDestination, loginReturnState, safeReturnPath } from "./returnPath";

describe("safeReturnPath", () => {
  it("keeps an internal path with its query and hash", () => {
    expect(safeReturnPath("/me/events?tab=past#top")).toBe("/me/events?tab=past#top");
  });

  it.each([null, undefined, "", "events", "https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"])(
    "rejects %s",
    (value) => {
      expect(safeReturnPath(value)).toBeNull();
    },
  );

  it("never returns to the sign-in page", () => {
    expect(safeReturnPath("/login")).toBeNull();
    expect(safeReturnPath("/login?returnTo=/events")).toBeNull();
  });

  it("uses only an app-created return state, and only for the same account", () => {
    const state = loginReturnState("/events?category=TECH", "user-1");
    expect(loginDestination(state, "user-1")).toBe("/events?category=TECH");
    expect(loginDestination(state, "user-2")).toBe("/events");
    expect(loginDestination({ returnTo: "/me/events", expectedUserId: null }, "user-2")).toBe("/me/events");
    expect(loginDestination({ returnTo: "/\\evil.example", expectedUserId: null }, "user-2")).toBe("/events");
  });

  it("ignores query-string returns and unrelated navigation state", () => {
    expect(loginDestination(null, "user-1")).toBe("/events");
    expect(loginDestination({ from: { pathname: "/me/events" } }, "user-1")).toBe("/events");
    expect(loginDestination({ returnTo: "/me/events", expectedUserId: "user-2" }, "user-1")).toBe("/events");
  });

  it.each(["ATTENDEE", "ORGANISER", "ADMIN"])(
    "lands header sign-in on Discover for %s",
    (role) => {
      expect(loginDestination(null, role)).toBe("/events");
    },
  );
});
