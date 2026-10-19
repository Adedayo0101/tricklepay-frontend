import type { JSX } from "react";

export interface ProgressBarProps {
  /** Progress value in basis points (0–10 000), matching the contract's figure. */
  value: number;
  /** Accessible label for screen readers. */
  label?: string;
  /**
   * Marks the cliff on the bar. `position` is where it falls along the whole
   * bar in basis points (0–10 000); `label` is the visible text and the
   * accessible description. Omit for a stream without a cliff, which renders
   * the plain bar.
   */
  cliff?: { position: number; label: string };
}

/**
 * A thin progress bar. `value` is in basis points (0 to 10000), matching the
 * contract's progress figure. With `cliff`, a tick on the bar and a label
 * beneath it show when withdrawals begin, so a stream sitting at zero reads as
 * waiting rather than stuck.
 */
export function ProgressBar({
  value,
  label = "Stream vesting progress",
  cliff,
}: ProgressBarProps): JSX.Element {
  const pct = Math.min(100, Math.max(0, value / 100));
  const bar = (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-800 forced-colors:border forced-colors:border-[CanvasText]"
    >
      <div
        className="h-full bg-neutral-300 transition-[width] forced-colors:bg-[Highlight]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  if (!cliff) return bar;

  const cliffPct = Math.min(100, Math.max(0, cliff.position / 100));
  // Anchor the label to whichever side has room, so it never overflows the bar.
  const labelStyle =
    cliffPct > 50 ? { right: `${100 - cliffPct}%`, textAlign: "right" as const } : { left: `${cliffPct}%` };

  return (
    <div className="relative pb-5" data-testid="progress-bar-cliff">
      {bar}
      {/* The tick sits beside the bar, not inside it: the track clips overflow. */}
      <span
        role="img"
        aria-label={cliff.label}
        data-testid="cliff-marker"
        className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded bg-amber-400 forced-colors:bg-[Highlight] forced-colors:border forced-colors:border-[CanvasText]"
        style={{ left: `${cliffPct}%` }}
      />
      <span
        aria-hidden="true"
        className="absolute top-4 whitespace-nowrap text-xs text-amber-400/80 forced-colors:text-[CanvasText]"
        style={labelStyle}
      >
        {cliff.label}
      </span>
    </div>
  );
}
