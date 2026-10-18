// Remembers the token contract id from the last stream a user set up, so the
// create form can offer it as the default instead of making them retype a
// 56-character address for every stream. Persisted in localStorage; see
// docs/persisted-client-state.md.

import { isValidContractAddress } from "@/lib/validation";

export const LAST_TOKEN_STORAGE_KEY = "tricklepay-last-token";

/**
 * Restores the token contract id remembered from the last stream. Returns null
 * when nothing is stored, storage is unavailable, or the stored value is not a
 * valid contract address — so an invalid value is never offered as a default.
 */
export function readLastToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LAST_TOKEN_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return isValidContractAddress(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Remembers a token contract id for the next create form. Ignores anything that
 * is not a valid contract address, so invalid values are never stored.
 */
export function writeLastToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!isValidContractAddress(token)) {
    return;
  }

  try {
    window.localStorage.setItem(LAST_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage failures from private browsing or quota limits.
  }
}

export function clearLastToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LAST_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures from private browsing or quota limits.
  }
}
