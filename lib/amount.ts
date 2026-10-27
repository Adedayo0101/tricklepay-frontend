import { parseDecimalAmount } from "@/lib/amount-parser";
import { formatAmount } from "@/lib/format";

// Parses a human decimal amount (e.g. "12.5") into base units.
// Throws a descriptive error for anything that is not a plain non-negative
// decimal with at most `decimals` fractional digits.
export function parseHumanAmount(human: string, decimals: number = 7): bigint {
  return parseDecimalAmount(human, decimals, {
    required: "Enter an amount.",
    negative: "Amount cannot be negative.",
    invalid: "Enter a valid amount (e.g. 12.5).",
    precision: (places) => `Amount cannot have more than ${places} decimal places.`,
  });
}

// Returns the message for the first problem with a requested withdrawal
// amount, or null when it is a valid partial amount of what is currently
// withdrawable. Pure display mapping over the same rules the submit path
// enforces, so inline hints can never disagree with submission.
export function withdrawalAmountError(
  human: string,
  withdrawable: bigint,
  decimals: number = 7,
): string | null {
  let parsed: bigint;
  try {
    parsed = parseHumanAmount(human, decimals);
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid amount.";
  }
  if (parsed <= 0n) return "Amount must be greater than zero.";
  if (parsed > withdrawable) {
    return `Amount exceeds withdrawable balance (${formatAmount(withdrawable.toString(), decimals)}).`;
  }
  return null;
}
