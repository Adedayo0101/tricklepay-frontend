"use client";

import type { JSX, ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";
import { TokenDisplay } from "@/components/token-display";
import { formatAmount, formatDuration, formatTokenAmount, formatTokenRate, truncateAddress } from "@/lib/format";
import { formatSchedule, NO_CLIFF_LABEL, type ScheduleMoment } from "@/lib/schedule";
import { resolvedTimeZoneLabel } from "@/lib/timezone";
import { vestingRatePerDay } from "@/lib/vesting";
import type { BalanceCheck, CreateStreamParams, FeeEstimate } from "@/types/contract";

interface Props {
  /** The exact parameters that will be submitted on confirm. */
  params: CreateStreamParams;
  /** Best-effort network-fee estimate; never blocks confirming. */
  feeEstimate: FeeEstimate;
  /** Best-effort read of the sender's token balance; never blocks confirming. */
  balanceCheck: BalanceCheck;
  /** Decimal precision of the stream token. */
  decimals?: number;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}


// A row of the review summary. Addresses render truncated with a copy
// affordance so the full value stays one click away without dominating the
// layout on small screens.
function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-neutral-400">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-all text-neutral-100">{children}</dd>
    </div>
  );
}

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <Row label={label}>
      <span className="inline-flex items-baseline gap-2">
        <span title={address}>{truncateAddress(address)}</span>
        <CopyButton value={address} label={label.toLowerCase()} />
      </span>
    </Row>
  );
}

function TokenContractRow({ token }: { token: string }) {
  return (
    <Row label="Token contract">
      <span className="inline-flex items-baseline gap-2">
        <TokenDisplay token={token} />
        <CopyButton value={token} label="token contract" />
      </span>
    </Row>
  );
}

// A Start/End/Cliff row, with the UTC equivalent echoed underneath in muted
// text — this is the last screen before signing, so it's the most
// consequential place to remove any doubt about which instant a local time
// actually resolves to. The countdown pill shows how long until the moment
// while the absolute local + UTC times stay visible.
function TimeRow({ label, moment }: { label: string; moment: ScheduleMoment }) {
  return (
    <Row label={label}>
      <div className="flex flex-col items-start gap-0.5 sm:items-end">
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{moment.local}</span>
          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-normal leading-none text-neutral-400">
            {moment.countdown}
          </span>
        </span>
        <span className="text-xs font-normal text-neutral-500">{moment.utc}</span>
      </div>
    </Row>
  );
}

// The estimated network fee in the network's native currency (XLM, the fee
// asset on Stellar). The label marks it as an estimate; a failed estimate is
// reported but never blocks confirming, because signing does not depend on it.
function feeEstimateText(feeEstimate: FeeEstimate): string {
  switch (feeEstimate.status) {
    case "ready":
      return `~${formatAmount(feeEstimate.stroops.toString())} XLM`;
    case "loading":
      return "Estimating…";
    case "unavailable":
      return "Could not estimate — you can still continue";
  }
}

// The sender's token balance, read before signing so a shortfall is visible
// alongside the amount. A failed read says so without blocking the flow.
function balanceText(balanceCheck: BalanceCheck, token: string, decimals?: number): string {
  switch (balanceCheck.status) {
    case "ready":
      return formatTokenAmount(balanceCheck.balance.toString(), token, decimals);
    case "loading":
      return "Checking…";
    case "unavailable":
      return "Could not read — you can still continue";
  }
}

// The confirmation step between filling the create form and signing. Renders
// the same CreateStreamParams instance the confirm handler passes to
// createStream, so what the user reviews is exactly what goes on-chain.
export function StreamReview({ params, feeEstimate, balanceCheck, decimals, submitting, onBack, onConfirm }: Props): JSX.Element {
  const schedule = formatSchedule(params);

  return (
    <section aria-labelledby="review-heading" className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <h2 id="review-heading" className="mb-1 text-base font-semibold">
          Review stream
        </h2>
        <p className="mb-1 text-xs text-neutral-500">
          Check the details below before signing. Nothing is submitted until you confirm.
        </p>
        <p className="mb-2 text-xs text-neutral-500">
          Start, end, and cliff are in your local timezone —{" "}
          <span className="text-neutral-400">{resolvedTimeZoneLabel()}</span>; the UTC equivalent
          is shown underneath each.
        </p>
        <dl className="divide-y divide-neutral-800">
          <AddressRow label="Sender" address={params.sender} />
          <AddressRow label="Recipient" address={params.recipient} />
          <TokenContractRow token={params.token} />
          <Row label="Amount">
            {formatTokenAmount(params.totalAmount.toString(), params.token, decimals)}
          </Row>
          <Row label="Your balance">{balanceText(balanceCheck, params.token, decimals)}</Row>
          <Row label="Vesting rate">
            {formatTokenRate(
              vestingRatePerDay(params.totalAmount, params.startTime, params.endTime)?.toString() ?? "0",
              params.token,
              "day",
              decimals,
            )}
          </Row>
          <Row label="Duration">
            {formatDuration(params.endTime - params.startTime) ?? "—"}
          </Row>
          <TimeRow label="Start" moment={schedule.start} />
          <TimeRow label="End" moment={schedule.end} />
          {schedule.cliff ? (
            <TimeRow label="Cliff" moment={schedule.cliff} />
          ) : (
            <Row label="Cliff">{NO_CLIFF_LABEL}</Row>
          )}
          <Row label="Network fee (estimated)">{feeEstimateText(feeEstimate)}</Row>
        </dl>
        {balanceCheck.status === "ready" && balanceCheck.shortfall !== null && (
          <p
            role="alert"
            className="mt-3 rounded border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200"
          >
            You hold {formatTokenAmount(balanceCheck.balance.toString(), params.token, decimals)}, this stream
            needs {formatTokenAmount(params.totalAmount.toString(), params.token, decimals)} — short by{" "}
            {formatTokenAmount(balanceCheck.shortfall.toString(), params.token, decimals)}.
          </p>
        )}
      </div>


      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
        >
          Back to edit
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          aria-busy={submitting}
          className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Confirm & create"}
        </button>
      </div>
    </section>
  );
}
