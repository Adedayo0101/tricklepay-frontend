import { Networks } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";

import { nativeAssetContractId } from "@/lib/native-asset";

// Well-known native XLM Stellar Asset Contract addresses. Asserting against
// these proves the id is derived for the right network rather than returned
// from a single hard-coded constant.
const NATIVE_CONTRACT_ID_BY_NETWORK: Record<string, string> = {
  testnet: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  mainnet: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
};

describe("nativeAssetContractId", () => {
  it.each([
    ["testnet", Networks.TESTNET],
    ["mainnet", Networks.PUBLIC],
  ])("derives the native asset contract id for %s", (network, passphrase) => {
    expect(nativeAssetContractId(passphrase)).toBe(NATIVE_CONTRACT_ID_BY_NETWORK[network]);
  });

  it("yields a different contract id per network", () => {
    expect(nativeAssetContractId(Networks.TESTNET)).not.toBe(
      nativeAssetContractId(Networks.PUBLIC),
    );
  });
});
