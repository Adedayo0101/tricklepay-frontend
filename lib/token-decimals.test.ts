import { nativeToScVal } from "@stellar/stellar-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { simulateTransaction } = vi.hoisted(() => ({ simulateTransaction: vi.fn() }));

vi.mock("@/lib/contract-network", () => ({
  server: () => ({ simulateTransaction }),
}));

import {
  clearTokenDecimalsCache,
  getCachedTokenDecimals,
  readTokenDecimals,
} from "@/lib/token-decimals";

const TOKEN_6 = "CADAMBQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMSST";
const TOKEN_7 = "CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR";
const TOKEN_18 = "CAJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBERTS";

describe("token decimals helper", () => {
  beforeEach(() => {
    clearTokenDecimalsCache();
    vi.clearAllMocks();
  });

  it("reads 6-decimal token correctly", async () => {
    simulateTransaction.mockResolvedValueOnce({
      transactionData: {},
      result: { retval: nativeToScVal(6, { type: "u32" }) },
    });

    const decimals = await readTokenDecimals(TOKEN_6);
    expect(decimals).toBe(6);
  });

  it("reads 7-decimal token correctly", async () => {
    simulateTransaction.mockResolvedValueOnce({
      transactionData: {},
      result: { retval: nativeToScVal(7, { type: "u32" }) },
    });

    const decimals = await readTokenDecimals(TOKEN_7);
    expect(decimals).toBe(7);
  });

  it("reads 18-decimal token correctly", async () => {
    simulateTransaction.mockResolvedValueOnce({
      transactionData: {},
      result: { retval: nativeToScVal(18, { type: "u32" }) },
    });

    const decimals = await readTokenDecimals(TOKEN_18);
    expect(decimals).toBe(18);
  });

  it("caches decimals per token for the session", async () => {
    simulateTransaction.mockResolvedValueOnce({
      transactionData: {},
      result: { retval: nativeToScVal(18, { type: "u32" }) },
    });

    const first = await readTokenDecimals(TOKEN_18);
    expect(first).toBe(18);
    expect(simulateTransaction).toHaveBeenCalledTimes(1);
    expect(getCachedTokenDecimals(TOKEN_18)).toBe(18);

    // Second call should return from cache without calling simulation again
    const second = await readTokenDecimals(TOKEN_18);
    expect(second).toBe(18);
    expect(simulateTransaction).toHaveBeenCalledTimes(1);
  });

  it("throws when the decimals simulation fails", async () => {
    simulateTransaction.mockResolvedValueOnce({
      error: "HostError: contract not found",
    });

    await expect(readTokenDecimals(TOKEN_6)).rejects.toThrow();
  });
});
