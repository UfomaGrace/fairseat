// useNow: the current time, refreshed every intervalMs.
//
//   const now = useNow(1000);
//   const expired = Date.parse(expiresAt) <= now;
//
// Lets a component count down, or notice that a start time has passed, without calling
// Date.now() during render (React expects render to give the same result each time).

import { useEffect, useState } from "react";

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
