import { describe, expect, it } from "vitest";

import { CONTRACT_ERROR_MESSAGES, GENERIC_FAILURE, parseContractError } from "@/lib/contract-errors";

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
