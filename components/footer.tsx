import type { JSX } from "react";

import { CopyButton } from "@/components/copy-button";
import { config } from "@/lib/config";
import { contractExplorerUrl } from "@/lib/explorer";

/**
 * Site footer showing the deployed contract id so users can verify it against
 * the project's published documentation before locking funds.
 *
 * Includes a copy action and a Stellar Expert link so both technical and
 * casual users can confirm they are interacting with the right contract.
 *
 * This is a server component: it reads `config` at build time, has no state,
 * and needs no "use client" directive.
 */
export function Footer(): JSX.Element {
  const contractId = config.contractId;
  const explorerUrl = contractExplorerUrl(contractId, config.network);

  return (
    <footer className="border-t border-neutral-800 py-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 px-6 text-xs text-neutral-500">
        <span>Contract</span>
        <code className="font-mono">{contractId}</code>
        <CopyButton value={contractId} label="contract id" />
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 underline hover:text-neutral-200"
        >
          View on Stellar Expert
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </footer>
  );
}
