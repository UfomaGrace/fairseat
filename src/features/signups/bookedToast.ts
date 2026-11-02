// bookedToast: the toast after createSignup. The response says whether we got a seat or a waitlist place.
// Used by the Event detail page (useBookingActions) and the Discover list (QuickBook).
import type { Signup } from "../../api/types";
import type { ToastOptions } from "../../components/ui/toast";

export function bookedToast(signup: Signup, onView: () => void): ToastOptions {
  if (signup.status === "GOING") {
    return {
      variant: "success",
      title: "You're going. It's in My events.",
      action: { label: "View", onClick: onView },
    };
  }
  if (signup.status === "WAITING") {
    return {
      variant: "info",
      title: `You're in line${signup.waitingPosition ? `, number ${signup.waitingPosition}` : ""}. It's in My events.`,
      action: { label: "View", onClick: onView },
    };
  }
  return { variant: "info", title: "We've updated your sign-up" };
}
