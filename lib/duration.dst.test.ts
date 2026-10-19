import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { addDurationToLocal, deriveDuration, durationFieldError, nowAsDatetimeLocal } from "./duration";

// Pin the time zone so the daylight saving cases below are the same on every
// machine and in CI. America/New_York springs forward on 2026-03-08 and falls
// back on 2026-11-01. Node picks up a changed TZ immediately.
const ORIGINAL_TZ = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/New_York";
});

afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("duration input across daylight saving", () => {
  it("sets the end from the start without shifting the wall clock when clocks spring forward", () => {
    expect(addDurationToLocal("2026-03-07T10:00", "1", "days")).toBe("2026-03-08T10:00");
  });

  it("keeps the same time of day for a week that crosses the fall back", () => {
    expect(addDurationToLocal("2026-10-31T09:00", "1", "weeks")).toBe("2026-11-07T09:00");
  });

  it("derives one day from an edited end across the 23 hour spring forward day", () => {
    expect(deriveDuration("2026-03-07T10:00", "2026-03-08T10:00")).toEqual({
      amount: "1",
      unit: "days",
    });
  });

  it("derives one week from an edited end across the 169 hour fall back week", () => {
    expect(deriveDuration("2026-10-31T09:00", "2026-11-07T09:00")).toEqual({
      amount: "1",
      unit: "weeks",
    });
  });

  it("round trips: the derived duration rebuilds the same end", () => {
    const start = "2026-03-01T08:30";
    const end = addDurationToLocal(start, "2", "weeks")!;
    const derived = deriveDuration(start, end)!;
    expect(addDurationToLocal(start, derived.amount, derived.unit)).toBe(end);
  });

  it("rejects invalid amounts and produces no end", () => {
    expect(durationFieldError("1.5")).toBeDefined();
    expect(durationFieldError("-3")).toBeDefined();
    expect(addDurationToLocal("2026-03-07T10:00", "abc", "days")).toBeNull();
  });

  it("formats a controlled clock in local wall time just before the spring forward", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T06:59:00Z"));
    expect(nowAsDatetimeLocal()).toBe("2026-03-08T01:59");
  });
});
