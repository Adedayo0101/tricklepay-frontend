"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether the browser currently has network connectivity, updating in
 * real time as `online` and `offline` events fire.
 *
 * Returns `true` when online, `false` when offline. Initialises from
 * `navigator.onLine` so server-rendered and first-paint states are consistent.
 *
 * Follows the hook conventions: one effect, full cleanup, no shared state.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(
    // navigator.onLine is defined on all modern browsers; fall back to true
    // in environments where the global is absent (e.g., SSR in tests).
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
