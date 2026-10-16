// A small set of named schedule shortcuts for the create-stream form: pick
// one and the Start/End/Cliff fields fill themselves in, the same way the
// Duration field fills in End alone from Start (see lib/duration.ts). Each
// preset's end and cliff are expressed as a duration from start and resolved
// with addDurationToLocal, so they get the same calendar arithmetic — and the
// same day-overflow behaviour — as typing the equivalent duration by hand.

import { addDurationToLocal, nowAsDatetimeLocal, type DurationUnit } from "@/lib/duration";

export interface SchedulePreset {
  id: string;
  label: string;
  /** Offset from start to end. */
  duration: { amount: string; unit: DurationUnit };
  /** Offset from start to cliff, or `null` for a linear schedule with no cliff. */
  cliff: { amount: string; unit: DurationUnit } | null;
}

export const SCHEDULE_PRESETS: readonly SchedulePreset[] = [
  {
    id: "one-month-linear",
    label: "1 month, linear",
    duration: { amount: "1", unit: "months" },
    cliff: null,
  },
  {
    id: "one-year-three-month-cliff",
    label: "1 year, 3-month cliff",
    duration: { amount: "1", unit: "years" },
    cliff: { amount: "3", unit: "months" },
  },
  {
    id: "four-years-one-year-cliff",
    label: "4 years, 1-year cliff",
    duration: { amount: "4", unit: "years" },
    cliff: { amount: "1", unit: "years" },
  },
];

export interface AppliedSchedule {
  start: string;
  end: string;
  /**
   * `null` for a preset with no cliff. The form represents "no cliff" as an
   * empty Cliff field, not as a value equal to start — the caller is
   * responsible for that mapping (see useCreateStreamForm's applyPreset).
   */
  cliff: string | null;
}

/**
 * Resolves a preset into concrete start/end/cliff `datetime-local` values.
 *
 * Uses `currentStart` as the base when it's already filled in, so applying a
 * preset after choosing a start date keeps that date rather than silently
 * replacing it, and otherwise defaults to now.
 *
 * Returns `null` only if resolving fails outright (the computed start itself
 * does not parse), which should not happen for a value this function also
 * produces when none was given.
 */
export function applySchedulePreset(
  preset: SchedulePreset,
  currentStart: string,
  now: Date = new Date(),
): AppliedSchedule | null {
  const start = currentStart || nowAsDatetimeLocal(now);

  const end = addDurationToLocal(start, preset.duration.amount, preset.duration.unit);
  if (end === null) return null;

  if (!preset.cliff) {
    return { start, end, cliff: null };
  }

  const cliff = addDurationToLocal(start, preset.cliff.amount, preset.cliff.unit);
  if (cliff === null) return null;

  return { start, end, cliff };
}
