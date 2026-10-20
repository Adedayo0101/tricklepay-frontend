import { durationFieldError } from "@/lib/duration";
import { isValidContractAddress, isValidStellarAddress, parseAmount, toUnix } from "@/lib/validation";
import type { FormDraft } from "@/types/form";

// Field-level validation for the create-stream form. Each rule returns the
// message to show under its field, or undefined when the value is fine (or not
// yet complete enough to judge). Pure, so they can be tested without React.

export type CreateStreamField = keyof FormDraft;
export type CreateStreamFieldErrors = Partial<Record<CreateStreamField, string>>;

// Keep required-field messages beside the rest of the form's rules. The form
// deliberately only shows these on submit (apart from date fields), while the
// other validators provide live feedback as a value is entered.
export const CREATE_STREAM_REQUIRED_MESSAGES: Partial<Record<CreateStreamField, string>> = {
  recipient: "Recipient address is required.",
  token: "Token contract id is required.",
  amount: "Amount is required.",
  start: "Start date is required.",
  end: "End date is required.",
};

export function requiredFieldError(
  field: CreateStreamField,
  value: string,
): string | undefined {
  return !value ? CREATE_STREAM_REQUIRED_MESSAGES[field] : undefined;
}

export function recipientFieldError(value: string): string | undefined {
  return value && !isValidStellarAddress(value)
    ? "Must be a valid G... or C... Stellar address."
    : undefined;
}

export function tokenFieldError(value: string): string | undefined {
  return value && !isValidContractAddress(value)
    ? "Must be a valid C... contract address."
    : undefined;
}

export function amountFieldError(value: string, decimals: number = 7): string | undefined {
  if (!value) return undefined;
  try {
    return parseAmount(value, decimals) <= 0n ? "Amount must be greater than zero." : undefined;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid amount.";
  }
}

/**
 * The end must come after the start and after the current moment. An end that
 * is exactly now is rejected too: by the time the transaction reaches the
 * ledger it is already in the past, which the contract refuses with
 * StreamWindowInPast (code 11). The clock is read on every call, so a value
 * that was fine when typed is caught again at submit if it has gone stale.
 */
export function endFieldError(start: string, end: string): string | undefined {
  if (!end) return undefined;
  const endUnix = toUnix(end);
  if (start && endUnix <= toUnix(start)) return "End must be after start.";
  // Reads the clock on every call so an end time that was valid when typed is
  // caught again at submit if it has since fallen into the past, matching the
  // contract's StreamWindowInPast check instead of only comparing to start (#401).
  const nowUnix = BigInt(Math.floor(Date.now() / 1000));
  return endUnix <= nowUnix ? "End must be in the future." : undefined;
}

/**
 * Whether `recipient` names the connected wallet itself, compared
 * case-insensitively. The contract allows a stream from an address to
 * itself, so this is not a validation error — just something worth
 * flagging, since it is almost always a mistake (the wrong field) and only
 * occasionally intentional.
 *
 * Case-insensitive on purpose, unlike lib/stream-role.ts's isSameAddress: a
 * value still being typed has not been validated as a real strkey yet, and
 * a person pasting or half-remembering their own address does not reliably
 * preserve its case.
 */
export function isSelfRecipient(recipient: string, walletAddress: string | null): boolean {
  if (!recipient || !walletAddress) return false;
  return recipient.trim().toLowerCase() === walletAddress.toLowerCase();
}

export function cliffFieldError(start: string, end: string, cliff: string): string | undefined {
  if (!start || !end || !cliff) return undefined;
  const c = toUnix(cliff);
  return c < toUnix(start) || c > toUnix(end)
    ? "Cliff must fall between start and end."
    : undefined;
}

/**
 * Validates every create-stream field for submission. Keeping this composition
 * here means the form has one source for both its live and submit-time rules.
 */
export function validateCreateStreamForm(
  values: FormDraft,
  decimals: number = 7,
): CreateStreamFieldErrors {
  const { recipient, token, amount, start, end, cliff } = values;

  return {
    recipient: requiredFieldError("recipient", recipient) ?? recipientFieldError(recipient),
    token: requiredFieldError("token", token) ?? tokenFieldError(token),
    amount: requiredFieldError("amount", amount) ?? amountFieldError(amount, decimals),
    start: requiredFieldError("start", start),
    end: requiredFieldError("end", end) ?? endFieldError(start, end),
    cliff: cliffFieldError(start, end, cliff),
    // Duration never reaches the transaction directly — it only ever fills
    // `end` — but an error left showing on screen at submit time would be
    // confusing, so it blocks submission the same as every other field.
    durationAmount: durationFieldError(values.durationAmount),
  };
}
