// Shapes for the on-chain write path (lib/contract.ts) and everything that
// surfaces its progress (components/transaction-progress.tsx and the
// use-create-stream-form / use-stream-actions hooks).

/** Parameters for creating a new stream, matching the contract's create_stream entry point. */
export interface CreateStreamParams {
  sender: string;
  recipient: string;
  token: string;
  totalAmount: bigint;
  startTime: bigint;
  endTime: bigint;
  cliffTime: bigint;
}

/** A stage in the build -> sign -> submit -> confirm lifecycle of a contract invocation. */
export type TxStage = "preparing" | "signing" | "submitting" | "confirming";

/**
 * Best-effort network-fee estimate shown on the review step. "loading" while
 * the pre-signing simulation runs, "ready" with the fee in stroops once it
 * resolves, and "unavailable" when it could not be produced — which must never
 * block the user from confirming and signing.
 */
export type FeeEstimate =
  | { status: "loading" }
  | { status: "ready"; stroops: bigint }
  | { status: "unavailable" };

/**
 * Best-effort read of the sender's token balance for the review step.
 * "loading" while the read runs, "ready" with the balance in base units and
 * the shortfall (null when the balance covers the stream), and "unavailable"
 * when the read failed — which must never block the flow.
 */
export type BalanceCheck =
  | { status: "loading" }
  | { status: "ready"; balance: bigint; shortfall: bigint | null }
  | { status: "unavailable" };

/** Display metadata for one entry in the transaction progress indicator. */
export interface TxStageInfo {
  id: TxStage;
  label: string;
  detail: string;
}
