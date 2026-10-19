import { test, expect } from "@playwright/test";

import { stubApi, stubChain, streamingStream, type StreamStore } from "./fixtures/chain";
import { installFreighterStub, TEST_ADDRESS } from "./fixtures/freighter";

test("loads another page of streams from the dashboard", async ({ page }) => {
  const store: StreamStore = {
    streams: Array.from({ length: 26 }, (_, index) =>
      streamingStream({
        id: String(index + 1),
        sender: TEST_ADDRESS,
        recipient: TEST_ADDRESS,
      }),
    ),
  };

  await page.addInitScript(installFreighterStub, { address: TEST_ADDRESS });
  await stubApi(page, store);
  await stubChain(page, { address: TEST_ADDRESS });

  const incomingOffsets: number[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/streams" && url.searchParams.get("recipient") === TEST_ADDRESS) {
      incomingOffsets.push(Number(url.searchParams.get("offset")));
    }
  });

  await page.goto("/");

  const incoming = page.locator("section").first();
  await expect(incoming.getByRole("link")).toHaveCount(25);
  await expect(incoming.getByRole("link", { name: /#26/ })).toHaveCount(0);
  await expect(incoming.getByRole("button", { name: "Load more (1 remaining)" })).toBeVisible();

  await incoming.getByRole("button", { name: "Load more (1 remaining)" }).click();

  await expect.poll(() => incomingOffsets).toEqual([0, 25]);
  await expect(incoming.getByRole("link")).toHaveCount(26);
  await expect(incoming.getByRole("link", { name: /#26/ })).toBeVisible();
  await expect(incoming.getByRole("button", { name: /Load more/ })).toHaveCount(0);
});

test("rejects undocumented query parameters with 400 and omits total without includeTotal", async ({ page }) => {
  const store: StreamStore = { streams: [] };
  await stubApi(page, store);

  // Unknown parameters return 400
  const resBad = await page.request.get("http://localhost:3000/streams?foo=bar");
  expect(resBad.status()).toBe(400);

  // Without includeTotal, total is omitted
  const resNoTotal = await page.request.get("http://localhost:3000/streams");
  expect(resNoTotal.status()).toBe(200);
  const dataNoTotal = await resNoTotal.json();
  expect(dataNoTotal.total).toBeUndefined();

  // With includeTotal=true, total is returned
  const resWithTotal = await page.request.get("http://localhost:3000/streams?includeTotal=true");
  expect(resWithTotal.status()).toBe(200);
  const dataWithTotal = await resWithTotal.json();
  expect(dataWithTotal.total).toBe(0);
});