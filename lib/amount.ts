import { formatAmount } from "@/lib/format";

// Human decimal amounts are converted into base units using the token's decimals
// (defaulting to 7, the Stellar standard), matching parseAmount in lib/validation.ts.

// Parses a human decimal amount (e.g. "12.5") into base units.
// Throws a descriptive error for anything that is not a plain non-negative
// decimal with at most `decimals` fractional digits.
export function parseHumanAmount(human: string, decimals: number = 7): bigint {
  const trimmed = human.trim();
  if (!trimmed) throw new Error("Enter an amount.");
  if (trimmed.startsWith("-")) throw new Error("Amount cannot be negative.");
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a valid amount (e.g. 12.5).");
  }
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > decimals) {
    throw new Error(`Amount cannot have more than ${decimals} decimal places.`);
  }
  const base = 10n ** BigInt(decimals);
  const fracPadded = frac.padEnd(decimals, "0");
  return BigInt(whole || "0") * base + (fracPadded ? BigInt(fracPadded) : 0n);
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

