import { test, expect } from "@playwright/test";

import { stubApi, stubChain, type StreamStore } from "./fixtures/chain";
import { installFreighterStub, TEST_ADDRESS } from "./fixtures/freighter";

// Keep native date inputs, the theme, and freshness labels independent of the
// machine and wall clock used to capture the baselines.
test.use({ locale: "en-US", timezoneId: "UTC", colorScheme: "light" });

const screenshotOptions = {
  maxDiffPixelRatio: 0.05,
  // Next.js development tooling is not part of the application UI.
  style: "nextjs-portal { display: none !important; }",
};

test.describe("Visual Regression Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-01-01T12:00:00Z"));
    const store: StreamStore = { streams: [] };
    await page.addInitScript(installFreighterStub, { address: TEST_ADDRESS });
    await stubApi(page, store);
    await stubChain(page, { address: TEST_ADDRESS });
  });

  test("dashboard page renders clean responsive layout without visual shifts", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify key header, navigation, and dashboard regions exist
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // Verify wallet status indicator button is rendered
    await expect(page.getByRole("button", { name: /GAAZ|\.\.\./ })).toBeVisible();

    await expect(page.getByTestId("api-status")).toHaveAttribute("data-api-health", "reachable");
    await expect(page.getByText("Updated just now")).toHaveCount(2);

    // Take screenshot snapshot for visual regression baseline comparison
    await expect(page).toHaveScreenshot("dashboard-smoke.png", screenshotOptions);
  });

  test("create stream page renders form fields and actions in desktop and mobile viewports", async ({
    page,
  }) => {
    await page.goto("/create");

    await expect(page.getByLabel("Recipient address")).toBeVisible();
    await expect(page.getByLabel("Token contract id")).toBeVisible();
    await expect(page.getByLabel("Amount")).toBeVisible();
    await expect(page.getByRole("button", { name: /GAAZ|\.\.\./ })).toBeVisible();
    await expect(page.getByTestId("api-status")).toHaveAttribute("data-api-health", "reachable");

    // Snapshot of create page
    await expect(page).toHaveScreenshot("create-stream-smoke.png", screenshotOptions);

    // Verify mobile responsive layout (375x667 viewport)
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole("button", { name: "Review stream" })).toBeVisible();
    await expect(page).toHaveScreenshot("create-stream-mobile-smoke.png", screenshotOptions);
  });
});
