import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FormDraft } from "@/types/form";

import { endFieldError, validateCreateStreamForm } from "./create-stream-validation";

const validDraft: FormDraft = {
  recipient: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  token: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  amount: "12.5",
  start: "2026-08-27T10:00",
  end: "2026-08-27T12:00",
  cliff: "",
  durationAmount: "",
  durationUnit: "days",
};

// The end time is checked against the clock, so every test runs at a fixed
// moment instead of whenever the suite happens to run.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-27T09:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("validateCreateStreamForm", () => {
  it("accepts a complete valid form", () => {
    expect(validateCreateStreamForm(validDraft)).toEqual({
      recipient: undefined,
      token: undefined,
      amount: undefined,
      start: undefined,
      end: undefined,
      cliff: undefined,
    });
  });

  it("returns the existing messages for required values and date ordering", () => {
    expect(validateCreateStreamForm({ ...validDraft, amount: "", start: "", end: "" })).toMatchObject({
      amount: "Amount is required.",
      start: "Start date is required.",
      end: "End date is required.",
    });
    expect(validateCreateStreamForm({ ...validDraft, end: validDraft.start })).toMatchObject({
      end: "End must be after start.",
    });
  });

  it("rejects an end time before the start", () => {
    expect(
      validateCreateStreamForm({
        ...validDraft,
        start: "2026-08-27T12:00",
        end: "2026-08-27T10:00",
      }),
    ).toMatchObject({
      end: "End must be after start.",
    });
  });

  it("rejects a cliff outside the window", () => {
    expect(validateCreateStreamForm({ ...validDraft, cliff: "2026-08-27T09:00" })).toMatchObject({
      cliff: "Cliff must fall between start and end.",
    });
    expect(validateCreateStreamForm({ ...validDraft, cliff: "2026-08-27T13:00" })).toMatchObject({
      cliff: "Cliff must fall between start and end.",
    });
  });

  it("rejects a form whose end has already passed", () => {
    vi.setSystemTime(new Date("2026-08-27T13:00"));
    expect(validateCreateStreamForm(validDraft)).toMatchObject({
      end: "End must be in the future.",
    });
  });
});

describe("endFieldError against the current clock", () => {
  // Datetime values carry seconds so the edges can sit one second apart.
  const NOW = "2026-08-27T12:00:00";
  const START = "2026-08-27T11:00:00";

  beforeEach(() => {
    vi.setSystemTime(new Date(NOW));
  });

  it("rejects an end exactly at the current time", () => {
    expect(endFieldError(START, "2026-08-27T12:00:00")).toBe("End must be in the future.");
  });

  it("rejects an end one second before the current time", () => {
    expect(endFieldError(START, "2026-08-27T11:59:59")).toBe("End must be in the future.");
  });

  it("accepts an end one second after the current time", () => {
    expect(endFieldError(START, "2026-08-27T12:00:01")).toBeUndefined();
  });

  it("applies with no start entered yet", () => {
    expect(endFieldError("", "2026-08-27T12:00:00")).toBe("End must be in the future.");
    expect(endFieldError("", "2026-08-27T12:00:01")).toBeUndefined();
  });

  it("follows the clock: a future end becomes invalid once that moment passes", () => {
    const end = "2026-08-27T12:00:01";
    expect(endFieldError(START, end)).toBeUndefined();
    vi.advanceTimersByTime(1000);
    expect(endFieldError(START, end)).toBe("End must be in the future.");
  });

  it("still reports an end before the start as an ordering problem first", () => {
    expect(endFieldError("2026-08-27T11:30:00", "2026-08-27T11:00:00")).toBe(
      "End must be after start.",
    );
  });
});

describe("validateCreateStreamForm — duration", () => {
  it("passes a complete form with no duration entered", () => {
    expect(validateCreateStreamForm(validDraft).durationAmount).toBeUndefined();
  });

  it("blocks submission on an invalid duration even though every other field is valid", () => {
    expect(
      validateCreateStreamForm({ ...validDraft, durationAmount: "0" }).durationAmount,
    ).toBe("Duration must be greater than zero.");
    expect(
      validateCreateStreamForm({ ...validDraft, durationAmount: "abc" }).durationAmount,
    ).toBe("Duration must be a whole number (e.g. 30).");
  });

  it("passes a valid duration", () => {
    expect(
      validateCreateStreamForm({ ...validDraft, durationAmount: "30" }).durationAmount,
    ).toBeUndefined();
  });
});
