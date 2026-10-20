/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getStreamEvents: vi.fn() };
});

import { getStreamEvents } from "@/lib/api";
import type { StreamEvent } from "@/types/stream";

import { useStreamEvents } from "./use-stream-events";

const SAMPLE_EVENTS: StreamEvent[] = [
  {
    eventId: "0000000100000000-0001",
    kind: "created",
    streamId: "123",
    ledger: 1000,
    txHash: "1111111111111111111111111111111111111111111111111111111111111111",
    totalAmount: "10000000",
    closedAt: "1700000000",
  },
];

describe("useStreamEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state and resolves stream events", async () => {
    let resolveEvents!: (events: StreamEvent[]) => void;
    vi.mocked(getStreamEvents).mockReturnValue(
      new Promise<StreamEvent[]>((resolve) => {
        resolveEvents = resolve;
      }),
    );

    const { result } = renderHook(() => useStreamEvents("123"));
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolveEvents(SAMPLE_EVENTS);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.events).toEqual(SAMPLE_EVENTS);
    expect(result.current.error).toBeNull();
  });

  it("handles an empty event history", async () => {
    vi.mocked(getStreamEvents).mockResolvedValue([]);

    const { result } = renderHook(() => useStreamEvents("123"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.events).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error when getStreamEvents fails and retries on refresh", async () => {
    vi.mocked(getStreamEvents).mockRejectedValueOnce(new Error("Failed to load events"));

    const { result } = renderHook(() => useStreamEvents("123"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe("Failed to load events");

    vi.mocked(getStreamEvents).mockResolvedValueOnce(SAMPLE_EVENTS);
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.events).toEqual(SAMPLE_EVENTS);
  });
});
