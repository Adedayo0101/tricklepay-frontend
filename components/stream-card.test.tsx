/* @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatTime } from "@/lib/format";
import type { StreamView } from "@/types/stream";

import { StreamCard } from "./stream-card";

describe("StreamCard", () => {
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
    endTime: "1600003600",
    cliffTime: "0",
    cancelled: false,
    status: "streaming",
    progress: 0,
  };

  it("renders pending status correctly", () => {
    const { container } = render(<StreamCard stream={{ ...baseStream, status: "pending" }} />);
    expect(container.textContent?.toLowerCase()).toContain("pending");
  });

  it("renders streaming status correctly", () => {
    const { container } = render(<StreamCard stream={{ ...baseStream, status: "streaming" }} />);
    expect(container.textContent?.toLowerCase()).toContain("streaming");
  });

  it("renders completed status correctly", () => {
    const { container } = render(<StreamCard stream={{ ...baseStream, status: "completed" }} />);
    expect(container.textContent?.toLowerCase()).toContain("completed");
  });

  it("renders cancelled status correctly", () => {
    const { container } = render(
      <StreamCard stream={{ ...baseStream, status: "cancelled", cancelled: true }} />,
    );
    expect(container.textContent?.toLowerCase()).toContain("cancelled");
  });

  describe("cliff", () => {
    const NOW = 1_700_000_000;
    const withCliff = (cliffTime: number): StreamView => ({
      ...baseStream,
      startTime: String(NOW - 1_000),
      endTime: String(NOW + 100_000),
      cliffTime: String(cliffTime),
    });

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NOW * 1000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the cliff date and that it has not been reached yet", () => {
      const cliffTime = NOW + 3_600;
      const { getByTestId } = render(<StreamCard stream={withCliff(cliffTime)} />);
      const row = getByTestId("stream-card-cliff");
      expect(row.textContent).toContain("Cliff");
      expect(row.textContent).toContain(formatTime(String(cliffTime)));
      expect(row.textContent).toContain("cliff in 1h 0m");
      expect(row.textContent).not.toContain("passed");
    });

    it("shows the cliff date and that it has passed", () => {
      const cliffTime = NOW - 500;
      const { getByTestId } = render(<StreamCard stream={withCliff(cliffTime)} />);
      const row = getByTestId("stream-card-cliff");
      expect(row.textContent).toContain(formatTime(String(cliffTime)));
      expect(row.textContent).toContain("cliff passed");
    });

    it("omits the cliff when it matches the start", () => {
      const stream = withCliff(NOW - 1_000);
      const { queryByTestId } = render(<StreamCard stream={stream} />);
      expect(queryByTestId("stream-card-cliff")).toBeNull();
    });

    it("omits the cliff when it is not after the start", () => {
      const { queryByTestId } = render(<StreamCard stream={baseStream} />);
      expect(queryByTestId("stream-card-cliff")).toBeNull();
    });
  });
});
