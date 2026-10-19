import { config } from "@/lib/config";
import { TRANSACTION_BASE_FEE, TX_TIMEOUT_SECONDS } from "@/lib/contract-config";

export const DEFAULT_TOKEN_DECIMALS = 7;

// A valid source account for unsigned read-only transaction simulations.
const READ_ONLY_SEQUENCE = "0";
const READ_ONLY_SOURCE_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";

// In-memory cache for token decimals during the browser session.
const decimalsCache = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<number>>();

/**
 * Returns the cached decimals for a token contract if already resolved during this session.
 */
export function getCachedTokenDecimals(tokenContractId: string): number | null {
  return decimalsCache.get(tokenContractId.trim()) ?? null;
}

/**
 * Caches token decimals for the session.
 */
export function setCachedTokenDecimals(tokenContractId: string, decimals: number): void {
  decimalsCache.set(tokenContractId.trim(), decimals);
}

/**
 * Clears the session cache (primarily for tests).
 */
export function clearTokenDecimalsCache(): void {
  decimalsCache.clear();
  inFlightRequests.clear();
}

/**
 * Reads `decimals()` from a SEP-41 token contract via read-only simulation.
 * Results are cached per token contract for the duration of the session.
 *
 * @throws When the contract call fails or does not implement decimals().
 */
export async function readTokenDecimals(tokenContractId: string): Promise<number> {
  const address = tokenContractId.trim();
  if (!address) {
    throw new Error("Token contract address is required.");
  }

  const cached = decimalsCache.get(address);
  if (cached !== undefined) {
    return cached;
  }

  const inFlight = inFlightRequests.get(address);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const [{ Account, Contract, rpc, scValToNative, TransactionBuilder }, { server }] =
      await Promise.all([import("@stellar/stellar-sdk"), import("@/lib/contract-network")]);

    const contract = new Contract(address);
    const tx = new TransactionBuilder(new Account(READ_ONLY_SOURCE_ACCOUNT, READ_ONLY_SEQUENCE), {
      fee: TRANSACTION_BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call("decimals"))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    const simulation = await server().simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation)) {
      throw new Error(simulation.error);
    }
    if (!rpc.Api.isSimulationSuccess(simulation)) {
      throw new Error("Token decimals read did not complete.");
    }

    const nativeVal = scValToNative(simulation.result.retval);
    const decimals = Number(nativeVal);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
      throw new Error(`Invalid decimals returned by token contract: ${nativeVal}`);
    }

    decimalsCache.set(address, decimals);
    return decimals;
  })();

  inFlightRequests.set(address, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(address);
  }
}
