import { test, expect } from "@playwright/test";

import { nativeAssetContractId } from "@/lib/native-asset";

import { stubApi, stubChain, type StreamStore } from "./fixtures/chain";
import { installFreighterStub, TEST_ADDRESS } from "./fixtures/freighter";

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

test.describe("Use native XLM button", () => {
  test("opens /create, clicks Use native XLM as the token, and asserts the field equals the native asset contract id", async ({
    page,
  }) => {
    const store: StreamStore = { streams: [] };

    await page.addInitScript(installFreighterStub, { address: TEST_ADDRESS });
    await stubApi(page, store);
    await stubChain(page, { address: TEST_ADDRESS });

    await page.goto("/create");

    // Click the "Use native XLM as the token" button
    const useXlmButton = page.getByRole("button", {
      name: "Use native XLM as the token",
    });
    await expect(useXlmButton).toBeVisible();
    await useXlmButton.click();

    // Assert the token field equals the native asset contract id for the configured network
    const expectedContractId = nativeAssetContractId();
    await expect(page.getByLabel("Token contract id")).toHaveValue(expectedContractId);
  });

  test("asserts the review step shows the token as XLM once the label bug is fixed", async ({
    page,
  }) => {
    const store: StreamStore = { streams: [] };

    await page.addInitScript(installFreighterStub, { address: TEST_ADDRESS });
    await stubApi(page, store);
    await stubChain(page, { address: TEST_ADDRESS });

    await page.goto("/create");

    // Click "Use native XLM as the token"
    await page.getByRole("button", { name: "Use native XLM as the token" }).click();
    await expect(page.getByLabel("Token contract id")).toHaveValue(nativeAssetContractId());

    // Fill valid form inputs to advance to the review step
    await page.getByLabel("Recipient address").fill(TEST_ADDRESS);
    await page.getByLabel("Amount").fill("100");

    const now = new Date();
    const start = new Date(now.getTime() + 60_000);
    const end = new Date(now.getTime() + 120_000);
    await page.getByLabel("Start").fill(toLocalInput(start));
    await page.getByLabel("End", { exact: true }).fill(toLocalInput(end));

    // Proceed to review
    await page.getByRole("button", { name: "Review stream" }).click();

    const review = page.getByRole("region", { name: "Review stream" });
    await expect(review).toBeVisible();

    // The review step shows the token contract and amount.
    // Once the label bug is fixed (where the native asset contract id is currently
    // mislabeled as USDC in TOKEN_METADATA), the token label in review will show XLM.
    test.fixme(
      true,
      "Blocked by label bug: native asset contract ID currently resolves to USDC instead of XLM in TOKEN_METADATA",
    );
    await expect(review).toContainText("XLM");
  });
});
