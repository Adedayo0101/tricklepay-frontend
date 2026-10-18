// Facade for the Soroban contract write path (create, withdraw,
// withdraw_amount, cancel). The implementation is split by responsibility:
//   lib/contract-config.ts     — fee, timeout, and polling constants
//   lib/contract-guard.ts      — concurrency lock
//   lib/contract-network.ts    — RPC server and network-mismatch guard
//   lib/contract-transaction.ts — build, sign, and submit steps
//   lib/contract-confirm.ts    — confirmation polling and timeout error
//   lib/contract-invoke.ts     — stage orchestration
//   lib/contract-operations.ts — public create/withdraw/cancel entry points
//   lib/contract-errors.ts     — contract-code → user-message mapping
//   lib/contract-messages.ts   — user-facing copy
//
// Every call follows the same flow: fetch the account, build the
// transaction, simulate and assemble the resource footprint, then hand the
// prepared XDR to Freighter for signing. Signing happens in the wallet,
// never in the client — the private key never leaves Freighter. The signed
// transaction is then submitted over RPC and polled until it confirms
// on-chain, with each stage surfaced through onStageChange so the UI can
// show progress.
//
// ─── TRANSACTION STAGES ──────────────────────────────────────────────────
//  preparing  — fetch account, build tx, simulate resource footprint.
//  signing    — Freighter approval dialog; key never leaves the extension.
//  submitting — broadcast to Soroban RPC pending pool.
//  confirming — poll getTransaction once per interval until SUCCESS/FAILED.
//
// ─── CONCURRENCY GUARD ───────────────────────────────────────────────────
// A module-level flag serialises all invocations: only one transaction may
// be in flight at a time. See lib/contract-guard.ts.

// Public entry points — unchanged. Import from here, not the submodules.
export {
  createStream,
  estimateCreateStreamFee,
  withdraw,
  withdrawAmount,
  cancel,
} from "@/lib/contract-operations";
export { confirmTransaction, TransactionTimeoutError } from "@/lib/contract-confirm";
export { isTransactionPending } from "@/lib/contract-guard";

// Stage types and display copy — re-exported here so existing
// `from "@/lib/contract"` imports keep working.
export type { TxStage, TxStageInfo } from "@/types/contract";
export { TX_STAGES, TX_STAGE_LABELS } from "@/lib/contract-messages";
