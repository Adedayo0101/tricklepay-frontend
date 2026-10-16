import { describe, expect, it } from "vitest";

import { isStreamSortOption, sortStreams, STREAM_SORT_OPTIONS } from "@/lib/stream-sort";
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

describe("isStreamSortOption", () => {
  it("accepts every option the control offers", () => {
    for (const option of STREAM_SORT_OPTIONS) {
      expect(isStreamSortOption(option.value)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isStreamSortOption("id-ascending")).toBe(false);
    expect(isStreamSortOption("")).toBe(false);
  });
});

describe("sortStreams — default", () => {
  it("returns the streams in the order given, unchanged", () => {
    const streams = [stream({ id: "3" }), stream({ id: "1" }), stream({ id: "2" })];
    expect(sortStreams(streams, "default").map((s) => s.id)).toEqual(["3", "1", "2"]);
  });

  it("does not mutate the input array", () => {
    const streams = [stream({ id: "1" }), stream({ id: "2" })];
    const original = [...streams];
    sortStreams(streams, "default");
    expect(streams).toEqual(original);
  });
});

describe("sortStreams — end-soonest", () => {
  it("orders by end date ascending, soonest first", () => {
    const streams = [
      stream({ id: "late", endTime: "1700300000" }),
      stream({ id: "soonest", endTime: "1700100000" }),
      stream({ id: "middle", endTime: "1700200000" }),
    ];
    expect(sortStreams(streams, "end-soonest").map((s) => s.id)).toEqual([
      "soonest",
      "middle",
      "late",
    ]);
  });

  it("does not mutate the input array", () => {
    const streams = [stream({ id: "1", endTime: "200" }), stream({ id: "2", endTime: "100" })];
    const original = streams.map((s) => s.id);
    sortStreams(streams, "end-soonest");
    expect(streams.map((s) => s.id)).toEqual(original);
  });
});

describe("sortStreams — amount-largest", () => {
  it("orders by total amount descending, largest first", () => {
    const streams = [
      stream({ id: "small", totalAmount: "1000000" }),
      stream({ id: "largest", totalAmount: "500000000000" }),
      stream({ id: "medium", totalAmount: "50000000" }),
    ];
    expect(sortStreams(streams, "amount-largest").map((s) => s.id)).toEqual([
      "largest",
      "medium",
      "small",
    ]);
  });

  it("compares as BigInt, not float — an i128 amount beyond safe-integer range still orders correctly", () => {
    const streams = [
      // One stroop more than the other: a Number() comparison would consider
      // these equal, since both round to the same double once the value
      // exceeds Number.MAX_SAFE_INTEGER (9007199254740991).
      stream({ id: "bigger", totalAmount: "170141183460469231731687303715884105727" }),
      stream({ id: "smaller", totalAmount: "170141183460469231731687303715884105726" }),
    ];
    expect(sortStreams(streams, "amount-largest").map((s) => s.id)).toEqual([
      "bigger",
      "smaller",
    ]);
  });
});

describe("sortStreams — progress-most-complete", () => {
  it("orders by progress descending, most complete first", () => {
    const streams = [
      stream({ id: "just-started", progress: 100 }),
      stream({ id: "done", progress: 10000 }),
      stream({ id: "halfway", progress: 5000 }),
    ];
    expect(sortStreams(streams, "progress-most-complete").map((s) => s.id)).toEqual([
      "done",
      "halfway",
      "just-started",
    ]);
  });
});
