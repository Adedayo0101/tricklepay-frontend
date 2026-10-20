// Client-side search over an already-loaded page of streams (the dashboard's
// search box — see app/page.tsx). Filters by stream id (exact or prefix),
// counterparty address (sender or recipient), token contract address, or
// known/cached token symbol.
//
// Case-insensitive on purpose — unlike lib/stream-role.ts's isSameAddress
// (an exact, case-sensitive identity check used to decide who may act on a
// stream), this is a human convenience search, not an authorization check: a
// person pasting or half-remembering an address or symbol does not reliably
// preserve its case.

import { resolveTokenMetadata } from "@/lib/format";
import type { StreamView } from "@/types/stream";

/**
 * Whether a stream matches the search query by:
 * - stream id (exact or prefix, with or without a leading `#`),
 * - sender or recipient address fragment,
 * - token contract address fragment, or
 * - known/cached token symbol.
 *
 * All comparisons are case-insensitive. An empty (or whitespace-only) query
 * matches every stream, so "nothing typed yet" never filters anything out.
 */
export function matchesStreamQuery(stream: StreamView, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const idNeedle = needle.startsWith("#") ? needle.slice(1) : needle;
  if (idNeedle.length > 0 && stream.id.toLowerCase().startsWith(idNeedle)) {
    return true;
  }

  if (
    stream.sender.toLowerCase().includes(needle) ||
    stream.recipient.toLowerCase().includes(needle) ||
    stream.token.toLowerCase().includes(needle)
  ) {
    return true;
  }

  const metadata = resolveTokenMetadata(stream.token);
  if (metadata && metadata.symbol.toLowerCase().includes(needle)) {
    return true;
  }

  return false;
}

export const matchesAddressQuery = matchesStreamQuery;

/** Filters a list of streams to those matching `query`. */
export function filterStreamsByQuery(streams: StreamView[], query: string): StreamView[] {
  return streams.filter((stream) => matchesStreamQuery(stream, query));
}

export const filterStreamsByAddress = filterStreamsByQuery;
