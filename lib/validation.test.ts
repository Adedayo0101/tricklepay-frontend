import { describe, it, expect } from "vitest";

import {
  isValidStellarAddress,
  isValidContractAddress,
  MAX_AMOUNT_BASE_UNITS,
  MAX_HUMAN_AMOUNT,
  parseAmount,
  toUnix,
  validateStreamDates,
} from "./validation";

// Known valid test keys
const VALID_G_ADDRESS = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const VALID_C_CONTRACT = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
const INVALID_ADDRESS = "INVALID_STELLAR_ADDRESS_STRING";

describe("lib/validation", () => {
  describe("isValidStellarAddress", () => {
    it("returns true for a valid G... public key", () => {
      expect(isValidStellarAddress(VALID_G_ADDRESS)).toBe(true);
    });

    it("returns true for a valid C... contract address", () => {
      expect(isValidStellarAddress(VALID_C_CONTRACT)).toBe(true);
    });

    it("returns false for an empty or invalid address string", () => {
      expect(isValidStellarAddress("")).toBe(false);
      expect(isValidStellarAddress(INVALID_ADDRESS)).toBe(false);
    });
  });

  describe("isValidContractAddress", () => {
    it("returns true for a valid C... contract address", () => {
      expect(isValidContractAddress(VALID_C_CONTRACT)).toBe(true);
    });

    it("returns false for a G... public key (not a contract)", () => {
      expect(isValidContractAddress(VALID_G_ADDRESS)).toBe(false);
    });

    it("returns false for an empty or invalid address string", () => {
      expect(isValidContractAddress("")).toBe(false);
      expect(isValidContractAddress(INVALID_ADDRESS)).toBe(false);
    });
  });

  describe("parseAmount", () => {
    it("parses whole integer amount into 7-decimal base units", () => {
      expect(parseAmount("100")).toBe(1_000_000_000n);
      expect(parseAmount("1")).toBe(10_000_000n);
    });

    it("parses decimal amounts correctly", () => {
      expect(parseAmount("1.5")).toBe(15_000_000n);
      expect(parseAmount("0.0000001")).toBe(1n);
      expect(parseAmount("100.1234567")).toBe(1_001_234_567n);
    });

    it("throws when amount is empty or whitespace", () => {
      expect(() => parseAmount("")).toThrow("Amount is required.");
      expect(() => parseAmount("   ")).toThrow("Amount is required.");
    });

    it("throws for negative amounts", () => {
      expect(() => parseAmount("-10")).toThrow("Amount must be a positive number");
      expect(() => parseAmount("-0.5")).toThrow("Amount must be a positive number");
    });

    it("throws for scientific notation and non-numeric formats", () => {
      expect(() => parseAmount("1e5")).toThrow("Amount must be a positive number");
      expect(() => parseAmount("1.2.3")).toThrow("Amount must be a positive number");
      expect(() => parseAmount("abc")).toThrow("Amount must be a positive number");
    });

    it("throws when fractional precision exceeds 7 decimals", () => {
      expect(() => parseAmount("1.12345678")).toThrow(
        "Amount cannot have more than 7 decimal places.",
      );
    });

    it("parses 6-decimal token amounts accurately", () => {
      expect(parseAmount("1", 6)).toBe(1_000_000n);
      expect(parseAmount("1.5", 6)).toBe(1_500_000n);
      expect(parseAmount("0.000001", 6)).toBe(1n);
      expect(() => parseAmount("0.0000001", 6)).toThrow(
        "Amount cannot have more than 6 decimal places.",
      );
    });

    it("parses 7-decimal token amounts accurately", () => {
      expect(parseAmount("1", 7)).toBe(10_000_000n);
      expect(parseAmount("1.5", 7)).toBe(15_000_000n);
      expect(parseAmount("0.0000001", 7)).toBe(1n);
      expect(() => parseAmount("0.00000001", 7)).toThrow(
        "Amount cannot have more than 7 decimal places.",
      );
    });

    it("parses 18-decimal token amounts accurately", () => {
      expect(parseAmount("1", 18)).toBe(1_000_000_000_000_000_000n);
      expect(parseAmount("1.5", 18)).toBe(1_500_000_000_000_000_000n);
      expect(parseAmount("0.000000000000000001", 18)).toBe(1n);
      expect(() => parseAmount("0.0000000000000000001", 18)).toThrow(
        "Amount cannot have more than 18 decimal places.",
      );
    });

    it("throws when parsed base unit amount is zero", () => {
      expect(() => parseAmount("0")).toThrow("Amount must be greater than zero.");
      expect(() => parseAmount("0.0000000")).toThrow("Amount must be greater than zero.");
    });

    // The contract caps a stream's total at i64::MAX base units and reverts
    // anything larger with AmountTooLarge, so the client has to draw the line
    // at exactly the same base unit.
    describe("amount ceiling", () => {
      it("is i64::MAX base units, matching the contract", () => {
        expect(MAX_AMOUNT_BASE_UNITS).toBe(2n ** 63n - 1n);
        expect(parseAmount(MAX_HUMAN_AMOUNT)).toBe(MAX_AMOUNT_BASE_UNITS);
      });

      it("accepts the largest valid amount, 922337203685.4775807", () => {
        expect(parseAmount("922337203685.4775807")).toBe(9_223_372_036_854_775_807n);
      });

      it("rejects one base unit more, 922337203685.4775808", () => {
        expect(() => parseAmount("922337203685.4775808")).toThrow(
          "Amount cannot exceed 922337203685.4775807.",
        );
      });

      it("rejects the next whole token above the ceiling", () => {
        expect(() => parseAmount("922337203686")).toThrow("Amount cannot exceed");
      });

      it("keeps every digit of an amount beyond Number's safe integer range", () => {
        // 2^53 + 1 base units: Number would round this to 2^53.
        const human = "900719925.4740993";
        expect(Number(9_007_199_254_740_993n)).toBe(Number.MAX_SAFE_INTEGER + 1);
        expect(parseAmount(human)).toBe(9_007_199_254_740_993n);
        // The ceiling itself is not representable as a Number either.
        expect(BigInt(Number(MAX_AMOUNT_BASE_UNITS))).not.toBe(MAX_AMOUNT_BASE_UNITS);
      });

      it("rejects an amount too large for a JavaScript number with the ceiling message", () => {
        const huge = "1" + "0".repeat(400); // Number(huge) === Infinity
        expect(Number(huge)).toBe(Infinity);
        expect(() => parseAmount(huge)).toThrow("Amount cannot exceed 922337203685.4775807.");
      });
    });
  });

  describe("toUnix", () => {
    it("converts datetime-local string to Unix seconds", () => {
      const dateStr = "2026-08-27T12:00";
      const expected = BigInt(Math.floor(new Date(dateStr).getTime() / 1000));
      expect(toUnix(dateStr)).toBe(expected);
    });

    it("throws for invalid date input string", () => {
      expect(() => toUnix("invalid-date")).toThrow("Invalid date input.");
    });
  });

  describe("validateStreamDates", () => {
    const validStart = "2026-08-27T10:00";
    const validEnd = "2026-08-27T12:00";
    const validCliff = "2026-08-27T11:00";

    it("returns no errors for valid start, end, and cliff dates", () => {
      const result = validateStreamDates(validStart, validEnd, validCliff);
      expect(result.endError).toBeUndefined();
      expect(result.cliffError).toBeUndefined();
    });

    it("returns endError if end is before or equal to start", () => {
      const result = validateStreamDates(validEnd, validStart);
      expect(result.endError).toBe("End must be after start.");
    });

    it("returns cliffError if cliff is outside the start and end range", () => {
      const resultBefore = validateStreamDates(validStart, validEnd, "2026-08-27T09:00");
      expect(resultBefore.cliffError).toBe("Cliff must fall between start and end.");

      const resultAfter = validateStreamDates(validStart, validEnd, "2026-08-27T13:00");
      expect(resultAfter.cliffError).toBe("Cliff must fall between start and end.");
    });
  });
});
