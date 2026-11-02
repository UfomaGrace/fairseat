import { describe, expect, it, vi } from "vitest";
import type { Signup } from "../../api/types";
import { bookedToast } from "./bookedToast";

function signup(status: Signup["status"], waitingPosition: number | null): Signup {
  return {
    id: "signup-1",
    event: {
      id: "event-1",
      title: "Lagos Meetup",
      location: "Lagos",
      startsAt: "2026-11-10T10:00:00Z",
      endsAt: "2026-11-10T12:00:00Z",
      status: "SCHEDULED",
    },
    status,
    waitingPosition,
    offerExpiresAt: null,
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    asOf: "2026-11-01T10:00:00Z",
  };
}

describe("bookedToast", () => {
  it("points a confirmed booking to My events", () => {
    const onView = vi.fn();
    const toast = bookedToast(signup("GOING", null), onView);

    expect(toast.title).toBe("You're going. It's in My events.");
    expect(toast.action?.label).toBe("View");
    toast.action?.onClick();
    expect(onView).toHaveBeenCalledOnce();
  });

  it("includes the waiting-line position and My events action", () => {
    const onView = vi.fn();
    const toast = bookedToast(signup("WAITING", 3), onView);

    expect(toast.title).toBe("You're in line, number 3. It's in My events.");
    expect(toast.action?.label).toBe("View");
    toast.action?.onClick();
    expect(onView).toHaveBeenCalledOnce();
  });
});
