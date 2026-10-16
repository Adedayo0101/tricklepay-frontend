import { describe, expect, it } from "vitest";

import { filterStreamsByAddress, matchesAddressQuery } from "@/lib/stream-search";
import type { StreamView } from "@/types/stream";

function stream(overrides: Partial<StreamView> = {}): StreamView {
  return {
    id: "1",
    sender: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    recipient: "GBBZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
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

describe("matchesAddressQuery", () => {
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
});

describe("filterStreamsByAddress", () => {
  const streams = [
    stream({ id: "1", sender: "GAAA...SENDER1", recipient: "GBBB...RECIPIENT1" }),
    stream({ id: "2", sender: "GCCC...SENDER2", recipient: "GDDD...RECIPIENT2" }),
    stream({ id: "3", sender: "GEEE...SENDER3", recipient: "GBBB...RECIPIENT1" }),
  ];

  it("returns every stream for an empty query — clearing search restores the list", () => {
    expect(filterStreamsByAddress(streams, "")).toEqual(streams);
  });

  it("returns only streams where the fragment appears on either side", () => {
    const result = filterStreamsByAddress(streams, "RECIPIENT1");
    expect(result.map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("returns a single match", () => {
    const result = filterStreamsByAddress(streams, "SENDER2");
    expect(result.map((s) => s.id)).toEqual(["2"]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterStreamsByAddress(streams, "no-such-address")).toEqual([]);
  });

  it("is case-insensitive across the whole list", () => {
    const result = filterStreamsByAddress(streams, "sender2");
    expect(result.map((s) => s.id)).toEqual(["2"]);
  });
});
