"use client";

import type { JSX } from "react";

import { formatTokenDisplay, truncateAddress } from "@/lib/format";
import { useTokenMetadata } from "@/lib/token-metadata";

/**
 * Token identity shown wherever a stream references a token contract.
 * A recognised or resolved contract shows its symbol; any other address shows
 * the truncated address plus an "Unrecognised token" marker so a familiar asset
 * can never be confused with an arbitrary contract.
 * The address is always available on hover via the title attribute.
 */
export function TokenDisplay({ token }: { token: string }): JSX.Element {
  const metadata = useTokenMetadata(token);
  const display = metadata?.symbol ?? formatTokenDisplay(token);

  if (metadata) {
    return (
      <span className="inline-flex items-center gap-2">
        <span title={token}>{display}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span title={token}>{truncateAddress(token)}</span>
      <span
        title={`Unrecognised token contract: ${token}`}
        className="rounded border border-amber-800/60 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-200"
      >
        Unrecognised token
      </span>
    </span>
  );
}
