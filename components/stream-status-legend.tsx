import type { JSX } from "react";

import { STREAM_STATUS_COLORS, STREAM_STATUS_META } from "@/lib/stream-status";
import type { StreamStatus } from "@/types/stream";

/**
 * A compact, accessible legend explaining what each stream status badge means.
 * Renders as a horizontal wrapping list of colour-coded dot + label pairs.
 */
export function StreamStatusLegend(): JSX.Element {
  return (
    <dl
      className="flex flex-wrap gap-x-5 gap-y-1"
      aria-label="Stream status legend"
    >
      {(Object.keys(STREAM_STATUS_META) as StreamStatus[]).map((status) => {
        const { label, description } = STREAM_STATUS_META[status];
        const { dot } = STREAM_STATUS_COLORS[status];
        return (
        <div key={status} className="flex items-center gap-1.5">
          {/* Colour dot mirrors the badge hue used in StreamCard / StreamTable */}
          <span
            data-status-dot={status}
            className={`inline-block h-2 w-2 flex-shrink-0 rounded-full forced-colors:border forced-colors:border-[CanvasText] ${dot}`}
            aria-hidden="true"
          />
          <dt className="text-xs font-medium text-neutral-300">{label}</dt>
          <dd className="sr-only">{description}</dd>
        </div>
        );
      })}
    </dl>
  );
}
