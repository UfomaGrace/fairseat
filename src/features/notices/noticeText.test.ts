import { describe, expect, it } from "vitest";
import type { Signup } from "../../api/types";
import { matchSignupForNotice, offerCountdownText, offerEndsSoon } from "./noticeText";

describe("notice text", () => {
  it("uses the current sign-up matched by eventId", () => {
    const first = { event: { id: "event-1" }, status: "GOING" } as Signup;
    const matching = { event: { id: "event-2" }, status: "OFFERED" } as Signup;

    expect(matchSignupForNotice("event-2", [first, matching])).toBe(matching);
    expect(matchSignupForNotice("event-3", [first, matching])).toBeUndefined();
  });

  it("formats offer time left in hours and minutes", () => {
    expect(offerCountdownText((23 * 60 + 41) * 60_000)).toBe("23h 41m left");
  });

  it("marks an offer under three hours as ending soon", () => {
    expect(offerEndsSoon(2 * 60 * 60 * 1000 + 59 * 60 * 1000)).toBe(true);
    expect(offerEndsSoon(3 * 60 * 60 * 1000)).toBe(false);
    expect(offerEndsSoon(0)).toBe(false);
  });
});
