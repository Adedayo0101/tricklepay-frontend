/* @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatAmount, formatTokenAmount } from "@/lib/format";
import type { StreamView } from "@/types/stream";

import { StreamCard } from "./stream-card";
import { StreamTable } from "./stream-table";

// Amounts are strings in base units (7 decimals). Number.MAX_SAFE_INTEGER is
// 9007199254740991, so MAX_SAFE + 2 is the first odd value a double cannot
// hold: Number("9007199254740993") silently becomes 9007199254740992.
const BEYOND_SAFE = "9007199254740993";
const BEYOND_SAFE_DISPLAY = "900719925.4740993";
// i128::MAX, the largest amount the contract can hold.
const I128_MAX = "170141183460469231731687303715884105727";
const I128_MAX_DISPLAY = "17014118346046923173168730371588.4105727";

const baseStream: StreamView = {
  id: "123",
  sender: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  recipient: "GBBZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  token: "USDC",
  totalAmount: "1000",
  withdrawn: "0",
  vested: "0",
  withdrawable: "0",
  locked: "1000",
  startTime: "1600000000",
  endTime: String(Math.floor(Date.now() / 1000) + 3600),
  cliffTime: "0",
  cancelled: false,
  status: "streaming",
  progress: 0,
};

describe("amount precision", () => {
  it("proves the fixture is beyond what a number can represent", () => {
    expect(Number(BEYOND_SAFE) > Number.MAX_SAFE_INTEGER).toBe(true);
    expect(String(Number(BEYOND_SAFE))).not.toBe(BEYOND_SAFE);
  });

  it("formats amounts as strings, never as numbers", () => {
    expect(typeof formatAmount(BEYOND_SAFE)).toBe("string");
    expect(typeof formatTokenAmount(BEYOND_SAFE, "USDC")).toBe("string");
  });

  it("keeps every digit of a value beyond the safe integer range", () => {
    expect(formatAmount(BEYOND_SAFE)).toBe(BEYOND_SAFE_DISPLAY);
    expect(formatAmount(I128_MAX)).toBe(I128_MAX_DISPLAY);
  });

  it("renders full precision in the stream card", () => {
    const { container } = render(
      <StreamCard
        stream={{ ...baseStream, totalAmount: BEYOND_SAFE, withdrawable: I128_MAX }}
      />,
    );

    expect(container.textContent).toContain(BEYOND_SAFE_DISPLAY);
    expect(container.textContent).toContain(I128_MAX_DISPLAY);
  });

  it("renders full precision in the stream table", () => {
    const { container } = render(
      <StreamTable
        streams={[{ ...baseStream, totalAmount: BEYOND_SAFE, withdrawable: I128_MAX }]}
      />,
    );

    expect(container.textContent).toContain(BEYOND_SAFE_DISPLAY);
    expect(container.textContent).toContain(I128_MAX_DISPLAY);
  });

  it("does not render a number-converted (rounded) value", () => {
    const rounded = formatAmount(String(Number(BEYOND_SAFE)));
    const { container } = render(
      <StreamCard stream={{ ...baseStream, totalAmount: BEYOND_SAFE }} />,
    );

    expect(rounded).not.toBe(BEYOND_SAFE_DISPLAY);
    expect(container.textContent).not.toContain(rounded);
  });
});
