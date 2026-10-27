export interface AmountParseErrorMessages {
  required: string;
  negative: string;
  invalid: string;
  precision: (decimals: number) => string;
}

/**
 * Parses a human decimal amount into base units, leaving caller-specific
 * positivity and maximum checks to the caller.
 */
export function parseDecimalAmount(
  human: string,
  decimals: number,
  messages: AmountParseErrorMessages,
): bigint {
  const trimmed = human.trim();
  if (!trimmed) throw new Error(messages.required);
  if (trimmed.startsWith("-")) throw new Error(messages.negative);
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(messages.invalid);

  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) throw new Error(messages.precision(decimals));

  const base = 10n ** BigInt(decimals);
  const paddedFraction = fraction.padEnd(decimals, "0");
  return BigInt(whole) * base + (paddedFraction ? BigInt(paddedFraction) : 0n);
}
