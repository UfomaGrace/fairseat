import { describe, expect, it } from "vitest";
import type { Session } from "../api/types";
import { sessionSyncChange } from "./sessionSync";

const session = (userId: string): Session => ({
  token: "token",
  expiresAt: "2099-01-01T00:00:00.000Z",
  user: {
    id: userId,
    email: `${userId}@example.test`,
    displayName: userId,
    role: "ATTENDEE",
  },
});

describe("sessionSyncChange", () => {
  it("signs this tab out when the shared session is removed", () => {
    expect(sessionSyncChange("user-1", null)).toBe("signed-out");
  });

  it("updates credentials without treating the same account as an account switch", () => {
    expect(sessionSyncChange("user-1", session("user-1"))).toBe("same-user");
  });

  it("detects a new account in another tab, including signing in from a signed-out tab", () => {
    expect(sessionSyncChange("user-1", session("user-2"))).toBe("different-user");
    expect(sessionSyncChange(null, session("user-2"))).toBe("different-user");
  });

});
