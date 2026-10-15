import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConfig = vi.hoisted(() => ({ network: "testnet" }));

vi.mock("@/lib/config", () => ({ config: mockConfig }));

import { NetworkBadge } from "./network-badge";

function render(network: string): string {
  mockConfig.network = network;
  return renderToStaticMarkup(<NetworkBadge />);
}

describe("NetworkBadge", () => {
  beforeEach(() => {
    mockConfig.network = "testnet";
  });

  it("renders the configured network", () => {
    const html = render("testnet");

    expect(html).toContain('data-network="testnet"');
    expect(html).toContain(">testnet<");
  });

  it("renders mainnet when configured for mainnet", () => {
    const html = render("mainnet");

    expect(html).toContain('data-network="mainnet"');
    expect(html).toContain(">mainnet<");
    expect(html).not.toContain("testnet");
  });

  it("visually distinguishes a test network", () => {
    const html = render("testnet");

    expect(html).toContain('data-test-network="true"');
    expect(html).toContain("text-amber-300");
  });

  it("does not apply the test-network styling to mainnet", () => {
    const html = render("mainnet");

    expect(html).toContain('data-test-network="false"');
    expect(html).not.toContain("amber");
  });
});
