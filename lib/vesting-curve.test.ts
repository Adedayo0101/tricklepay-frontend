import { describe, expect, it } from "vitest";

import { vestingCurvePoints } from "@/lib/vesting-curve";

const TOTAL = 1_000_000_000n;
const START = 1_000n;
const END = 1_100n;
const CLIFF = START + 30n;

describe("vestingCurvePoints", () => {
  it("first point is before start with zero vested", () => {
    const pts = vestingCurvePoints(TOTAL, START, END, START);
    expect(pts[0].t).toBe(Number(START) - 1);
    expect(pts[0].vested).toBe(0n);
  });

  it("last point is at end with full amount vested", () => {
    const pts = vestingCurvePoints(TOTAL, START, END, START);
    const last = pts[pts.length - 1];
    expect(last.t).toBe(Number(END));
    expect(last.vested).toBe(TOTAL);
  });

  it("includes cliff step: point just before cliff is 0, at cliff is non-zero", () => {
    const pts = vestingCurvePoints(TOTAL, START, END, CLIFF);
    const beforeCliff = pts.find((p) => p.t === Number(CLIFF) - 1);
    const atCliff = pts.find((p) => p.t === Number(CLIFF));
    expect(beforeCliff?.vested).toBe(0n);
    expect(atCliff?.vested).toBeGreaterThan(0n);
  });

  it("points are sorted by time", () => {
    const pts = vestingCurvePoints(TOTAL, START, END, CLIFF);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].t).toBeGreaterThanOrEqual(pts[i - 1].t);
    }
  });

  it("vested is monotonically non-decreasing", () => {
    const pts = vestingCurvePoints(TOTAL, START, END, CLIFF);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].vested).toBeGreaterThanOrEqual(pts[i - 1].vested);
    }
  });

  it("no cliff: does not add cliff-step anchors", () => {
    // When cliffTime === startTime there is no cliff.
    const withCliff = vestingCurvePoints(TOTAL, START, END, CLIFF);
    const noCliff = vestingCurvePoints(TOTAL, START, END, START);
    // No-cliff version has fewer or equal points (missing the two cliff anchors).
    expect(noCliff.length).toBeLessThanOrEqual(withCliff.length);
  });

  it("never exceeds totalAmount", () => {
    const pts = vestingCurvePoints(TOTAL, START, END, CLIFF);
    for (const p of pts) {
      expect(p.vested).toBeLessThanOrEqual(TOTAL);
    }
  });
});
