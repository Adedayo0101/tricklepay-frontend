import { afterEach, describe, expect, it } from "vitest";

import {
  filterStreamsByAddress,
  filterStreamsByQuery,
  matchesAddressQuery,
  matchesStreamQuery,
} from "@/lib/stream-search";
import { clearTokenMetadataCache, setCachedTokenMetadata } from "@/lib/token-metadata";
import type { StreamView } from "@/types/stream";

const USDC_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const OTHER_TOKEN = "CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";

function stream(overrides: Partial<StreamView> = {}): StreamView {
  return {
    id: "420",
    sender: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    recipient: "GBBZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    token: USDC_TOKEN,
    totalAmount: "1000000000",
    withdrawn: "0",
    vested: "0",
    withdrawable: "0",
    locked: "1000000000",
    startTime: "1700000000",
    endTime: "1700100000",
    cliffTime: "1700000000",
    cancelled: false,
    status: "streaming",
    progress: 0,
    ...overrides,
  };
}

afterEach(() => {
  clearTokenMetadataCache();
});

describe("matchesStreamQuery / matchesAddressQuery", () => {
  const s = stream();

  it("matches everything when the query is empty", () => {
    expect(matchesAddressQuery(s, "")).toBe(true);
  });

  it("matches everything when the query is only whitespace", () => {
    expect(matchesAddressQuery(s, "   ")).toBe(true);
  });

  it("matches a fragment of the sender address", () => {
    expect(matchesAddressQuery(s, "GAAZI4TCR3TY")).toBe(true);
  });

  it("matches a fragment of the recipient address", () => {
    expect(matchesAddressQuery(s, "GBBZI4TCR3TY")).toBe(true);
  });

  it("matches the full address", () => {
    expect(matchesAddressQuery(s, s.sender)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesAddressQuery(s, s.sender.toLowerCase())).toBe(true);
    expect(matchesAddressQuery(s, s.recipient.toLowerCase())).toBe(true);
    expect(matchesAddressQuery(s, "gaazi4tcr3ty")).toBe(true);
  });

  it("tolerates surrounding whitespace in the query", () => {
    expect(matchesAddressQuery(s, `  ${s.sender}  `)).toBe(true);
  });

  it("does not match an address that is not on this stream", () => {
    expect(
      matchesAddressQuery(s, "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"),
    ).toBe(false);
  });

  it("does not match a fragment that spans sender and recipient", () => {
    // The last 4 of sender and the first 4 of recipient, concatenated —
    // never a real substring of either address on its own.
    const spanning = s.sender.slice(-4) + s.recipient.slice(0, 4);
    expect(matchesAddressQuery(s, spanning)).toBe(false);
  });

  it("matches the stream id by exact value or prefix (with or without leading #)", () => {
    expect(matchesStreamQuery(s, "420")).toBe(true);
    expect(matchesStreamQuery(s, "42")).toBe(true);
    expect(matchesStreamQuery(s, "#420")).toBe(true);
    expect(matchesStreamQuery(s, "#42")).toBe(true);
    // Non-prefix of id should not match as a stream id
    expect(matchesStreamQuery(stream({ id: "142", token: OTHER_TOKEN }), "42")).toBe(false);
  });

  it("matches the token contract address or a fragment of it", () => {
    expect(matchesStreamQuery(s, USDC_TOKEN)).toBe(true);
    expect(matchesStreamQuery(s, "CDLZFC3SYJYD")).toBe(true);
    expect(matchesStreamQuery(s, "cdlzfc3syjyd")).toBe(true);
  });

  it("matches a known or cached token symbol case-insensitively", () => {
    expect(matchesStreamQuery(s, "USDC")).toBe(true);
    expect(matchesStreamQuery(s, "usdc")).toBe(true);
    expect(matchesStreamQuery(s, "usd")).toBe(true);

    const customStream = stream({ id: "99", token: OTHER_TOKEN });
    expect(matchesStreamQuery(customStream, "EURC")).toBe(false);

    setCachedTokenMetadata(OTHER_TOKEN, { name: "Euro Coin", symbol: "EURC" });
    expect(matchesStreamQuery(customStream, "EURC")).toBe(true);
    expect(matchesStreamQuery(customStream, "eurc")).toBe(true);
  });
});

describe("filterStreamsByQuery / filterStreamsByAddress", () => {
  const streams = [
    stream({
      id: "101",
      sender: "GAAA...SENDER1",
      recipient: "GBBB...RECIPIENT1",
      token: USDC_TOKEN,
    }),
    stream({
      id: "202",
      sender: "GCCC...SENDER2",
      recipient: "GDDD...RECIPIENT2",
      token: OTHER_TOKEN,
    }),
    stream({
      id: "103",
      sender: "GEEE...SENDER3",
      recipient: "GBBB...RECIPIENT1",
      token: OTHER_TOKEN,
    }),
  ];

  it("returns every stream for an empty query — clearing search restores the list", () => {
    expect(filterStreamsByAddress(streams, "")).toEqual(streams);
  });

  it("returns only streams where the fragment appears on either side", () => {
    const result = filterStreamsByAddress(streams, "RECIPIENT1");
    expect(result.map((s) => s.id)).toEqual(["101", "103"]);
  });

  it("returns a single match by counterparty address", () => {
    const result = filterStreamsByAddress(streams, "SENDER2");
    expect(result.map((s) => s.id)).toEqual(["202"]);
  });

  it("filters by stream id exact or prefix", () => {
    expect(filterStreamsByQuery(streams, "202").map((s) => s.id)).toEqual(["202"]);
    expect(filterStreamsByQuery(streams, "10").map((s) => s.id)).toEqual(["101", "103"]);
  });

  it("filters by token symbol and token contract address", () => {
    expect(filterStreamsByQuery(streams, "USDC").map((s) => s.id)).toEqual(["101"]);
    expect(filterStreamsByQuery(streams, "CBBBBBBB").map((s) => s.id)).toEqual(["202", "103"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterStreamsByAddress(streams, "no-such-address")).toEqual([]);
  });

  it("is case-insensitive across the whole list", () => {
    const result = filterStreamsByAddress(streams, "sender2");
    expect(result.map((s) => s.id)).toEqual(["202"]);
  });
});
