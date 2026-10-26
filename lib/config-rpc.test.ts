import { afterEach, describe, expect, it, vi } from "vitest";

const NETWORK_CONFIG = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    rpcUrl: "https://soroban-testnet.stellar.org",
  },
  mainnet: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    rpcUrl: "https://mainnet.sorobanrpc.com",
  },
} as const;

async function loadConfig(network: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_NETWORK", network);
  vi.stubEnv("NEXT_PUBLIC_RPC_URL", "");
  vi.stubEnv(
    "NEXT_PUBLIC_CONTRACT_ID",
    "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  );
  return (await import("./config")).config;
}

describe("network configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ["testnet", NETWORK_CONFIG.testnet],
    ["mainnet", NETWORK_CONFIG.mainnet],
  ] as const)(
    "uses the %s passphrase and RPC URL",
    async (network, expected) => {
      const config = await loadConfig(network);

      expect(config.network).toBe(network);
      expect(config.networkPassphrase).toBe(expected.networkPassphrase);
      expect(config.rpcUrl).toBe(expected.rpcUrl);
    },
  );

  it("rejects an unknown network with the accepted values", async () => {
    await expect(loadConfig("mainet")).rejects.toThrow(
      'Configuration error: NEXT_PUBLIC_NETWORK "mainet" is not supported. ' +
        'Accepted values are "testnet" and "mainnet".',
    );
  });
});
