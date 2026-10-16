// Client-side search over an already-loaded page of streams (the dashboard's
// search box — see app/page.tsx). Filters by counterparty address, full or a
// fragment, matched against whichever side of the stream it appears on.
//
// Case-insensitive on purpose — unlike lib/stream-role.ts's isSameAddress
// (an exact, case-sensitive identity check used to decide who may act on a
// stream), this is a human convenience search, not an authorization check: a
// person pasting or half-remembering an address does not reliably preserve
// its case.

import type { StreamView } from "@/types/stream";

/**
 * Whether a stream's sender or recipient contains the given fragment,
 * case-insensitively. An empty (or whitespace-only) query matches every
 * stream, so "nothing typed yet" never filters anything out.
 */
export function matchesAddressQuery(stream: StreamView, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    stream.sender.toLowerCase().includes(needle) ||
    stream.recipient.toLowerCase().includes(needle)
  );
}

/** Filters a list of streams to those whose sender or recipient matches `query`. */
export function filterStreamsByAddress(streams: StreamView[], query: string): StreamView[] {
  return streams.filter((stream) => matchesAddressQuery(stream, query));
}
