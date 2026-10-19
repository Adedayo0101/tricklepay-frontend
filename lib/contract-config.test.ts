import { BASE_FEE } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";

import { TRANSACTION_BASE_FEE } from "@/lib/contract-config";

describe("contract config", () => {
  it("keeps the build fee equal to the SDK's network minimum", () => {
    expect(TRANSACTION_BASE_FEE).toBe(BASE_FEE);
  });
});
