import { StrKey } from "@stellar/stellar-sdk";

/**
 * A Stellar address is valid if it is a public key (G...) or a contract (C...).
 */
export function isValidStellarAddress(value: string): boolean {
  if (!value) return false;
  return StrKey.isValidEd25519PublicKey(value) || StrKey.isValidContract(value);
}

/**
 * A token contract ID must be a contract address only (C...).
 */
export function isValidContractAddress(value: string): boolean {
  if (!value) return false;
  return StrKey.isValidContract(value);
}

/**
 * Converts a `datetime-local` input string to Unix timestamp in seconds.
 */
export function toUnix(local: string): bigint {
  const time = new Date(local).getTime();
  if (isNaN(time)) {
    throw new Error("Invalid date input.");
  }
  return BigInt(Math.floor(time / 1000));
}

/**
 * Largest total, in base units, the contract accepts: i64::MAX. Anything above
 * it reverts on-chain with AmountTooLarge (code 10), so the form rejects it
 * first. Kept as a bigint literal — it is far beyond Number's safe range.
 */
export const MAX_AMOUNT_BASE_UNITS = 9_223_372_036_854_775_807n;

/** MAX_AMOUNT_BASE_UNITS as a human amount, for messages and hints. */
export const MAX_HUMAN_AMOUNT = "922337203685.4775807";

/**
 * Parses a human decimal amount into base units (bigint) using the specified decimals
 * (defaulting to 7, the Stellar standard).
 * Rejects non-positive numbers, scientific notation, negative numbers,
 * multiple decimal points, and amounts with more than `decimals` decimal places.
 */
export function parseAmount(human: string, decimals: number = 7): bigint {
  const trimmed = human.trim();

  if (!trimmed) {
    throw new Error("Amount is required.");
  }

  // Reject scientific notation, negatives, multiple dots, and anything else
  // that isn't a plain non-negative decimal.
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Amount must be a positive number (e.g. 100 or 1.5).");
  }

  const [whole, frac = ""] = trimmed.split(".");

  // Reject more decimal places than allowed explicitly rather than silently truncating.
  if (frac.length > decimals) {
    throw new Error(`Amount cannot have more than ${decimals} decimal places.`);
  }

  const fracPadded = frac.padEnd(decimals, "0");
  const base = 10n ** BigInt(decimals);
  const result = BigInt(whole) * base + (fracPadded ? BigInt(fracPadded) : 0n);

  if (result <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  // Catches anything above i64::MAX here, before the wallet prompt, so the
  // user never signs an amount the contract would revert with AmountTooLarge (#402).
  if (decimals === 7 && result > MAX_AMOUNT_BASE_UNITS) {
    throw new Error(`Amount cannot exceed ${MAX_HUMAN_AMOUNT}.`);
  }

  return result;
}

export interface StreamDateValidationResult {
  endError?: string;
  cliffError?: string;
}

/**
 * Validates start, end, and optional cliff date strings.
 */
export function validateStreamDates(
  startVal: string,
  endVal: string,
  cliffVal?: string,
): StreamDateValidationResult {
  const result: StreamDateValidationResult = {};

  if (startVal && endVal) {
    try {
      const s = toUnix(startVal);
      const e = toUnix(endVal);
      if (e <= s) {
        result.endError = "End must be after start.";
      }
    } catch {
      result.endError = "Invalid start or end date.";
    }
  }

  if (startVal && endVal && cliffVal) {
    try {
      const s = toUnix(startVal);
      const e = toUnix(endVal);
      const c = toUnix(cliffVal);
      if (c < s || c > e) {
        result.cliffError = "Cliff must fall between start and end.";
      }
    } catch {
      result.cliffError = "Invalid cliff date.";
    }
  }

  return result;
}
