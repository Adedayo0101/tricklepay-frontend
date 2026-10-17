import { describe, expect, it } from "vitest";

import {
  ACCOUNT_NOT_FOUND_MESSAGE,
  friendbotUrl,
  isAccountNotFoundError,
} from "@/lib/contract-messages";

describe("isAccountNotFoundError", () => {
  it("returns true for an error whose message contains 'account' and 'not found'", () => {
    expect(isAccountNotFoundError(new Error("account not found"))).toBe(true);
    expect(isAccountNotFoundError(new Error("Account Not Found on the network"))).toBe(true);
  });

  it("returns true for a BadResponseError-shaped object with status 404", () => {
    const err = Object.assign(new Error("bad response"), { response: { status: 404 } });
    expect(isAccountNotFoundError(err)).toBe(true);
  });

  it("returns false for an unrelated error", () => {
    expect(isAccountNotFoundError(new Error("some other SDK failure"))).toBe(false);
    expect(isAccountNotFoundError(new Error("connection refused"))).toBe(false);
  });

  it("returns false for a non-Error value", () => {
    expect(isAccountNotFoundError("account not found")).toBe(false);
    expect(isAccountNotFoundError(null)).toBe(false);
    expect(isAccountNotFoundError({ message: "account not found" })).toBe(false);
  });

  it("returns false for a BadResponseError-shaped object with a non-404 status", () => {
    const err = Object.assign(new Error("bad response"), { response: { status: 500 } });
    expect(isAccountNotFoundError(err)).toBe(false);
  });
});

describe("friendbotUrl", () => {
  it("includes the address in the URL", () => {
    const address = "GABC123";
    expect(friendbotUrl(address)).toContain(encodeURIComponent(address));
  });

  it("points at the Stellar friendbot endpoint", () => {
    expect(friendbotUrl("GABC")).toMatch(/^https:\/\/friendbot\.stellar\.org/);
  });
});

describe("ACCOUNT_NOT_FOUND_MESSAGE", () => {
  it("is a non-empty string", () => {
    expect(typeof ACCOUNT_NOT_FOUND_MESSAGE).toBe("string");
    expect(ACCOUNT_NOT_FOUND_MESSAGE.trim().length).toBeGreaterThan(0);
  });
});
