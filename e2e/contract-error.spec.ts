import { test, expect } from "@playwright/test";
import { Keypair } from "@stellar/stellar-sdk";

import { CONTRACT_ID, stubApi, stubChain, streamingStream, TOKEN_ID, type StreamStore } from "./fixtures/chain";
import { installFreighterStub, TEST_ADDRESS } from "./fixtures/freighter";

// The chain stub can make simulateTransaction fail with a specific
// "Error(Contract, #N)" (see ChainStubOptions.simulationError). These tests
// protect the full path from that RPC error to the plain-language message on
// screen: lib/contract-transaction.ts's buildAndPrepareTransaction throws it
// verbatim, lib/contract-errors.ts's parseContractError maps it, and
// components/stream-actions.tsx renders the mapped message.
//
// Expected copy is hardcoded here rather than imported from
// lib/contract-errors (CONTRACT_ERROR_MESSAGES, tokenFailureMessage): that
// module reads lib/config at import time, which throws outside the Next.js
// dev server this suite drives the app through. lib/contract-errors.test.ts
// is the one place those strings are checked against the source of truth.
const STREAM_ERROR_7_MESSAGE =
  "Nothing to withdraw yet — no tokens have vested since your last withdrawal.";
const STREAM_ERROR_10_MESSAGE = "That amount is too large. The total must not exceed 9223372036854775807.";
const TOKEN_ERROR_10_MESSAGE =
  "The token contract rejected the transfer. Check that your balance covers the amount, then try again. (token error code 10)";

const SENDER = Keypair.random().publicKey();

test.describe("a contract error during withdrawal", () => {
  test("shows the stream contract's own error message", async ({ page }) => {
    test.slow();
    const store: StreamStore = {
      streams: [streamingStream({ id: "1", sender: SENDER, recipient: TEST_ADDRESS })],
    };

    await page.addInitScript(installFreighterStub, { address: TEST_ADDRESS });
    await stubApi(page, store);
    const chain = await stubChain(page, {
      address: TEST_ADDRESS,
      // Unattributed: parseContractError treats this as the configured stream
      // contract's own code 7, NothingToWithdraw.
      simulationError: [
        "HostError: Error(Contract, #7)",
        "Event log (newest first):",
        `   0: [Diagnostic Event] contract:${CONTRACT_ID}, topics:[error, Error(Contract, #7)], data:"nothing vested"`,
      ].join("\n"),
    });

    await page.goto("/streams/1");
    await expect(page.getByRole("heading", { name: "Stream #1" })).toBeVisible();

    const withdrawButton = page.getByRole("button", { name: "Withdraw", exact: true });
    await expect(withdrawButton).toBeEnabled();
    await withdrawButton.click();

    await expect(page.getByText(STREAM_ERROR_7_MESSAGE)).toBeVisible();

    // The simulation failed before anything was ever signed or sent.
    expect(chain.sendCount).toBe(0);
    await expect(withdrawButton).toBeEnabled();
  });

  test("shows a token-specific message when the error comes from the token contract", async ({
    page,
  }) => {
    test.slow();
    const store: StreamStore = {
      streams: [streamingStream({ id: "1", sender: SENDER, recipient: TEST_ADDRESS })],
    };

    await page.addInitScript(installFreighterStub, { address: TEST_ADDRESS });
    await stubApi(page, store);
    const chain = await stubChain(page, {
      address: TEST_ADDRESS,
      // Code 10 collides between the stream's AmountTooLarge and the Stellar
      // Asset Contract's BalanceError — attributing it to TOKEN_ID is what
      // tells parseContractError it is the token's, not the stream's.
      simulationError: [
        "HostError: Error(Contract, #10)",
        "Event log (newest first):",
        `   0: [Diagnostic Event] contract:${TOKEN_ID}, topics:[error, Error(Contract, #10)], data:"balance is not sufficient"`,
      ].join("\n"),
    });

    await page.goto("/streams/1");
    await expect(page.getByRole("heading", { name: "Stream #1" })).toBeVisible();

    const withdrawButton = page.getByRole("button", { name: "Withdraw", exact: true });
    await expect(withdrawButton).toBeEnabled();
    await withdrawButton.click();

    await expect(page.getByText(TOKEN_ERROR_10_MESSAGE)).toBeVisible();
    // Not the stream contract's own meaning for the same number.
    await expect(page.getByText(STREAM_ERROR_10_MESSAGE)).toHaveCount(0);

    expect(chain.sendCount).toBe(0);
    await expect(withdrawButton).toBeEnabled();
  });
});
