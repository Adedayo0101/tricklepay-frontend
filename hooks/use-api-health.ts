"use client";

import { useEffect, useState } from "react";

import { checkApiHealth, isAbortError } from "@/lib/api";

// How often the backend is probed once the first check is done. Health changes
// on the scale of deploys and outages, not seconds, so a slow poll is enough
// and keeps the extra load on the API negligible.
export const API_HEALTH_INTERVAL_MS = 60_000;

export type ApiHealth = "checking" | "reachable" | "unreachable";

/**
 * Tracks whether the backend API answers its /health endpoint.
 *
 * Probes once on mount and then every API_HEALTH_INTERVAL_MS. Unmounting stops
 * the timer and aborts a probe still in flight. With `enabled` false (mock
 * mode, where there is no backend to probe) nothing is requested and the state
 * stays "checking".
 */
export function useApiHealth(enabled = true): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>("checking");

  useEffect(() => {
    if (!enabled) return;

    let controller: AbortController | null = null;

    const probe = () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      checkApiHealth({ signal: current.signal })
        .then((ok) => {
          if (!current.signal.aborted) setHealth(ok ? "reachable" : "unreachable");
        })
        .catch((error: unknown) => {
          // Only an abort reaches here, and that is our own cleanup.
          if (!isAbortError(error)) setHealth("unreachable");
        });
    };

    probe();
    const interval = setInterval(probe, API_HEALTH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      controller?.abort();
    };
  }, [enabled]);

  return health;
}
