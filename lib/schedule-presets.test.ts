import { describe, expect, it } from "vitest";

import {
  applySchedulePreset,
  SCHEDULE_PRESETS,
  type SchedulePreset,
} from "./schedule-presets";

describe("SCHEDULE_PRESETS", () => {
  it("defines the three standard presets", () => {
    const ids = SCHEDULE_PRESETS.map((p) => p.id);
    expect(ids).toEqual([
      "one-month-linear",
      "one-year-three-month-cliff",
      "four-years-one-year-cliff",
    ]);
  });
});

describe("applySchedulePreset", () => {
  const BASE_START = "2026-08-27T10:00";

  it("applies the 1 month, linear preset without a cliff", () => {
    const preset = SCHEDULE_PRESETS.find((p) => p.id === "one-month-linear")!;
    const schedule = applySchedulePreset(preset, BASE_START);

    expect(schedule).toEqual({
      start: BASE_START,
      end: "2026-09-27T10:00",
      cliff: null,
    });
  });

  it("applies the 1 year, 3-month cliff preset", () => {
    const preset = SCHEDULE_PRESETS.find((p) => p.id === "one-year-three-month-cliff")!;
    const schedule = applySchedulePreset(preset, BASE_START);

    expect(schedule).toEqual({
      start: BASE_START,
      end: "2027-08-27T10:00",
      cliff: "2026-11-27T10:00",
    });
  });

  it("applies the 4 years, 1-year cliff preset", () => {
    const preset = SCHEDULE_PRESETS.find((p) => p.id === "four-years-one-year-cliff")!;
    const schedule = applySchedulePreset(preset, BASE_START);

    expect(schedule).toEqual({
      start: BASE_START,
      end: "2030-08-27T10:00",
      cliff: "2027-08-27T10:00",
    });
  });

  it("defaults to the provided 'now' instant when currentStart is empty", () => {
    const preset = SCHEDULE_PRESETS.find((p) => p.id === "one-month-linear")!;
    const now = new Date("2026-01-15T12:00:00");
    const schedule = applySchedulePreset(preset, "", now);

    expect(schedule).not.toBeNull();
    expect(schedule?.start).toBe("2026-01-15T12:00");
    expect(schedule?.end).toBe("2026-02-15T12:00");
    expect(schedule?.cliff).toBeNull();
  });

  it("returns null if the start date fails to parse", () => {
    const preset = SCHEDULE_PRESETS.find((p) => p.id === "one-month-linear")!;
    expect(applySchedulePreset(preset, "invalid-date")).toBeNull();
  });
});

