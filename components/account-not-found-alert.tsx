import type { JSX } from "react";

import { ACCOUNT_NOT_FOUND_MESSAGE, friendbotUrl } from "@/lib/contract-messages";

interface Props {
  /** The wallet address that is not yet on-chain. */
  address: string;
  /** Whether the app is running on testnet, where friendbot is available. */
  isTestnet: boolean;
}

/**
 * Shown when `getAccount` returns 404: the wallet has never been funded.
 * On testnet a direct friendbot link lets the user fix it in one click.
 */
export function AccountNotFoundAlert({ address, isTestnet }: Props): JSX.Element {
  return (
    <div
      role="alert"
      className="my-2 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200"
    >
      <p className="font-semibold">Account not funded</p>
      <p className="mt-1 text-neutral-400">{ACCOUNT_NOT_FOUND_MESSAGE}</p>
      {isTestnet && (
        <p className="mt-2">
          <a
            href={friendbotUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-300 underline hover:text-amber-100"
          >
            Fund this account with Friendbot
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      )}
    </div>
  );
}
