// bookedToast: the toast after createSignup. The response says whether we got a seat or a waitlist place.
// Used by the Event detail page (SignupActions) and the Discover list (QuickBook).
import type { Signup } from "../../api/types";
import type { ToastOptions } from "../../components/ui/toast";

export function bookedToast(signup: Signup): ToastOptions {
  if (signup.status === "GOING") {
    return { variant: "success", title: "You're booked", description: "Your seat is saved." };
  }
  if (signup.status === "WAITING") {
    const place = signup.waitingPosition ? `You're #${signup.waitingPosition} in line. ` : "";
    return {
      variant: "info",
      title: "You're on the waitlist",
      description: `${place}The event was full, so we'll offer you a seat if one frees up.`,
    };
  }
  return { variant: "info", title: "We've updated your sign-up" };
}
