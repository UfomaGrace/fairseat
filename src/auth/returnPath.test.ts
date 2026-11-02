import { describe, expect, it } from "vitest";
import { loginPathForReturn, safeReturnPath } from "./returnPath";

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

  it("builds a sign-in URL that keeps a safe return path", () => {
    expect(loginPathForReturn("/me/events?tab=past#top")).toBe(
      "/login?returnTo=%2Fme%2Fevents%3Ftab%3Dpast%23top",
    );
    expect(loginPathForReturn("https://evil.example")).toBe("/login");
  });
});
