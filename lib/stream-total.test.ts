import { describe, expect, it } from "vitest";

import { nativeAssetContractId } from "@/lib/native-asset";
import type { StreamView } from "@/types/stream";

import { computeStreamTotals, formatStreamsTotal } from "./stream-total";

const XLM_TOKEN = nativeAssetContractId();
const UNKNOWN_TOKEN = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

function makeStream(overrides: Partial<StreamView> = {}): StreamView {
  return {
    id: "1",
    sender: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    recipient: "GBBZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    token: XLM_TOKEN,
    totalAmount: "10000000", // 1 XLM (7 decimals)
    withdrawn: "0",
    vested: "0",
    withdrawable: "0",
    locked: "10000000",
    startTime: "1000",
    endTime: "2000",
    cliffTime: "1000",
    cancelled: false,
    status: "streaming",
    progress: 0,
    ...overrides,
  };
}

describe("stream-total", () => {
  describe("computeStreamTotals", () => {
    it("returns empty array when given an empty stream list", () => {
      expect(computeStreamTotals([])).toEqual([]);
    });

    it("aggregates multiple streams with the same token", () => {
      const streams = [
        makeStream({ totalAmount: "10000000" }), // 1 XLM
        makeStream({ totalAmount: "25000000" }), // 2.5 XLM
      ];

      const totals = computeStreamTotals(streams);
      expect(totals).toHaveLength(1);
      expect(totals[0].token).toBe(XLM_TOKEN);
      expect(totals[0].total).toBe(35000000n);
      expect(totals[0].formatted).toBe("3.5 XLM");
    });

    it("aggregates streams with different tokens separately", () => {
      const streams = [
        makeStream({ token: XLM_TOKEN, totalAmount: "10000000" }), // 1 XLM
        makeStream({ token: UNKNOWN_TOKEN, totalAmount: "50000000" }), // 5 (unknown)
      ];

      const totals = computeStreamTotals(streams);
      expect(totals).toHaveLength(2);
      expect(totals.find((t) => t.token === XLM_TOKEN)?.formatted).toBe("1 XLM");
      expect(totals.find((t) => t.token === UNKNOWN_TOKEN)?.formatted).toBe("5");
    });

    it("safely ignores malformed or missing totalAmount values", () => {
      const streams = [
        makeStream({ totalAmount: "10000000" }),
        makeStream({ totalAmount: undefined as unknown as string }),
        makeStream({ totalAmount: "invalid" }),
        makeStream({ totalAmount: "0" }),
      ];

      const totals = computeStreamTotals(streams);
      expect(totals).toHaveLength(1);
      expect(totals[0].formatted).toBe("1 XLM");
    });
  });

  describe("formatStreamsTotal", () => {
    it("returns '0' when no streams are provided", () => {
      expect(formatStreamsTotal([])).toBe("0");
    });

    it("formats a single stream total with its token symbol", () => {
      const streams = [makeStream({ totalAmount: "50000000" })]; // 5 XLM
      expect(formatStreamsTotal(streams)).toBe("5 XLM");
    });

    it("formats sum of multiple streams of same token", () => {
      const streams = [
        makeStream({ totalAmount: "50000000" }),  // 5 XLM
        makeStream({ totalAmount: "150000000" }), // 15 XLM
      ];
      expect(formatStreamsTotal(streams)).toBe("20 XLM");
    });

    it("formats multi-token totals as comma-separated list", () => {
      const streams = [
        makeStream({ token: XLM_TOKEN, totalAmount: "10000000" }),
        makeStream({ token: UNKNOWN_TOKEN, totalAmount: "20000000" }),
      ];
      expect(formatStreamsTotal(streams)).toBe("1 XLM, 2");
    });
  });
});
