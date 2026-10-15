import type { JSX } from "react";

import { config } from "@/lib/config";

/**
 * Shows which Stellar network the app is configured for. A test network is
 * styled amber so it is never mistaken for mainnet, where real funds move.
 */
export function NetworkBadge(): JSX.Element {
  const network = config.network;
  const isTestNetwork = network !== "mainnet";

  return (
    <span
      data-testid="network-badge"
      data-network={network}
      data-test-network={isTestNetwork ? "true" : "false"}
      title={isTestNetwork ? "Test network: no real funds" : "Mainnet: real funds"}
      className={`rounded border px-2 py-0.5 text-xs font-medium capitalize ${
        isTestNetwork
          ? "border-amber-700/60 bg-amber-950/30 text-amber-300"
          : "border-neutral-700 bg-neutral-900 text-neutral-300"
      }`}
    >
      {network}
    </span>
  );
}
