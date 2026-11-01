import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./returnPath";

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
});
