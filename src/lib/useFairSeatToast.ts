import { useCallback } from "react";
import { useToast, type ToastOptions } from "../components/ui/toast";

/** App-wide durations; Radix pauses the countdown while a toast is hovered or focused. */
export function useFairSeatToast() {
  const context = useToast();
  const toast = useCallback(
    (options: ToastOptions) =>
      context.toast({
        ...options,
        duration: options.variant === "error" ? 6000 : 4000,
      }),
    [context],
  );
  return { ...context, toast };
}
