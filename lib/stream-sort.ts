// Client-side sort over an already-loaded page of streams (the dashboard's
// sort control — see app/page.tsx). The backend orders a page deterministically
// (id descending) and this never re-requests it in a different order, so a
// sort here only reorders whatever page is currently on screen — loading more
// rows re-sorts the larger set from scratch, but a row the backend has not
// handed over yet cannot appear ahead of one that has.

import type { StreamView } from "@/types/stream";

export type StreamSortOption = "default" | "end-soonest" | "amount-largest" | "progress-most-complete";

export const STREAM_SORT_OPTIONS: ReadonlyArray<{ value: StreamSortOption; label: string }> = [
  { value: "default", label: "Default order" },
  { value: "end-soonest", label: "Ending soonest" },
  { value: "amount-largest", label: "Amount: largest first" },
  { value: "progress-most-complete", label: "Progress: most complete first" },
];

export function isStreamSortOption(value: string): value is StreamSortOption {
  return STREAM_SORT_OPTIONS.some((option) => option.value === value);
}

// Amounts are i128 base-unit strings: compared as BigInt, never Number(), so
// a value beyond Number.MAX_SAFE_INTEGER still orders correctly instead of
// silently losing precision.
function compareAmountDesc(a: StreamView, b: StreamView): number {
  const diff = BigInt(b.totalAmount) - BigInt(a.totalAmount);
  return diff > 0n ? 1 : diff < 0n ? -1 : 0;
}

// Unix-second strings: compared as BigInt for the same exactness, even
// though a real timestamp never approaches the range where Number() would
// actually lose precision — consistent with how amounts are compared.
function compareEndAsc(a: StreamView, b: StreamView): number {
  const diff = BigInt(a.endTime) - BigInt(b.endTime);
  return diff > 0n ? 1 : diff < 0n ? -1 : 0;
}

// Basis points (0–10000): a plain, safely-sized number, so a direct numeric
// comparison is exact.
function compareProgressDesc(a: StreamView, b: StreamView): number {
  return b.progress - a.progress;
}

/**
 * Returns a new array of `streams` ordered by `sort`. "default" returns the
 * streams in the order given (the backend's own id-descending order) rather
 * than reordering them. Every other option sorts only the streams passed in —
 * it does not fetch or know about any row not already loaded.
 */
export function sortStreams(streams: StreamView[], sort: StreamSortOption): StreamView[] {
  switch (sort) {
    case "end-soonest":
      return [...streams].sort(compareEndAsc);
    case "amount-largest":
      return [...streams].sort(compareAmountDesc);
    case "progress-most-complete":
      return [...streams].sort(compareProgressDesc);
    case "default":
    default:
      return [...streams];
  }
}
