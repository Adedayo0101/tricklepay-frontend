import { StrKey } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";

import { config } from "@/lib/config";
import {
  CONTRACT_ERROR_MESSAGES,
  GENERIC_FAILURE,
  parseContractError,
  tokenFailureMessage,
} from "@/lib/contract-errors";

// Every discriminant of StreamError in the contract's
// contracts/stream/src/error.rs, written out by hand on purpose: deriving this
// list from CONTRACT_ERROR_MESSAGES would make the test agree with whatever
// the table already says. 2 is retired on the contract side and absent here.
//
// When the contract adds a variant, add its code to this list. The tests below
// then fail until the client gives it a message — the table has already fallen
// behind the contract once (11 to 13 were missing).
const CONTRACT_ERROR_CODES = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

// error.rs documents the next unused discriminant; today it is 14.
const NEXT_UNUSED_CODE = 14;

describe("contract error table coverage", () => {
  it.each(CONTRACT_ERROR_CODES)("has a message for contract error code %i", (code) => {
    const message = CONTRACT_ERROR_MESSAGES[code];
    expect(message, `no message for contract error code ${code}`).toBeTypeOf("string");
    expect(message.trim()).not.toBe("");
  });

  it.each(CONTRACT_ERROR_CODES)("parses code %i to its own message, not the fallback", (code) => {
    const parsed = parseContractError(`HostError: Error(Contract, #${code})`);
    expect(parsed).toBe(CONTRACT_ERROR_MESSAGES[code]);
    expect(parsed.startsWith(GENERIC_FAILURE)).toBe(false);
  });

  it("gives every contract code a distinct message", () => {
    const messages = CONTRACT_ERROR_CODES.map((code) => CONTRACT_ERROR_MESSAGES[code]);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("maps the codes added after 10 to their meaning", () => {
    expect(parseContractError("Error(Contract, #11)")).toMatch(/end time has already passed/);
    expect(parseContractError("Error(Contract, #12)")).toMatch(/run out of stream ids/);
    expect(parseContractError("Error(Contract, #13)")).toMatch(/sender and recipient must be different/);
  });

  it("still falls back, with the raw code, for the first code the contract has not used", () => {
    expect(CONTRACT_ERROR_MESSAGES[NEXT_UNUSED_CODE]).toBeUndefined();
    expect(parseContractError(`Error(Contract, #${NEXT_UNUSED_CODE})`)).toBe(
      `${GENERIC_FAILURE} (error code ${NEXT_UNUSED_CODE})`,
    );
  });
});

// Simulation failures end with the host's event log, newest first. The error
// event of the contract that actually failed names that contract; the frames
// above it are the callers escalating the same code.
function simulationFailure(code: number, failingContract: string): string {
  return [
    `HostError: Error(Contract, #${code})`,
    "",
    "Event log (newest first):",
    `   0: [Diagnostic Event] topics:[error, Error(Contract, #${code})], data:"escalating Ok(ScErrorType::Contract) frame-exit to Err"`,
    `   1: [Diagnostic Event] contract:${config.contractId}, topics:[error, Error(Contract, #${code})], data:"caught error from function"`,
    `   2: [Diagnostic Event] contract:${failingContract}, topics:[error, Error(Contract, #${code})], data:["failing with contract error", ${code}]`,
  ].join("\n");
}

describe("errors from a contract other than the stream contract", () => {
  const TOKEN_ID = StrKey.encodeContract(Buffer.alloc(32, 7));

  it("does not map a token error whose number collides with a stream error", () => {
    // The Stellar Asset Contract's BalanceError is 10, the stream's AmountTooLarge.
    const message = parseContractError(
      [
        "HostError: Error(Contract, #10)",
        "Event log (newest first):",
        `   0: [Diagnostic Event] contract:${TOKEN_ID}, topics:[error, Error(Contract, #10)], data:"balance is not sufficient"`,
      ].join("\n"),
    );
    expect(message).toBe(tokenFailureMessage(10));
    expect(message).not.toBe(CONTRACT_ERROR_MESSAGES[10]);
    expect(message).not.toMatch(/too large/);
    expect(message).toMatch(/balance/);
    expect(message).toMatch(/10/);
  });

  it.each([
    [8, "NegativeAmountError"],
    [9, "AllowanceError"],
    [10, "BalanceError"],
  ])("does not apply the stream message for colliding token code %i (%s)", (code) => {
    const message = parseContractError(simulationFailure(code, TOKEN_ID));
    expect(message).toBe(tokenFailureMessage(code));
    expect(message).not.toBe(CONTRACT_ERROR_MESSAGES[code]);
  });

  it("maps the same code with the stream table when the stream contract raised it", () => {
    const raw = simulationFailure(10, config.contractId);
    expect(parseContractError(raw)).toBe(CONTRACT_ERROR_MESSAGES[10]);
  });

  it("maps a code with the stream table when the text does not name a contract", () => {
    expect(parseContractError("Error(Contract, #10)")).toBe(CONTRACT_ERROR_MESSAGES[10]);
  });

  it("attributes the code that matches the headline, not an unrelated event", () => {
    const raw = [
      "HostError: Error(Contract, #7)",
      `   0: [Diagnostic Event] contract:${TOKEN_ID}, topics:[error, Error(Contract, #10)], data:"x"`,
      `   1: [Diagnostic Event] contract:${config.contractId}, topics:[error, Error(Contract, #7)], data:"x"`,
    ].join("\n");
    expect(parseContractError(raw)).toBe(CONTRACT_ERROR_MESSAGES[7]);
  });
});
