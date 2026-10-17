"use client";

import type { JSX } from "react";

import { useApiHealth, type ApiHealth } from "@/hooks/use-api-health";
import { config } from "@/lib/config";

const STATUS_META: Record<Exclude<ApiHealth, "checking">, { dot: string; label: string }> = {
  reachable: { dot: "bg-green-400", label: "API reachable" },
  unreachable: { dot: "bg-red-400", label: "API unreachable" },
};

/**
 * A small dot in the header showing whether the backend API answers /health,
 * so an outage is visible before a list fails to load. The dot is decorative;
 * the same text is exposed to assistive tech through a polite live region, so
 * a change from reachable to unreachable is announced. Nothing is shown until
 * the first check lands, and nothing at all in mock mode, which has no backend.
 */
export function ApiStatus(): JSX.Element | null {
  const health = useApiHealth(!config.mockApi);

  if (config.mockApi || health === "checking") return null;

  const { dot, label } = STATUS_META[health];

  return (
    <span
      role="status"
      data-testid="api-status"
      data-api-health={health}
      title={label}
      className="inline-flex items-center"
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
