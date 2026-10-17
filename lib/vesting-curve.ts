// Generates the data points for the vesting curve chart on the stream detail
// page. Pure, so it can be tested without React and without SVG.

import { vestedAmount } from "@/lib/vesting";

export interface CurvePoint {
  /** Unix seconds, as a number (for charting arithmetic). */
  t: number;
  /** Vested amount in base units, as a bigint. */
  vested: bigint;
}

/**
 * Generates an array of (time, vested) points that accurately represent the
 * linear-plus-cliff vesting curve.
 *
 * Key points are always included so the cliff step renders as a vertical line
 * rather than a diagonal, and the start/end are always on the curve:
 *   - startTime − 1 s  (always 0, for the flat left segment)
 *   - startTime        (0, since start itself vests 0)
 *   - cliffTime − 1 s  (still 0, if a cliff exists)
 *   - cliffTime        (the cliff jump, if a cliff exists)
 *   - endTime          (totalAmount)
 *
 * Between those anchors, `sampleCount` additional evenly-spaced points fill
 * the linear segment.
 *
 * @param totalAmount  Stream total in base units.
 * @param startTime    Unix seconds (bigint).
 * @param endTime      Unix seconds (bigint).
 * @param cliffTime    Unix seconds (bigint). Equal to startTime means no cliff.
 * @param sampleCount  Number of points in the linear segment (default 60).
 */
export function vestingCurvePoints(
  totalAmount: bigint,
  startTime: bigint,
  endTime: bigint,
  cliffTime: bigint,
  sampleCount = 60,
): CurvePoint[] {
  const hasCliff = cliffTime > startTime;
  const duration = endTime - startTime;

  // Anchor timestamps (as numbers for easy Set deduplication).
  const anchors = new Set<number>([
    Number(startTime) - 1,
    Number(startTime),
    Number(endTime),
  ]);

  if (hasCliff) {
    anchors.add(Number(cliffTime) - 1);
    anchors.add(Number(cliffTime));
  }

  // Evenly-spaced samples across [startTime, endTime].
  if (duration > 0n) {
    for (let i = 0; i <= sampleCount; i++) {
      const t = Number(startTime) + Math.round((Number(duration) * i) / sampleCount);
      anchors.add(t);
    }
  }

  return [...anchors]
    .sort((a, b) => a - b)
    .map((t) => ({
      t,
      vested: vestedAmount(totalAmount, startTime, endTime, cliffTime, BigInt(t)),
    }));
}
