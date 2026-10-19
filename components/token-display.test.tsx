/* @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readTokenMetadataMock, getCachedTokenMetadataMock } = vi.hoisted(() => ({
  readTokenMetadataMock: vi.fn(),
  getCachedTokenMetadataMock: vi.fn(),
}));

vi.mock("@/lib/token-metadata", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/token-metadata")>();
  return {
    ...actual,
    readTokenMetadata: readTokenMetadataMock,
    getCachedTokenMetadata: getCachedTokenMetadataMock,
  };
});

import { TokenDisplay } from "@/components/token-display";
import { truncateAddress } from "@/lib/format";
import { KNOWN_TOKEN_METADATA } from "@/lib/token-metadata";

const KNOWN_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const UNKNOWN_TOKEN = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

describe("TokenDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedTokenMetadataMock.mockReturnValue(null);
  });

  it("shows the symbol for a known token with the address available on hover", () => {
    render(<TokenDisplay token={KNOWN_TOKEN} />);

    const symbolElement = screen.getByText(KNOWN_TOKEN_METADATA[KNOWN_TOKEN].symbol);
    expect(symbolElement).toBeDefined();
    expect(symbolElement.getAttribute("title")).toBe(KNOWN_TOKEN);
    expect(screen.queryByText("Unrecognised token")).toBeNull();
  });

  it("shows the symbol when an unknown token is dynamically resolved, with address on hover", async () => {
    readTokenMetadataMock.mockResolvedValueOnce({
      symbol: "EURC",
      name: "Euro Coin",
    });

    render(<TokenDisplay token={UNKNOWN_TOKEN} />);

    await waitFor(() => {
      const symbolElement = screen.getByText("EURC");
      expect(symbolElement).toBeDefined();
      expect(symbolElement.getAttribute("title")).toBe(UNKNOWN_TOKEN);
    });
    expect(screen.queryByText("Unrecognised token")).toBeNull();
  });

  it("falls back to truncated address with unrecognised marker when resolution fails", async () => {
    readTokenMetadataMock.mockRejectedValueOnce(new Error("RPC failure"));

    render(<TokenDisplay token={UNKNOWN_TOKEN} />);

    await waitFor(() => {
      const addressElement = screen.getByText(truncateAddress(UNKNOWN_TOKEN));
      expect(addressElement).toBeDefined();
      expect(addressElement.getAttribute("title")).toBe(UNKNOWN_TOKEN);
    });

    const marker = screen.getByText("Unrecognised token");
    expect(marker).toBeDefined();
    expect(marker.getAttribute("title")).toBe(`Unrecognised token contract: ${UNKNOWN_TOKEN}`);
  });
});
