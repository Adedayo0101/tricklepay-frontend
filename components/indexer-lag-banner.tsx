"use client";

import type { JSX } from "react";

import { useIndexerLag } from "@/hooks/use-indexer-lag";
import { config } from "@/lib/config";

// Ledgers of indexer lag above which the banner appears. Stellar closes a
// ledger about every 5 seconds, so 100 is roughly 8 minutes: past the brief
// lag of a normal poll cycle, and long enough that a stream created just now
// can plausibly be missing from the lists.
export const INDEXER_LAG_WARNING_LEDGERS = 100;

// Approximate seconds per ledger, only used to turn the lag into a duration
// the reader can picture.
const SECONDS_PER_LEDGER = 5;
const SECONDS_PER_MINUTE = 60;

/**
 * Warns that the backend's indexer is far behind the chain, so the lists may
 * omit recent streams. It explains a missing stream instead of leaving the user
 * wondering whether their transaction failed. Shows nothing when the lag is
 * under the threshold or unknown (including when the status request failed).
 *
 * The live region is always rendered, empty when there is no warning, so it is
 * registered with assistive tech before it needs to announce anything.
 */
export function IndexerLagBanner(): JSX.Element {
  const lag = useIndexerLag(!config.mockApi);
  const behind = lag !== null && lag > INDEXER_LAG_WARNING_LEDGERS;
  const minutes = lag === null ? 0 : Math.round((lag * SECONDS_PER_LEDGER) / SECONDS_PER_MINUTE);

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {behind && (
        <div
          data-testid="indexer-lag-banner"
          className="border-b border-amber-800/60 bg-amber-950/40 px-4 py-2 text-center text-sm text-amber-200"
        >
          The backend is about {minutes} {minutes === 1 ? "minute" : "minutes"} behind the
          network ({lag.toLocaleString()} ledgers). Recent streams may be missing from the
          lists. A stream you just created has not necessarily failed; it should appear once
          the backend catches up.
        </div>
      )}
    </div>
  );
}
