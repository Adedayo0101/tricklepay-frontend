import { nativeToScVal } from "@stellar/stellar-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { simulateTransaction } = vi.hoisted(() => ({ simulateTransaction: vi.fn() }));

vi.mock("@/lib/contract-network", () => ({
  server: () => ({ simulateTransaction }),
}));

import { nativeAssetContractId } from "@/lib/native-asset";
import {
  clearTokenMetadataCache,
  getCachedTokenMetadata,
  KNOWN_TOKEN_METADATA,
  readTokenMetadata,
  setCachedTokenMetadata,
} from "@/lib/token-metadata";

const KNOWN_TOKEN = nativeAssetContractId();
const UNKNOWN_TOKEN = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";
const ANOTHER_UNKNOWN_TOKEN = "CAJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBERTS";

describe("token metadata helper", () => {
  beforeEach(() => {
    clearTokenMetadataCache();
    vi.clearAllMocks();
  });

  it("resolves unknown tokens once through read-only simulation and caches them", async () => {
    // First call simulates symbol() then name()
    simulateTransaction
      .mockResolvedValueOnce({
        transactionData: {},
        result: { retval: nativeToScVal("EURC", { type: "string" }) },
      })
      .mockResolvedValueOnce({
        transactionData: {},
        result: { retval: nativeToScVal("Euro Coin", { type: "string" }) },
      });

    const meta = await readTokenMetadata(UNKNOWN_TOKEN);
    expect(meta).toEqual({ symbol: "EURC", name: "Euro Coin" });
    expect(simulateTransaction).toHaveBeenCalledTimes(2);

    // Dynamic cache now contains the resolved metadata
    expect(getCachedTokenMetadata(UNKNOWN_TOKEN)).toEqual({
      symbol: "EURC",
      name: "Euro Coin",
    });

    // Second call must return directly from cache without re-simulating
    const cached = await readTokenMetadata(UNKNOWN_TOKEN);
    expect(cached).toEqual({ symbol: "EURC", name: "Euro Coin" });
    expect(simulateTransaction).toHaveBeenCalledTimes(2);
  });

  it("deduplicates in-flight simulation requests for the same token", async () => {
    simulateTransaction
      .mockResolvedValueOnce({
        transactionData: {},
        result: { retval: nativeToScVal("TEST", { type: "string" }) },
      })
      .mockResolvedValueOnce({
        transactionData: {},
        result: { retval: nativeToScVal("Test Token", { type: "string" }) },
      });

    const [first, second] = await Promise.all([
      readTokenMetadata(ANOTHER_UNKNOWN_TOKEN),
      readTokenMetadata(ANOTHER_UNKNOWN_TOKEN),
    ]);

    expect(first).toEqual({ symbol: "TEST", name: "Test Token" });
    expect(second).toEqual({ symbol: "TEST", name: "Test Token" });
    expect(simulateTransaction).toHaveBeenCalledTimes(2);
  });

  it("falls back to symbol when name() call fails", async () => {
    simulateTransaction
      .mockResolvedValueOnce({
        transactionData: {},
        result: { retval: nativeToScVal("BTC", { type: "string" }) },
      })
      .mockResolvedValueOnce({
        error: "HostError: method name not found",
      });

    const meta = await readTokenMetadata(UNKNOWN_TOKEN);
    expect(meta).toEqual({ symbol: "BTC", name: "BTC" });
  });

  it("keeps the table of known tokens as a fallback when simulation fails", async () => {
    simulateTransaction.mockResolvedValueOnce({
      error: "HostError: contract simulation failed",
    });

    const meta = await readTokenMetadata(KNOWN_TOKEN);
    expect(meta).toEqual(KNOWN_TOKEN_METADATA[KNOWN_TOKEN]);
  });

  it("throws when simulation fails and token is not in the fallback table", async () => {
    simulateTransaction.mockResolvedValueOnce({
      error: "HostError: contract not found",
    });

    await expect(readTokenMetadata(UNKNOWN_TOKEN)).rejects.toThrow();
  });

  it("allows setting and clearing cached metadata", () => {
    setCachedTokenMetadata(UNKNOWN_TOKEN, { symbol: "CUSTOM", name: "Custom Token" });
    expect(getCachedTokenMetadata(UNKNOWN_TOKEN)).toEqual({
      symbol: "CUSTOM",
      name: "Custom Token",
    });

    clearTokenMetadataCache();
    expect(getCachedTokenMetadata(UNKNOWN_TOKEN)).toBeNull();
  });
});
