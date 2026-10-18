// The native XLM Stellar Asset Contract's address, which the create-stream
// form offers as a one-click token choice so a new user does not have to paste
// an address to stream the most common asset.

import { Asset } from "@stellar/stellar-sdk";

import { config } from "@/lib/config";

/**
 * Contract id of the native XLM Stellar Asset Contract for a network.
 *
 * Derived from the network passphrase with the SDK rather than hard-coded per
 * network, so it stays correct for whichever network the app is configured
 * against. Defaults to the configured network's passphrase.
 */
export function nativeAssetContractId(
  networkPassphrase: string = config.networkPassphrase,
): string {
  return Asset.native().contractId(networkPassphrase);
}
