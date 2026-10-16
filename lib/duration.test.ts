import { describe, expect, it } from "vitest";

import {
  addDurationToLocal,
  deriveDuration,
  DURATION_UNITS,
  durationFieldError,
  isDurationUnit,
} from "./duration";

describe("durationFieldError", () => {
  it("accepts an empty value — duration is optional", () => {
    expect(durationFieldError("")).toBeUndefined();
  });

  it("accepts a positive whole number", () => {
    expect(durationFieldError("30")).toBeUndefined();
    expect(durationFieldError("1")).toBeUndefined();
  });

  it("rejects zero", () => {
    expect(durationFieldError("0")).toBe("Duration must be greater than zero.");
  });

  it.each(["-5", "1.5", "abc", "1e3"])(
    "rejects %s as not a whole number",
    (value) => {
      expect(durationFieldError(value)).toBe("Duration must be a whole number (e.g. 30).");
    },
  );

  it("tolerates surrounding whitespace around an otherwise valid number", () => {
    expect(durationFieldError(" 30 ")).toBeUndefined();
  });
});

describe("isDurationUnit", () => {
  it("accepts every unit the form offers", () => {
    for (const unit of DURATION_UNITS) {
      expect(isDurationUnit(unit.value)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isDurationUnit("minutes")).toBe(false);
    expect(isDurationUnit("")).toBe(false);
  });
});

describe("addDurationToLocal", () => {
  const START = "2026-08-27T10:00";

  it("adds whole days", () => {
    expect(addDurationToLocal(START, "30", "days")).toBe("2026-09-26T10:00");
  });

  it("adds whole weeks as 7-day multiples", () => {
    expect(addDurationToLocal(START, "2", "weeks")).toBe("2026-09-10T10:00");
  });

  it("adds whole months with calendar arithmetic", () => {
    expect(addDurationToLocal(START, "1", "months")).toBe("2026-09-27T10:00");
  });

  it("adds whole years with calendar arithmetic", () => {
    expect(addDurationToLocal(START, "1", "years")).toBe("2027-08-27T10:00");
  });

  it("carries a month-end overflow the same way JS Date does, rather than clamping it", () => {
    // Jan 31 + 1 month has no Feb 31st, so it lands on Mar 3 (2027 is not a
    // leap year): this is JS Date's own setMonth behaviour, not a special
    // case added for duration.
    expect(addDurationToLocal("2027-01-31T09:00", "1", "months")).toBe("2027-03-03T09:00");
  });

  it("returns null when start is empty", () => {
    expect(addDurationToLocal("", "30", "days")).toBeNull();
  });

  it("returns null when the amount is invalid", () => {
    expect(addDurationToLocal(START, "0", "days")).toBeNull();
    expect(addDurationToLocal(START, "abc", "days")).toBeNull();
    expect(addDurationToLocal(START, "", "days")).toBeNull();
  });

  it("returns null when start does not parse as a date", () => {
    expect(addDurationToLocal("not-a-date", "30", "days")).toBeNull();
  });
});

describe("deriveDuration", () => {
  const START = "2026-08-27T10:00";

  it("derives exact days", () => {
    expect(deriveDuration(START, "2026-09-26T10:00")).toEqual({
      amount: "30",
      unit: "days",
    });
  });

  it("derives exact weeks when multiple of 7 days with weeks preferred", () => {
    expect(deriveDuration(START, "2026-09-10T10:00", "weeks")).toEqual({
      amount: "2",
      unit: "weeks",
    });
  });

  it("derives exact months", () => {
    expect(deriveDuration(START, "2026-09-27T10:00")).toEqual({
      amount: "1",
      unit: "months",
    });
  });

  it("derives exact years", () => {
    expect(deriveDuration(START, "2027-08-27T10:00")).toEqual({
      amount: "1",
      unit: "years",
    });
  });

  it("returns null when end is equal to or before start", () => {
    expect(deriveDuration(START, START)).toBeNull();
    expect(deriveDuration(START, "2026-08-26T10:00")).toBeNull();
  });

  it("returns null when dates are empty or invalid", () => {
    expect(deriveDuration("", "2026-09-26T10:00")).toBeNull();
    expect(deriveDuration(START, "")).toBeNull();
    expect(deriveDuration("invalid", "2026-09-26T10:00")).toBeNull();
  });
});
